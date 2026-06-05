'use strict';
(function () {
function $(id) { return document.getElementById(id); }
function t(key) {
if (typeof currentLang !== 'undefined' && typeof T !== 'undefined') {
return (T[currentLang] && T[currentLang][key]) || (T['en'] && T['en'][key]) || key;
}
return key;
}
function _injectCardActions(card, blob, name) {
if (card.querySelector('.crc-actions')) return;
const wrap = document.createElement('div');
wrap.className = 'crc-actions';
const canCopy = typeof ClipboardItem !== 'undefined' &&
navigator.clipboard && navigator.clipboard.write;
if (canCopy) {
const btnCopy = document.createElement('button');
btnCopy.className = 'crc-btn crc-btn-copy';
btnCopy.innerHTML = '📋 ' + t('copyBtn');
btnCopy.setAttribute('aria-label', t('copyBtnAria') || 'Copy image to clipboard');
btnCopy.addEventListener('click', () => _copyBlob(blob, btnCopy));
wrap.appendChild(btnCopy);
}
const canShare = navigator.share &&
navigator.canShare &&
navigator.canShare({ files: [new File([blob], name, { type: blob.type })] });
if (canShare) {
const btnShare = document.createElement('button');
btnShare.className = 'crc-btn crc-btn-share';
btnShare.innerHTML = '↗ ' + t('shareBtn');
btnShare.setAttribute('aria-label', t('shareBtnAria') || 'Share image');
btnShare.addEventListener('click', () => _shareBlob(blob, name, btnShare));
wrap.appendChild(btnShare);
}
if (wrap.children.length > 0) {
card.appendChild(wrap);
}
}
async function _copyBlob(blob, btn) {
try {
const item = new ClipboardItem({ [blob.type]: blob });
await navigator.clipboard.write([item]);
const orig = btn.innerHTML;
btn.innerHTML = '✅ ' + t('copyDone');
btn.disabled = true;
setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
} catch (err) {
if (typeof showToast === 'function') showToast('Copy failed — try downloading instead', 'error');
}
}
async function _shareBlob(blob, name, btn) {
const file = new File([blob], name, { type: blob.type });
try {
await navigator.share({ files: [file], title: name });
} catch (err) {
if (err && err.name !== 'AbortError') {
if (typeof showToast === 'function') showToast('Sharing not supported on this device', 'error');
}
}
}
function _patchRender() {
const origRender = window._renderConvertResults;
if (typeof origRender !== 'function') return false;
window._renderConvertResults = function (results, fromExt, toExt, translObj) {
origRender.call(this, results, fromExt, toExt, translObj);
const container = $('convertResults');
if (!container) return;
const cards = container.querySelectorAll('.convert-result-card');
cards.forEach((card, i) => {
const r = results[i];
if (!r || !r.blob) return;
const ext = extMap ? extMap[toExt.toLowerCase()] || toExt.toLowerCase() : toExt.toLowerCase();
const name = r.file.name.replace(/\.[^/.]+$/, '') + '.' + toExt.toLowerCase();
_injectCardActions(card, r.blob, name);
});
};
return true;
}
function _initPaste() {
document.addEventListener('paste', (e) => {
const uploadArea = $('uploadArea') || $('uploadAreaC') || $('uploadAreaPDF');
if (!uploadArea) return;
const items = Array.from(e.clipboardData?.items || []);
const imageItems = items.filter(item => item.type.startsWith('image/'));
if (imageItems.length === 0) return;
e.preventDefault();
const files = imageItems.map((item, idx) => {
const blob = item.getAsFile();
const ext = blob.type.split('/')[1] || 'png';
return new File([blob], `paste-${idx + 1}.${ext}`, { type: blob.type });
});
const activeConvert = $('uploadArea') &&
($('uploadArea').offsetParent !== null || getComputedStyle($('uploadArea')).display !== 'none');
if (typeof window.loadFiles === 'function' && $('uploadArea')) {
window.loadFiles(files);
_showPasteToast(files.length);
$('uploadArea').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
} else if (typeof window.loadFilesC === 'function' && $('uploadAreaC')) {
window.loadFilesC(files);
_showPasteToast(files.length);
}
});
_injectPasteHint();
}
function _showPasteToast(count) {
if (typeof showToast === 'function') {
const msg = count === 1
? (t('pasteSuccess') || '📋 Image pasted!')
: `📋 ${count} images pasted!`;
showToast(msg, 'success');
}
}
function _injectPasteHint() {
['uploadArea', 'uploadAreaC'].forEach(id => {
const area = $(id);
if (!area || area.querySelector('.paste-hint')) return;
const hint = document.createElement('span');
hint.className = 'paste-hint';
hint.setAttribute('aria-hidden', 'true');
hint.textContent = t('pasteHint') || 'or Ctrl+V to paste';
area.appendChild(hint);
});
}
function boot() {
let attempts = 0;
const tryPatch = setInterval(() => {
attempts++;
if (_patchRender() || attempts > 40) clearInterval(tryPatch);
}, 100);
_initPaste();
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', boot);
} else {
boot();
}
})();