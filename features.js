'use strict';
document.addEventListener('DOMContentLoaded', () => {
(function initClipboardPaste() {
const hintBar = document.createElement('div');
hintBar.id = 'pasteHintBar';
hintBar.innerHTML = `
<span class="paste-hint-icon">📋</span>
<span class="paste-hint-text">
<strong>Tip:</strong> You can paste any image directly with
<kbd>Ctrl</kbd><kbd>V</kbd> — no need to click!
</span>
<button class="paste-hint-close" aria-label="Dismiss" onclick="this.closest('#pasteHintBar').remove()">✕</button>
`;
document.body.appendChild(hintBar);
if (!sessionStorage.getItem('is-paste-hint-seen')) {
setTimeout(() => {
hintBar.classList.add('visible');
sessionStorage.setItem('is-paste-hint-seen', '1');
setTimeout(() => hintBar.classList.remove('visible'), 6000);
}, 3000);
}
document.addEventListener('paste', async (e) => {
const active = document.activeElement;
if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
const items = Array.from(e.clipboardData?.items || []);
const imageItem = items.find(it => it.type.startsWith('image/'));
if (!imageItem) return;
e.preventDefault();
const file = imageItem.getAsFile();
if (!file) return;
const activePanel = document.querySelector('.tab-panel.active');
const isCompress = activePanel?.id === 'panel-compress';
const areaId = isCompress ? 'uploadAreaC' : 'uploadArea';
const area = document.getElementById(areaId);
if (area) {
area.classList.add('paste-flash');
setTimeout(() => area.classList.remove('paste-flash'), 600);
}
if (isCompress && typeof loadFilesC === 'function') {
loadFilesC([file]);
} else if (typeof loadFiles === 'function') {
loadFiles([file]);
}
const kb = (file.size / 1024).toFixed(0);
showToast(`📋 Pasted — ${kb} KB`, 'success');
});
})();
(function initKeyboardShortcuts() {
const tooltip = document.createElement('div');
tooltip.id = 'shortcutsTooltip';
tooltip.innerHTML = `
<div class="sc-title">⌨️ Keyboard Shortcuts</div>
<div class="sc-row"><kbd>Ctrl</kbd><kbd>V</kbd> <span>Paste image</span></div>
<div class="sc-row"><kbd>Ctrl</kbd><kbd>D</kbd> <span>Convert / Download</span></div>
<div class="sc-row"><kbd>Del</kbd> <span>Reset / Clear</span></div>
<div class="sc-row"><kbd>Esc</kbd> <span>Cancel</span></div>
<div class="sc-row"><kbd>1</kbd>–<kbd>5</kbd> <span>Switch tabs</span></div>
`;
document.body.appendChild(tooltip);
const nav = document.querySelector('nav');
if (nav) {
const btn = document.createElement('button');
btn.id = 'shortcutsBtn';
btn.title = 'Keyboard shortcuts';
btn.setAttribute('aria-label', 'Show keyboard shortcuts');
btn.textContent = '⌨️';
btn.onclick = () => {
tooltip.classList.toggle('visible');
setTimeout(() => tooltip.classList.remove('visible'), 4000);
};
nav.appendChild(btn);
}
const TAB_KEYS = {
'1': 'convert',
'2': 'compress',
'3': 'pdf',
'4': 'ocr',
'5': 'bgremove',
};
document.addEventListener('keydown', (e) => {
const active = document.activeElement;
const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
if (inInput) return;
const isMac = navigator.platform.toUpperCase().includes('MAC');
const ctrl = isMac ? e.metaKey : e.ctrlKey;
if (ctrl && e.key === 'd') {
e.preventDefault();
const activePanel = document.querySelector('.tab-panel.active');
if (activePanel?.id === 'panel-compress') {
const btn = document.getElementById('btnCompress');
if (btn && !btn.disabled) btn.click();
} else {
const btn = document.getElementById('btnConvert');
if (btn && !btn.disabled) btn.click();
}
return;
}
if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
const activePanel = document.querySelector('.tab-panel.active');
if (activePanel?.id === 'panel-compress') {
if (typeof resetCompress === 'function') resetCompress();
} else if (activePanel?.id === 'panel-convert') {
if (typeof resetConvert === 'function') resetConvert();
}
return;
}
if (e.key === 'Escape') {
tooltip.classList.remove('visible');
const toast = document.getElementById('toast');
if (toast) toast.className = '';
return;
}
if (!ctrl && TAB_KEYS[e.key]) {
const name = TAB_KEYS[e.key];
const tabBtn = document.getElementById('tab-' + name);
if (tabBtn && typeof switchTab === 'function') {
switchTab(name, tabBtn);
document.querySelectorAll('.tab-btn').forEach(b => {
b.classList.toggle('active', b === tabBtn);
b.setAttribute('aria-selected', b === tabBtn ? 'true' : 'false');
});
}
}
});
document.addEventListener('click', (e) => {
if (!tooltip.contains(e.target) && e.target.id !== 'shortcutsBtn') {
tooltip.classList.remove('visible');
}
});
})();
(function initErrorRecovery() {
const origConvertAll = window.convertAll;
if (typeof origConvertAll === 'function') {
window.convertAll = async function() {
await convertAllWithRecovery();
};
}
async function retryPromise(fn, maxRetries = 2, delayMs = 400) {
let lastErr;
for (let attempt = 0; attempt <= maxRetries; attempt++) {
try {
return await fn();
} catch (err) {
lastErr = err;
if (attempt < maxRetries) {
await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
}
}
}
throw lastErr;
}
async function convertAllWithRecovery() {
const t = T[currentLang];
if (!files.length) { showToast(t.alert, 'error'); return; }
if (!navigator.onLine) {
showToast('⚠️ You appear to be offline. PDF library may fail.', 'error');
}
const format = $('format').value;
const q = $('quality').value / 100;
const ext = extMap[format];
const enabled = $('enableResize').checked;
const keepR = $('keepRatio').checked;
const tW = parseInt($('resizeW').value) || 0;
const tH = parseInt($('resizeH').value) || 0;
const btn = $('btnConvert');
btn.disabled = true;
document.querySelectorAll('.thumb-error-badge').forEach(b => b.remove());
let done = 0, succeeded = 0, failed = 0;
const errors = [];
setProgress('progressWrap', 'progressFill', 'progressPct', 0);
const promises = files.map((file, i) =>
retryPromise(() => {
const outMime = NO_QUALITY_FORMATS.includes(format) ? 'image/png' : format;
return processFileWithWorker(file, outMime, q, tW, tH, keepR);
}, 2, 500)
.then(blob => {
dlBlob(blob, file.name.replace(/\.[^/.]+$/, '') + '.' + ext, succeeded * 180);
succeeded++;
done++;
setProgress('progressWrap', 'progressFill', 'progressPct',
Math.round(done / files.length * 100));
markThumb(i, 'success');
})
.catch(err => {
failed++;
done++;
errors.push({ file: file.name, err });
setProgress('progressWrap', 'progressFill', 'progressPct',
Math.round(done / files.length * 100));
markThumb(i, 'error');
})
);
await Promise.all(promises);
btn.disabled = false;
if (succeeded > 0 && failed === 0) {
$('convertStatus').textContent = `${t.success} ${succeeded} ${t.successEnd}`;
$('btnConvert').style.display = 'none';
$('btnConvertNew').style.display = 'flex';
showToast(`✅ ${succeeded} image${succeeded > 1 ? 's' : ''} converted`, 'success');
const ntc = $('nextToolsConvert');
if (ntc) ntc.style.display = 'block';
} else if (succeeded > 0 && failed > 0) {
$('convertStatus').textContent = '';
$('btnConvertNew').style.display = 'flex';
const isAr = currentLang === 'ar';
showToast(`⚠️ ${succeeded} ${isAr ? 'تم' : 'done'}, ${failed} ${isAr ? 'فشل' : 'failed'}`, 'error', 4000);
window._failedFiles = errors.map(e => files.find(f => f.name === e.file)).filter(Boolean);
showErrorPanel(errors, {
title: isAr
? `${succeeded} تم، ${failed} فشل`
: `${succeeded} converted, ${failed} failed`,
onRetry: () => {
const toRetry = window._failedFiles;
if (!toRetry || !toRetry.length) return;
if (typeof loadFiles === 'function') loadFiles(toRetry);
setTimeout(() => convertAllWithRecovery(), 300);
}
});
} else {
btn.disabled = false;
const isAr = currentLang === 'ar';
showToast(isAr ? '❌ فشل التحويل' : '❌ Conversion failed', 'error', 4000);
showErrorPanel(errors, {
title: isAr ? 'فشل التحويل' : 'Conversion Failed',
onRetry: () => convertAllWithRecovery()
});
}
}
function markThumb(index, state) {
const thumbs = document.querySelectorAll('#preview-container .thumb-wrap');
const wrap = thumbs[index];
if (!wrap) return;
wrap.querySelector('.thumb-state-badge')?.remove();
const badge = document.createElement('span');
badge.className = 'thumb-state-badge thumb-state-' + state;
badge.textContent = state === 'success' ? '✓' : '✕';
if (state === 'error') badge.classList.add('thumb-error-badge');
wrap.appendChild(badge);
}
window.convertAllWithRecovery = convertAllWithRecovery;
window.addEventListener('offline', () => {
showToast('📡 You\'re offline — local processing still works!', '');
});
window.addEventListener('online', () => {
showToast('✅ Back online', 'success');
});
})();
});