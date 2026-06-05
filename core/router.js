'use strict';
var _isAndroid = /Android/i.test(navigator.userAgent);
const TOOL_MAP = {
'jpg-png': { tab: 'convert', format: 'image/png', accept: 'image/jpeg,image/jpg', label: '🖼️ JPG → PNG' },
'jpg-webp': { tab: 'convert', format: 'image/webp', accept: 'image/jpeg,image/jpg', label: '⚡ JPG → WebP' },
'jpg-pdf': { tab: 'convert', format: 'pdf', accept: 'image/jpeg,image/jpg', label: '📄 JPG → PDF' },
'png-jpg': { tab: 'convert', format: 'image/jpeg', accept: 'image/png', label: '🔄 PNG → JPG' },
'png-webp': { tab: 'convert', format: 'image/webp', accept: 'image/png', label: '⚡ PNG → WebP' },
'png-pdf': { tab: 'convert', format: 'pdf', accept: 'image/png', label: '📄 PNG → PDF' },
'webp-jpg': { tab: 'convert', format: 'image/jpeg', accept: 'image/webp', label: '🖼️ WebP → JPG' },
'webp-png': { tab: 'convert', format: 'image/png', accept: 'image/webp', label: '🖼️ WebP → PNG' },
'jpg-avif': { tab: 'convert', format: 'image/avif', accept: 'image/jpeg,image/jpg', label: '🆕 JPG → AVIF' },
'png-avif': { tab: 'convert', format: 'image/avif', accept: 'image/png', label: '🆕 PNG → AVIF' },
'webp-avif':{ tab: 'convert', format: 'image/avif', accept: 'image/webp', label: '🆕 WebP → AVIF'},
'avif-jpg': { tab: 'convert', format: 'image/jpeg', accept: 'image/avif', label: '🔄 AVIF → JPG' },
'avif-png': { tab: 'convert', format: 'image/png', accept: 'image/avif', label: '🔄 AVIF → PNG' },
'avif-webp':{ tab: 'convert', format: 'image/webp', accept: 'image/avif', label: '🔄 AVIF → WebP'},
'heic-jpg': { tab: 'convert', format: 'image/jpeg', accept: '.heic,.heif,.hif,image/heic,image/heif', label: '📱 HEIC → JPG' },
'heic-png': { tab: 'convert', format: 'image/png',  accept: '.heic,.heif,.hif,image/heic,image/heif', label: '📱 HEIC → PNG' },
'heic-webp':{ tab: 'convert', format: 'image/webp', accept: '.heic,.heif,.hif,image/heic,image/heif', label: '📱 HEIC → WebP'},
'heic-avif':{ tab: 'convert', format: 'image/avif', accept: '.heic,.heif,.hif,image/heic,image/heif', label: '📱 HEIC → AVIF'},
'gif-webp': { tab: 'convert', format: 'image/webp', accept: 'image/gif', label: '🎞️ GIF → WebP' },
'compress': { tab: 'compress', label: '📦 Compress Image' },
'pdf-img': { tab: 'pdf', label: '📑 PDF → Images' },
'ocr': { tab: 'ocr', label: '🔤 Extract Text (OCR)' },
'bgremove': { tab: 'bgremove', label: '✂️ Remove Background' },
'exif': { tab: 'exif', label: '🧹 Remove EXIF Data' },
'watermark':{ tab: 'watermark', label: '💧 Add Watermark' },
'crop':   { tab: 'crop',   label: '✂️ Crop Image' },
'rotate': { tab: 'rotate', label: '🔃 Rotate Image' },
'flip': { tab: 'flip', label: '🔁 Flip Image' },
'metadata': { tab: 'metadata', label: '🔍 View Metadata' },
'stats': { tab: 'stats', label: '📊 Statistics' },
'smartcomp':{ tab: 'smartcomp', label: '🧠 Smart Compress' },
'recommend':{ tab: 'recommend', label: '💡 Recommendations' },
'bulk': { tab: 'bulk', label: '📁 Bulk Dashboard' },
'redownload':{ tab: 'redownload',label: '🔁 Re-download History' },
};
let _activeTool = null;
function pickTool(key) {
const tool = TOOL_MAP[key];
if (!tool) return;
document.querySelectorAll('.tool-chip').forEach(c => c.classList.remove('active'));
const chip = document.getElementById('chip-' + key);
if (chip) chip.classList.add('active');
_activeTool = key;
const tabBtn = document.getElementById('tab-' + tool.tab);
if (tabBtn) switchTab(tool.tab, tabBtn);
if (tool.tab === 'convert' && tool.format) {
const fmtEl = document.getElementById('format');
if (fmtEl) {
fmtEl.value = tool.format;
fmtEl.dispatchEvent(new Event('change'));
}
const uploadEl = document.getElementById('upload');
if (uploadEl && tool.accept) {
  if (_isAndroid) {
    // On Android, any accept value triggers the Photo Picker which can't show HEIC/GIF.
    // Removing accept forces the system file manager (Files app) instead,
    // which shows all file types including HEIC and GIF.
    uploadEl.removeAttribute('accept');
  } else {
    uploadEl.accept = tool.accept;
  }
}
// On Android, show a clear hint for tools that need the Files app (not Gallery)
if (_isAndroid && tool.accept) {
  const isHeic = tool.accept.includes('heic');
  const isGif  = tool.accept.includes('gif');
  if (isHeic || isGif) {
    const subEl = document.querySelector('#uploadArea .upload-sub');
    if (subEl) {
      const fmt = isHeic ? 'HEIC' : 'GIF';
      subEl.textContent = `Tap below → open "Files" app → select your ${fmt} photo`;
    }
  }
}
const bar = document.getElementById('activeToolBar');
const lbl = document.getElementById('activeToolLabel');
if (bar && lbl) { lbl.textContent = tool.label; bar.classList.add('show'); }
}
const card = document.getElementById('main-content');
if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function clearToolPick() {
document.querySelectorAll('.tool-chip').forEach(c => c.classList.remove('active'));
_activeTool = null;
const uploadEl = document.getElementById('upload');
if (uploadEl) {
  if (_isAndroid) {
    uploadEl.removeAttribute('accept');
  } else {
    uploadEl.accept = 'image/*';
  }
}
const bar = document.getElementById('activeToolBar');
if (bar) bar.classList.remove('show');
}
function sendToTool(key) {
pickTool(key);
const toolToUpload = {
'compress': 'uploadAreaC',
'jpg-webp': 'uploadArea',
'jpg-pdf': 'uploadArea',
'ocr': 'uploadAreaOCR',
'pdf-img': 'uploadAreaPDF',
'exif': 'uploadAreaExif',
};
const uploadId = toolToUpload[key] || 'uploadArea';
setTimeout(() => {
const el = document.getElementById(uploadId);
if (!el) return;
el.style.transition = 'box-shadow 0.3s';
el.style.boxShadow = '0 0 0 3px var(--accent)';
setTimeout(() => { el.style.boxShadow = ''; }, 1200);
}, 400);
}
const HASH_TO_KEY = {
'jpg-to-png': 'jpg-png',
'jpg-to-webp': 'jpg-webp',
'jpg-to-pdf': 'jpg-pdf',
'png-to-jpg': 'png-jpg',
'png-to-webp': 'png-webp',
'png-to-pdf': 'png-pdf',
'webp-to-jpg': 'webp-jpg',
'webp-to-png': 'webp-png',
'jpg-to-avif': 'jpg-avif',
'png-to-avif': 'png-avif',
'webp-to-avif': 'webp-avif',
'avif-to-jpg': 'avif-jpg',
'avif-to-png': 'avif-png',
'avif-to-webp': 'avif-webp',
'heic-to-jpg': 'heic-jpg',
'heic-jpg': 'heic-jpg',
'heic': 'heic-jpg',
'heic-to-png': 'heic-png',
'heic-png': 'heic-png',
'heic-to-webp': 'heic-webp',
'heic-webp': 'heic-webp',
'heic-to-avif': 'heic-avif',
'heic-avif': 'heic-avif',
'gif-to-webp': 'gif-webp',
'gif-webp': 'gif-webp',
'compress': 'compress',
'compress-image': 'compress',
'pdf': 'pdf-img',
'ocr': 'ocr',
'remove-bg': 'bgremove',
'bgremove': 'bgremove',
'exif': 'exif',
'remove-exif': 'exif',
'exif-remover': 'exif',
'watermark': 'watermark',
'rotate': 'rotate',
'flip': 'flip',
'metadata': 'metadata',
'meta': 'metadata',
'stats': 'stats',
'statistics': 'stats',
'smart-compress': 'smartcomp',
'smartcomp': 'smartcomp',
'recommend': 'recommend',
'bulk': 'bulk',
'bulk-dashboard': 'bulk',
'redownload': 'redownload',
'history': 'redownload',
};
function routeFromHash() {
const hash = window.location.hash.replace('#', '').toLowerCase();
if (hash in HASH_TO_KEY && HASH_TO_KEY[hash]) {
setTimeout(() => pickTool(HASH_TO_KEY[hash]), 100);
}
}
window.addEventListener('DOMContentLoaded', routeFromHash);
window.addEventListener('hashchange', routeFromHash);
function routeFromQuery() {
const params = new URLSearchParams(window.location.search);
const toolKey = params.get('tool');
if (toolKey && toolKey in TOOL_MAP) {
setTimeout(() => pickTool(toolKey), 150);
const cleanUrl = window.location.pathname + window.location.hash;
history.replaceState(null, '', cleanUrl);
}
}
window.addEventListener('DOMContentLoaded', routeFromQuery);