'use strict';
/* =====================================================================
   translate.js — OCR (Tesseract.js) + Lingva Translate
   مجاني بلا حدود — لا يحتاج مفتاح API
   ===================================================================== */

// Lingva public instances — نجرب كل واحد عند الفشل
const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://lingva.garudalinux.org',
  'https://translate.plausibility.cloud',
  'https://lingva.tiekoetter.com',
];

// ── State ─────────────────────────────────────────────────────────────
let _trFile = null;
let _trOcrText = '';
let _tesseractWorker = null;

// ── File drop/select handler ──────────────────────────────────────────
function handleTranslateFile(file) {
  if (!file) return;
  _trFile = file;
  _trOcrText = '';

  _show('translateFileInfo');
  _show('translateLangArea');
  _hide('translateResultWrap');
  _hide('translateProgress');

  const el = (id) => document.getElementById(id);
  if (el('translateFileName')) el('translateFileName').textContent = file.name;
  if (el('translateFileSize')) el('translateFileSize').textContent = _fmtBytes(file.size);

  const ta1 = el('translateExtracted');
  const ta2 = el('translateResult');
  if (ta1) ta1.value = '';
  if (ta2) ta2.value = '';

  const badge = el('translateConfidenceBadge');
  if (badge) badge.style.display = 'none';
}

// ── Main pipeline ─────────────────────────────────────────────────────
async function runTranslate() {
  const t = _t();

  if (!_trFile) {
    _toast(t.translateAlert || 'Please select an image first!', 'error');
    return;
  }

  const runBtn = document.getElementById('translateRunBtn');
  if (runBtn) runBtn.disabled = true;

  _hide('translateResultWrap');
  _showProgress(t.translateLoading || 'Extracting text…');

  try {
    // ── Step 1: OCR ───────────────────────────────────────────────────
    const ocrLang = document.getElementById('translateOcrLang')?.value || 'eng';
    const { text, confidence } = await _runOCR(_trFile, ocrLang);

    _trOcrText = text.trim();

    const ta1 = document.getElementById('translateExtracted');
    if (ta1) ta1.value = _trOcrText;

    const badge = document.getElementById('translateConfidenceBadge');
    if (badge && confidence > 0) {
      badge.textContent = `${Math.round(confidence)}% ${t.translateConfidence || 'confidence'}`;
      badge.style.display = '';
    }

    if (!_trOcrText) {
      throw new Error(t.translateNoText || 'No text found in image. Try a clearer image.');
    }

    // ── Step 2: Translate ─────────────────────────────────────────────
    _setProgressMsg(t.translateTranslating || 'Translating…');

    const ocrLangCode = _tesseractToLingva(ocrLang);
    const targetLang  = document.getElementById('translateTargetLang')?.value || 'en';

    const translated = await _lingvaTranslate(_trOcrText, ocrLangCode, targetLang);

    const ta2 = document.getElementById('translateResult');
    if (ta2) ta2.value = translated;

    _hideProgress();
    _show('translateResultWrap');
    _toast(t.translateSuccess || '✅ Translation complete!', 'success');

  } catch (err) {
    _hideProgress();
    const msg = err.message || (t.translateError || 'Translation failed, please try again.');
    _toast(msg, 'error');
    console.error('[translate]', err);
  } finally {
    if (runBtn) runBtn.disabled = false;
  }
}

// ── Tesseract OCR ─────────────────────────────────────────────────────
function _runOCR(file, lang) {
  return new Promise((resolve, reject) => {
    if (typeof Tesseract !== 'undefined') {
      _doOCR(file, lang, resolve, reject);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js';
    s.onload  = () => _doOCR(file, lang, resolve, reject);
    s.onerror = () => reject(new Error('Failed to load OCR engine. Check your connection.'));
    document.head.appendChild(s);
  });
}

async function _doOCR(file, lang, resolve, reject) {
  try {
    // Terminate any previous worker
    if (_tesseractWorker) {
      try { await _tesseractWorker.terminate(); } catch (_) {}
      _tesseractWorker = null;
    }

    const { createWorker } = Tesseract;
    const worker = await createWorker(lang, 1, {
      workerPath: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/worker.min.js',
      corePath:   'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract-core-simd-lstm.wasm.js',
      langPath:   'https://tessdata.projectnaptha.com/4.0.0',
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress) {
          _setProgressMsg(`Extracting text… ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    _tesseractWorker = worker;
    const { data } = await worker.recognize(file);
    await worker.terminate();
    _tesseractWorker = null;

    resolve({ text: data.text || '', confidence: data.confidence || 0 });
  } catch (err) {
    reject(err);
  }
}

// ── Lingva Translate (مع fallback لعدة instances) ────────────────────
async function _lingvaTranslate(text, from, to) {
  // Lingva رابطه: /api/v1/{source}/{target}/{text}
  // يدعم نصوصاً طويلة — لا حد للاستخدام اليومي
  const chunks = _chunkText(text, 1000); // 1000 حرف لكل طلب للأمان
  const results = [];

  for (const chunk of chunks) {
    let translated = null;
    let lastErr = null;

    for (const instance of LINGVA_INSTANCES) {
      try {
        const url = `${instance}/api/v1/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${encodeURIComponent(chunk)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.translation) {
          translated = data.translation;
          break; // نجح — ننتقل للـ chunk التالي
        }
      } catch (err) {
        lastErr = err;
        continue; // نجرب الـ instance التالي
      }
    }

    if (translated === null) {
      throw new Error(lastErr?.message || 'All translation servers failed. Try again later.');
    }
    results.push(translated);
  }

  return results.join('\n');
}

// ── Language code mapping ─────────────────────────────────────────────
function _tesseractToLingva(tesseractLang) {
  const map = {
    eng: 'en', ara: 'ar', fra: 'fr', deu: 'de', spa: 'es',
    ita: 'it', por: 'pt', rus: 'ru', chi_sim: 'zh',
    jpn: 'ja', kor: 'ko', tur: 'tr', pol: 'pl', nld: 'nl'
  };
  return map[tesseractLang] || 'auto';
}

// ── Text chunker ──────────────────────────────────────────────────────
function _chunkText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = s.length > maxLen
        ? (chunks.push(...s.match(new RegExp(`.{1,${maxLen}}`, 'g'))), '')
        : s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

// ── Actions ───────────────────────────────────────────────────────────
function translateCopyOcr() {
  _copyText(document.getElementById('translateExtracted')?.value || '');
}

function translateCopyResult() {
  _copyText(document.getElementById('translateResult')?.value || '');
}

function translateSaveFile() {
  const ocr = document.getElementById('translateExtracted')?.value || '';
  const res = document.getElementById('translateResult')?.value || '';
  if (!ocr && !res) return;
  const content = `=== Original Text ===\n${ocr}\n\n=== Translation ===\n${res}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = (_trFile?.name?.replace(/\.[^.]+$/, '') || 'translation') + '_translated.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function resetTranslate() {
  _trFile    = null;
  _trOcrText = '';
  ['translateFileInfo','translateLangArea','translateResultWrap','translateProgress']
    .forEach(_hide);
  ['translateExtracted','translateResult'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const inp = document.getElementById('uploadTranslate');
  if (inp) inp.value = '';
}

// ── Helpers ───────────────────────────────────────────────────────────
const _el  = (id) => document.getElementById(id);
const _show = (id) => { const e = _el(id); if (e) e.style.display = ''; };
const _hide = (id) => { const e = _el(id); if (e) e.style.display = 'none'; };

function _showProgress(msg) {
  _show('translateProgress');
  _setProgressMsg(msg);
}
function _setProgressMsg(msg) {
  const e = _el('translateProgressMsg');
  if (e) e.textContent = msg;
}
function _hideProgress() { _hide('translateProgress'); }

function _toast(msg, type) {
  if (typeof showToast === 'function') showToast(msg, type);
}

function _t() {
  const lang = (typeof currentLang !== 'undefined' && currentLang) || 'en';
  return (typeof T !== 'undefined' && T[lang]) || {};
}

function _fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function _copyText(val) {
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => {
    _toast('✓ Copied!', 'success');
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = val;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    _toast('✓ Copied!', 'success');
  });
}

// ── Drag & Drop ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('uploadAreaTranslate');
  if (!area) return;
  area.addEventListener('dragover',  (e) => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', ()  => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) handleTranslateFile(file);
  });
});
