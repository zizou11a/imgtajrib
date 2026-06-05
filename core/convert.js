'use strict';
$('format').addEventListener('change', function() {
const show = NO_QUALITY_FORMATS.includes(this.value);
$('qualityNote').style.display = show ? 'block' : 'none';
});
function updateQuality(input) {
const pct = input.value;
$('qualityVal').textContent = pct + '%';
input.setAttribute('aria-valuenow', pct);
const hint = $('qualitySizeHint');
if (!hint) return;
if (!files || !files.length) { hint.textContent = ''; return; }
const totalOrig = files.reduce((s, f) => s + f.size, 0);
const ratio = 0.05 + (pct / 100) * 0.95;
const estimated = totalOrig * ratio * (files.length > 1 ? 1 : 1);
hint.textContent = `≈ ${fmtSize(estimated)}`;
}
function toggleResize() {
const checked = $('enableResize').checked;
const opts = $('resizeOptions');
opts.style.display = checked ? 'block' : 'none';
opts.setAttribute('aria-hidden', checked ? 'false' : 'true');
}
let _thumbUrls = [];
function _revokeThumbUrls() {
_thumbUrls.forEach(u => URL.revokeObjectURL(u));
_thumbUrls = [];
}
function handleFiles(e) {
window.loadFiles(Array.from(e.target.files));
}
window.loadFiles = function(list) {
_revokeThumbUrls();
files = list;
const t = T[currentLang];
const container = $('preview-container');
container.innerHTML = '';
$('fileCount').textContent = `${t.selected} ${files.length} ${t.images}`;
$('convertStatus').textContent = '';
$('btnConvertNew').style.display = 'none';
$('btnConvert').style.display = 'flex';
files.forEach(f => {
const wrap = document.createElement('div');
wrap.className = 'thumb-wrap';
wrap.setAttribute('role', 'listitem');
const img = document.createElement('img');
img.className = 'thumb';
img.loading = 'lazy';
const thumbUrl = URL.createObjectURL(f);
_thumbUrls.push(thumbUrl);
img.src = thumbUrl;
img.alt = f.name;
const name = document.createElement('span');
name.className = 'thumb-name';
name.textContent = f.name;
wrap.appendChild(img);
wrap.appendChild(name);
container.appendChild(wrap);
});
$('uploadArea').querySelector('strong').textContent = `✅ ${files.length} ${t.images}`;
}
document.addEventListener('DOMContentLoaded', () => {
const uploadArea = $('uploadArea');
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
e.preventDefault();
uploadArea.classList.remove('drag-over');
const ALLOWED_EXTS = new Set(['heic','heif','hif','gif','jpg','jpeg','png','webp','avif','bmp','tiff','tif','svg']);
const dropped = Array.from(e.dataTransfer.files).filter(f => {
  if (f.type.startsWith('image/')) return true;
  const ext = (f.name || '').split('.').pop().toLowerCase();
  return ALLOWED_EXTS.has(ext);
});
if (dropped.length) window.loadFiles(dropped);
});
});
function convertAll() {
const t = T[currentLang];
if (!files.length) { showToast(t.alert, 'error'); return; }
const format = $('format').value;
const q = $('quality').value / 100;
const ext = extMap[format];
const enabled = $('enableResize').checked;
const keepR = $('keepRatio').checked;
const tW = parseInt($('resizeW').value) || 0;
const tH = parseInt($('resizeH').value) || 0;
const btn = $('btnConvert');
btn.disabled = true;
let done = 0;
setProgress('progressWrap', 'progressFill', 'progressPct', 0);
if (format === 'pdf') {
loadScript('jspdf').then(() => {
const { jsPDF } = window.jspdf;
let pdf = null;
const processNext = (i) => {
if (i >= files.length) {
pdf.save('imgswift.pdf');
$('convertStatus').textContent = `${t.success} ${files.length} ${t.successEnd}`;
btn.disabled = false;
$('btnConvert').style.display = 'none';
$('btnConvertNew').style.display = 'flex';
showToast(`${t.success} ${files.length} ${t.successEnd}`, 'success');
const ntc = $('nextToolsConvert');
if (ntc) ntc.style.display = 'block';
return;
}
const reader = new FileReader();
reader.onload = e => {
const img = new Image();
img.onload = () => {
const { w, h } = getDims(img, enabled, tW, tH, keepR);
const canvas = document.createElement('canvas');
canvas.width = w; canvas.height = h;
canvas.getContext('2d').drawImage(img, 0, 0, w, h);
const MM = 0.264583;
const pw = w * MM, ph = h * MM;
if (!pdf) {
pdf = new jsPDF({ orientation: pw > ph ? 'l' : 'p', unit: 'mm', format: [pw, ph] });
} else {
pdf.addPage([pw, ph], pw > ph ? 'l' : 'p');
}
pdf.addImage(canvas.toDataURL('image/jpeg', q), 'JPEG', 0, 0, pw, ph);
done++;
setProgress('progressWrap', 'progressFill', 'progressPct',
Math.round(done / files.length * 100));
processNext(i + 1);
};
img.src = e.target.result;
};
reader.readAsDataURL(files[i]);
};
processNext(0);
}).catch(() => showToast('Failed to load PDF library. Check connection.', 'error'));
return;
}
const fromExt = files[0] ? files[0].name.split('.').pop().toUpperCase() : '';
const toExt = ext.toUpperCase();
const results = [];
files.forEach((file, i) => {
const outMime = NO_QUALITY_FORMATS.includes(format) ? 'image/png' : format;
window.processFileWithWorker(file, outMime, q, tW, tH, keepR).then(blob => {
dlBlob(blob, file.name.replace(/\.[^/.]+$/, '') + '.' + ext, i * 200);
done++;
results[i] = { file, blob };
setProgress('progressWrap', 'progressFill', 'progressPct',
Math.round(done / files.length * 100));
if (done === files.length) {
$('convertStatus').textContent = `${t.success} ${done} ${t.successEnd}`;
btn.disabled = false;
$('btnConvert').style.display = 'none';
$('btnConvertNew').style.display = 'flex';
showToast(`${t.success} ${done} ${t.successEnd}`, 'success');
_renderConvertResults(results, fromExt, toExt, t);
results.forEach(r => {
if (!r) return;
recentAdd(r.file.name, _activeTool, {
origSize: r.file.size,
convSize: r.blob.size,
fromExt,
toExt,
});
});
const ntc = $('nextToolsConvert');
if (ntc) ntc.style.display = 'block';
}
}).catch(err => {
done++;
showToast(friendlyError(err, file.name), 'error');
});
});
}
let _convertPreviewUrls = [];
function _revokeConvertPreviewUrls() {
_convertPreviewUrls.forEach(u => URL.revokeObjectURL(u));
_convertPreviewUrls = [];
}
function _renderConvertResults(results, fromExt, toExt, t) {
const container = $('convertResults');
if (!container) return;
_revokeConvertPreviewUrls();
container.innerHTML = '';
const header = document.createElement('div');
header.className = 'convert-results-header';
header.innerHTML = `<span class="convert-results-title">📊 ${t.convertResultsTitle || 'Conversion Results'}</span>`;
container.appendChild(header);
results.forEach((r, i) => {
if (!r) return;
const { file, blob } = r;
const origSize = file.size;
const convSize = blob.size;
const savedPct = Math.round((1 - convSize / origSize) * 100);
const hasSaving = savedPct > 0;
const outName = file.name.replace(/\.[^/.]+$/, '') + '.' + toExt.toLowerCase();
const originalUrl = URL.createObjectURL(file);
const convertedUrl = URL.createObjectURL(blob);
_convertPreviewUrls.push(originalUrl, convertedUrl);
const isImageOut = !['PDF'].includes(toExt.toUpperCase());
const baSliderHtml = isImageOut ? `
<div class="ba-slider-wrap">
<div class="ba-slider-header">
<span class="ba-slider-title">👁️ ${t.before || 'Before'} / ${t.after || 'After'}</span>
<span class="ba-hint"><span class="ba-hint-arrow">←</span> ${t.baHint || 'Drag to compare'} <span class="ba-hint-arrow">→</span></span>
</div>
<div class="ba-wrap" data-pos="50">
<div class="ba-before"><img src="${originalUrl}" alt="Before" loading="lazy"></div>
<div class="ba-after" style="clip-path:inset(0 50% 0 0)">
<img src="${convertedUrl}" alt="After" loading="lazy">
</div>
<img class="ba-spacer" src="${originalUrl}" alt="" loading="lazy">
<div class="ba-divider"></div>
<div class="ba-handle">
<svg viewBox="0 0 24 24">
<polyline points="15 18 9 12 15 6"/>
<polyline points="9 6 15 12 9 18"/>
</svg>
</div>
<span class="ba-label-before">${fromExt}</span>
<span class="ba-label-after">${toExt}</span>
</div>
</div>` : '';
const card = document.createElement('div');
card.className = 'convert-result-card';
card.innerHTML = `
<div class="crc-name">📄 ${escapeHtml(outName)}</div>
<div class="crc-meta-row">
<div class="crc-col">
<div class="crc-col-label">${t.original || 'Original'}</div>
<div class="crc-col-format">${fromExt}</div>
<div class="crc-col-size">${fmtSize(origSize)}</div>
</div>
<div class="crc-arrow">→</div>
<div class="crc-col crc-col-out">
<div class="crc-col-label">${t.converted || 'Converted'}</div>
<div class="crc-col-format crc-format-out">${toExt}</div>
<div class="crc-col-size">${fmtSize(convSize)}</div>
</div>
<div class="crc-saving ${hasSaving ? 'positive' : 'neutral'}">
<div class="crc-saving-label">${t.convertSaved || 'Saved'}</div>
<div class="crc-saving-pct">${hasSaving ? '-' + savedPct + '%' : (t.convertNoSaving || '—')}</div>
</div>
</div>
${baSliderHtml}
`;
container.appendChild(card);
if (isImageOut) {
const baWrap = card.querySelector('.ba-wrap');
if (baWrap) {
setTimeout(() => { initBaSlider(baWrap); _baIntroAnim(baWrap); }, 120 + i * 60);
}
if ('IntersectionObserver' in window) {
const _revokeCard = () => {
URL.revokeObjectURL(originalUrl);
URL.revokeObjectURL(convertedUrl);
const idx = _convertPreviewUrls.indexOf(originalUrl);
if (idx >= 0) _convertPreviewUrls.splice(idx, 2);
};
const obs = new IntersectionObserver((entries, o) => {
entries.forEach(entry => {
if (!entry.isIntersecting && entry.intersectionRatio === 0) {
_revokeCard(); o.disconnect();
}
});
}, { rootMargin: '200px' });
obs.observe(card);
}
}
});
container.style.display = 'block';
}
function resetConvert() {
_revokeThumbUrls();
_revokeConvertPreviewUrls();
files = [];
$('upload').value = '';
$('preview-container').innerHTML = '';
$('fileCount').textContent = '';
$('convertStatus').textContent = '';
$('uploadArea').querySelector('strong').textContent = T[currentLang].uploadTitle;
$('progressWrap').style.display = 'none';
$('progressFill').style.width = '0%';
$('progressPct').textContent = '0%';
$('btnConvertNew').style.display = 'none';
$('btnConvert').style.display = 'flex';
$('btnConvert').disabled = false;
$('enableResize').checked = false;
$('resizeOptions').style.display = 'none';
$('quality').value = 90;
$('qualityVal').textContent = '90%';
const hint = $('qualitySizeHint');
if (hint) hint.textContent = '';
const cr = $('convertResults');
if (cr) { cr.innerHTML = ''; cr.style.display = 'none'; }
const ntc = $('nextToolsConvert');
if (ntc) ntc.style.display = 'none';
}