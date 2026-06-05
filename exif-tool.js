'use strict';
const EXIF_MAX_BYTES = 20 * 1024 * 1024;
let _exifFile = null;
let _exifResult = null;
let _exifObjUrl = null;
let _exifPreviewUrl = null;
function validateMagicBytes(file) {
return new Promise(resolve => {
const slice = file.slice(0, 12);
const reader = new FileReader();
reader.onload = e => {
const buf = new Uint8Array(e.target.result);
const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
const isWebp = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
&& buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
resolve({ valid: isJpeg || isPng || isWebp, isJpeg, isPng, isWebp });
};
reader.onerror = () => resolve({ valid: false });
reader.readAsArrayBuffer(slice);
});
}
(function initExifUpload() {
document.addEventListener('DOMContentLoaded', () => {
const area = document.getElementById('uploadAreaExif');
const input = document.getElementById('uploadExif');
if (!area || !input) return;
area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
area.addEventListener('drop', e => {
e.preventDefault();
area.classList.remove('drag-over');
if (e.dataTransfer.files.length) handleExifFile(e.dataTransfer.files[0]);
});
input.addEventListener('change', e => {
if (e.target.files.length) handleExifFile(e.target.files[0]);
});
window.addEventListener('dragover', e => {
if (!isExifPanelActive()) return;
e.preventDefault();
area.classList.add('drag-over');
});
window.addEventListener('dragleave', e => {
if (e.relatedTarget) return;
area.classList.remove('drag-over');
});
window.addEventListener('drop', e => {
if (!isExifPanelActive()) return;
e.preventDefault();
area.classList.remove('drag-over');
if (e.dataTransfer.files.length) handleExifFile(e.dataTransfer.files[0]);
});
const dlBtn = document.getElementById('exifDownloadBtn');
if (dlBtn) dlBtn.addEventListener('click', () => downloadExifClean());
const copyBtn = document.getElementById('exifCopyBtn');
if (copyBtn) copyBtn.addEventListener('click', copyExifClean);
const shareBtn = document.getElementById('exifShareBtn');
if (shareBtn) shareBtn.addEventListener('click', shareExifClean);
});
})();
function isExifPanelActive() {
const panel = document.getElementById('panel-exif');
return panel && panel.classList.contains('active');
}
async function handleExifFile(file) {
if (file.size > EXIF_MAX_BYTES) {
showToast(`File too large (max 20 MB). This file is ${formatBytes(file.size)}.`, 'error');
return;
}
if (!file.type.startsWith('image/')) {
showToast('Please select an image file (JPG, PNG, or WebP).', 'error');
return;
}
const magic = await validateMagicBytes(file);
if (!magic.valid) {
showToast('File does not appear to be a valid JPG, PNG, or WebP image.', 'error');
return;
}
_exifFile = file;
_exifResult = null;
if (_exifObjUrl) { URL.revokeObjectURL(_exifObjUrl); _exifObjUrl = null; }
if (_exifPreviewUrl){ URL.revokeObjectURL(_exifPreviewUrl); _exifPreviewUrl = null; }
const info = document.getElementById('exifFileInfo');
if (info) {
info.style.display = 'block';
const nameEl = document.getElementById('exifFileName');
const sizeEl = document.getElementById('exifFileSize');
if (nameEl) nameEl.textContent = file.name;
if (sizeEl) sizeEl.textContent = formatBytes(file.size);
}
const resultWrap = document.getElementById('exifResultWrap');
if (resultWrap) resultWrap.style.display = 'none';
const actionArea = document.getElementById('exifActionArea');
if (actionArea) actionArea.style.display = 'block';
}
function removeExifData() {
if (!_exifFile) return;
const btn = document.getElementById('exifRemoveBtn');
const progress = document.getElementById('exifProgress');
if (btn) btn.disabled = true;
if (progress) {
progress.style.display = 'block';
progress.setAttribute('aria-live', 'polite');
}
_exifObjUrl = URL.createObjectURL(_exifFile);
const img = new Image();
img.onload = () => {
URL.revokeObjectURL(_exifObjUrl);
_exifObjUrl = null;
try {
const canvas = document.createElement('canvas');
canvas.width = img.naturalWidth;
canvas.height = img.naturalHeight;
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const outMime = _exifFile.type === 'image/png' ? 'image/png'
: _exifFile.type === 'image/webp' ? 'image/webp'
: 'image/jpeg';
const quality = outMime === 'image/jpeg' ? 0.96 : undefined;
canvas.toBlob(blob => {
if (btn) btn.disabled = false;
if (progress) progress.style.display = 'none';
if (!blob) {
showToast('Could not process image. Try a different format.', 'error');
return;
}
_exifResult = { blob, origBytes: _exifFile.size, cleanBytes: blob.size, outMime };
showExifResult(_exifResult);
}, outMime, quality);
} catch (err) {
console.error('[exif-tool] canvas error:', err);
if (btn) btn.disabled = false;
if (progress) progress.style.display = 'none';
showToast('Processing failed. ' + (err.message || ''), 'error');
}
};
img.onerror = () => {
if (btn) btn.disabled = false;
if (progress) progress.style.display = 'none';
showToast('Could not load image.', 'error');
};
img.src = _exifObjUrl;
}
function showExifResult(result) {
const wrap = document.getElementById('exifResultWrap');
if (!wrap) return;
wrap.style.display = 'block';
const saved = result.origBytes - result.cleanBytes;
const pct = result.origBytes > 0 ? Math.round(Math.abs(saved) / result.origBytes * 100) : 0;
const badge = document.getElementById('exifSavingsBadge');
if (badge) {
if (saved > 0) {
badge.textContent = `Saved ${formatBytes(saved)} (${pct}% smaller)`;
badge.className = 'exif-savings-badge exif-savings-pos';
} else if (saved < 0) {
badge.textContent = `${formatBytes(-saved)} larger (metadata was minimal)`;
badge.className = 'exif-savings-badge exif-savings-neg';
} else {
badge.textContent = 'Same size — no metadata found';
badge.className = 'exif-savings-badge';
}
}
const origEl = document.getElementById('exifOrigSize');
const cleanEl = document.getElementById('exifCleanSize');
if (origEl) origEl.textContent = formatBytes(result.origBytes);
if (cleanEl) cleanEl.textContent = formatBytes(result.cleanBytes);
const preview = document.getElementById('exifPreview');
if (preview) {
if (_exifPreviewUrl) URL.revokeObjectURL(_exifPreviewUrl);
_exifPreviewUrl = URL.createObjectURL(result.blob);
preview.src = _exifPreviewUrl;
preview.style.display = 'block';
}
const shareBtn = document.getElementById('exifShareBtn');
if (shareBtn) shareBtn.style.display = navigator.share ? 'inline-flex' : 'none';
}
function downloadExifClean() {
if (!_exifResult) return;
const { blob, outMime } = _exifResult;
const ext = outMime === 'image/png' ? 'png' : outMime === 'image/webp' ? 'webp' : 'jpg';
const base = (_exifFile.name || 'image').replace(/\.[^.]+$/, '');
const name = base + '_clean.' + ext;
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = name;
document.body.appendChild(a);
a.click();
setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
showToast('✅ Download started!', 'success', 2500);
}
async function copyExifClean() {
if (!_exifResult) return;
try {
const item = new ClipboardItem({ [_exifResult.outMime]: _exifResult.blob });
await navigator.clipboard.write([item]);
showToast('📋 Copied to clipboard!', '', 2500);
} catch {
showToast('Copy not supported in this browser.', 'error');
}
}
async function shareExifClean() {
if (!_exifResult || !navigator.share) return;
const ext = _exifResult.outMime === 'image/png' ? 'png' : _exifResult.outMime === 'image/webp' ? 'webp' : 'jpg';
const base = (_exifFile.name || 'image').replace(/\.[^.]+$/, '');
const file = new File([_exifResult.blob], base + '_clean.' + ext, { type: _exifResult.outMime });
try {
await navigator.share({ files: [file], title: 'Clean image (EXIF removed)' });
} catch (err) {
if (err.name !== 'AbortError') showToast('Share failed.', 'error');
}
}
function resetExif() {
_exifFile = null;
_exifResult = null;
if (_exifObjUrl) { URL.revokeObjectURL(_exifObjUrl); _exifObjUrl = null; }
if (_exifPreviewUrl){ URL.revokeObjectURL(_exifPreviewUrl); _exifPreviewUrl = null; }
const input = document.getElementById('uploadExif');
if (input) input.value = '';
const ids = ['exifFileInfo','exifActionArea','exifResultWrap'];
ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
const preview = document.getElementById('exifPreview');
if (preview) { preview.src = ''; preview.style.display = 'none'; }
const btn = document.getElementById('exifRemoveBtn');
if (btn) btn.disabled = false;
}
function formatBytes(n) {
if (n < 1024) return n + ' B';
if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
return (n / (1024 * 1024)).toFixed(2) + ' MB';
}