'use strict';
(function initZipDownload() {
const JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
let _jszipPromise = null;
function loadJSZip() {
if (_jszipPromise) return _jszipPromise;
_jszipPromise = new Promise((resolve, reject) => {
if (window.JSZip) { resolve(window.JSZip); return; }
const s = document.createElement('script');
s.src = JSZIP_CDN;
s.onload = () => resolve(window.JSZip);
s.onerror = () => reject(new Error('Failed to load JSZip'));
document.head.appendChild(s);
});
return _jszipPromise;
}
function getZipPref() { return localStorage.getItem('imgswift-zip-pref') === 'zip'; }
function setZipPref(useZip) { localStorage.setItem('imgswift-zip-pref', useZip ? 'zip' : 'files'); }
function buildZipToggle({ onFiles, onZip, defaultZip = false }) {
const wrap = document.createElement('div');
wrap.className = 'zip-toggle-wrap';
const btnFiles = document.createElement('button');
btnFiles.className = 'zip-toggle-btn' + (!defaultZip ? ' active' : '');
btnFiles.innerHTML = '⬇️ <span>Download Files</span>';
btnFiles.setAttribute('aria-pressed', String(!defaultZip));
const btnZip = document.createElement('button');
btnZip.className = 'zip-toggle-btn zip-btn' + (defaultZip ? ' active' : '');
btnZip.innerHTML = '🗜️ <span>Download as ZIP</span>';
btnZip.setAttribute('aria-pressed', String(defaultZip));
wrap.appendChild(btnFiles);
wrap.appendChild(btnZip);
btnFiles.addEventListener('click', () => {
btnFiles.classList.add('active');
btnZip.classList.remove('active');
btnFiles.setAttribute('aria-pressed', 'true');
btnZip.setAttribute('aria-pressed', 'false');
setZipPref(false);
onFiles();
});
btnZip.addEventListener('click', () => {
btnZip.classList.add('active');
btnFiles.classList.remove('active');
btnZip.setAttribute('aria-pressed', 'true');
btnFiles.setAttribute('aria-pressed', 'false');
setZipPref(true);
onZip();
});
return wrap;
}
async function buildAndDownloadZip(items, zipName) {
const btnEl = document.querySelector('.zip-btn.active');
const origHTML = btnEl ? btnEl.innerHTML : null;
try {
if (btnEl) {
btnEl.disabled = true;
btnEl.innerHTML = '⏳ <span>Building ZIP…</span>';
}
const JSZip = await loadJSZip();
const zip = new JSZip();
const seen = {};
items.forEach(({ blob, filename }) => {
let name = filename;
if (seen[name] !== undefined) {
seen[name]++;
const dot = name.lastIndexOf('.');
name = dot >= 0
? name.slice(0, dot) + `_${seen[name]}` + name.slice(dot)
: name + `_${seen[name]}`;
} else {
seen[name] = 0;
}
zip.file(name, blob);
});
const content = await zip.generateAsync(
{ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } },
(meta) => {
if (btnEl) {
btnEl.innerHTML = `⏳ <span>Zipping… ${Math.round(meta.percent)}%</span>`;
}
}
);
const url = URL.createObjectURL(content);
const a = document.createElement('a');
a.download = zipName;
a.href = url;
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 2000);
const kb = (content.size / 1024).toFixed(0);
if (typeof showToast === 'function') {
showToast(`🗜️ ZIP ready — ${items.length} files, ${kb} KB`, 'success');
}
} catch (err) {
if (typeof showToast === 'function') {
showToast('❌ ZIP failed — ' + (err.message || 'unknown error'), 'error');
}
} finally {
if (btnEl && origHTML) {
btnEl.disabled = false;
btnEl.innerHTML = origHTML;
}
}
}
function patchConvertTool() {
let _convertBlobs = [];
const _origDlBlob = window.dlBlob;
window.dlBlob = function(blob, name, delay) {
if (getZipPref() && _collectingConvert) {
_convertBlobs.push({ blob, filename: name });
return;
}
_origDlBlob(blob, name, delay);
};
let _collectingConvert = false;
const statusEl = document.getElementById('convertStatus');
if (!statusEl) return;
const obs = new MutationObserver(() => {
const text = statusEl.textContent || '';
if (!text.trim() || text.includes('failed') || !document.getElementById('btnConvertNew')) return;
if (document.getElementById('zip-toggle-convert')) return;
if (!(window.files && window.files.length > 1)) return;
showConvertZipToggle();
});
obs.observe(statusEl, { childList: true, characterData: true, subtree: true });
function showConvertZipToggle() {
document.getElementById('zip-toggle-convert')?.remove();
const pref = getZipPref();
const toggle = buildZipToggle({
defaultZip: pref,
onFiles: () => {
_collectingConvert = false;
if (window._convertBlobsCache) {
window._convertBlobsCache.forEach(({ blob, filename }, i) => {
_origDlBlob(blob, filename, i * 200);
});
}
},
onZip: () => {
_collectingConvert = true;
if (window._convertBlobsCache && window._convertBlobsCache.length > 0) {
buildAndDownloadZip(window._convertBlobsCache, 'imgswift-converted.zip');
}
},
});
toggle.id = 'zip-toggle-convert';
const btnNew = document.getElementById('btnConvertNew');
if (btnNew) btnNew.parentNode.insertBefore(toggle, btnNew.nextSibling);
}
const _origConvertAll = window.convertAll;
if (typeof _origConvertAll === 'function') {
window.convertAll = async function() {
_convertBlobs = [];
window._convertBlobsCache = [];
_collectingConvert = getZipPref();
const __dlBlob = window.dlBlob;
window.dlBlob = function(blob, name, delay) {
window._convertBlobsCache.push({ blob, filename: name });
if (!_collectingConvert) __dlBlob(blob, name, delay);
};
await _origConvertAll.apply(this, arguments);
window.dlBlob = __dlBlob;
if (_collectingConvert && window._convertBlobsCache.length > 0) {
buildAndDownloadZip(window._convertBlobsCache, 'imgswift-converted.zip');
}
};
}
}
function patchCompressTool() {
const resultsEl = document.getElementById('compressResults');
if (!resultsEl) return;
const obs = new MutationObserver(() => {
const header = resultsEl.querySelector('.compress-header');
if (!header) return;
if (header.querySelector('.zip-toggle-wrap')) return;
if (!(window.blobsC && window.blobsC.filter(Boolean).length > 1)) return;
injectCompressZipToggle(header);
});
obs.observe(resultsEl, { childList: true, subtree: true });
function injectCompressZipToggle(header) {
const oldBtn = header.querySelector('#btnDlAll');
if (oldBtn) oldBtn.style.display = 'none';
const pref = getZipPref();
const toggle = buildZipToggle({
defaultZip: pref,
onFiles: () => {
if (typeof downloadAllCompressed === 'function') downloadAllCompressed();
},
onZip: () => {
const items = (window.blobsC || [])
.filter(Boolean)
.map(item => ({
blob: item.blob,
filename: item.name.replace(/\.[^/.]+$/, '') + '_compressed.' + item.ext,
}));
buildAndDownloadZip(items, 'imgswift-compressed.zip');
},
});
toggle.style.marginLeft = 'auto';
header.appendChild(toggle);
}
}
function init() {
patchConvertTool();
patchCompressTool();
if (getZipPref()) {
loadJSZip().catch(() => {});
}
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', init);
} else {
init();
}
})();