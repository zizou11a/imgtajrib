'use strict';
(function () {
function $ (id) { return document.getElementById(id); }
function fmtSize(bytes) {
if (bytes < 1024) return bytes + ' B';
if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function injectDropOverlay(area, labelText) {
if (area.querySelector('.drop-overlay')) return;
const overlay = document.createElement('div');
overlay.className = 'drop-overlay';
overlay.innerHTML = `
<span class="drop-overlay-icon">⬇️</span>
<span class="drop-overlay-text">${labelText}</span>
`;
area.appendChild(overlay);
}
function injectFormatChips(area, formats) {
if (area.querySelector('.upload-hint-chips')) return;
const chips = document.createElement('div');
chips.className = 'upload-hint-chips';
chips.innerHTML = formats.map(f =>
`<span class="upload-chip">${f}</span>`
).join('');
area.appendChild(chips);
}
let _dragCounter = 0;
document.addEventListener('dragenter', (e) => {
if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
_dragCounter++;
document.body.classList.add('page-drag-active');
}
});
document.addEventListener('dragleave', () => {
_dragCounter--;
if (_dragCounter <= 0) {
_dragCounter = 0;
document.body.classList.remove('page-drag-active');
}
});
document.addEventListener('drop', () => {
_dragCounter = 0;
document.body.classList.remove('page-drag-active');
});
document.addEventListener('dragover', (e) => {
e.preventDefault();
});
function enhancePreviewGrid(files, containerId, uploadAreaId, onRemove) {
const container = $(containerId);
if (!container) return;
const wraps = container.querySelectorAll('.thumb-wrap');
wraps.forEach((wrap, i) => {
const file = files[i];
if (!file) return;
wrap.setAttribute('data-size', fmtSize(file.size));
if (!wrap.querySelector('.thumb-remove')) {
const btn = document.createElement('button');
btn.className = 'thumb-remove';
btn.setAttribute('aria-label', `Remove ${file.name}`);
btn.textContent = '✕';
btn.addEventListener('click', (e) => {
e.stopPropagation();
wrap.style.transform = 'scale(0)';
wrap.style.opacity = '0';
wrap.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
setTimeout(() => {
wrap.remove();
if (onRemove) onRemove(i);
}, 200);
});
wrap.appendChild(btn);
}
});
const area = $(uploadAreaId);
if (area && files.length > 0) {
area.classList.add('has-files');
}
}
function updateFileCountBadge(countEl, count, label) {
if (!countEl) return;
if (count > 0) {
countEl.classList.add('has-files');
countEl.innerHTML =
`<span class="file-count-badge">${count}</span>` +
`<span>${label}</span>`;
} else {
countEl.classList.remove('has-files');
countEl.innerHTML = '';
}
}
function markProgressComplete(fillId) {
const fill = $(fillId);
if (fill) {
fill.classList.add('complete');
setTimeout(() => fill.classList.remove('complete'), 2500);
}
}
function init() {
const uploadArea = $('uploadArea');
if (uploadArea) {
injectDropOverlay(uploadArea, 'Drop images here');
injectFormatChips(uploadArea, ['JPG', 'PNG', 'WEBP', 'HEIC', 'RAW', 'GIF', 'BMP', 'PDF']);
}
const uploadAreaC = $('uploadAreaC');
if (uploadAreaC) {
injectDropOverlay(uploadAreaC, 'Drop images to compress');
injectFormatChips(uploadAreaC, ['JPG', 'PNG', 'WEBP']);
}
const uploadAreaPDF = $('uploadAreaPDF');
if (uploadAreaPDF) {
injectDropOverlay(uploadAreaPDF, 'Drop PDF here');
injectFormatChips(uploadAreaPDF, ['PDF']);
}
patchLoadFiles();
patchSetProgress();
}
function patchLoadFiles() {
setTimeout(() => {
if (typeof window.loadFiles === 'function') {
const _orig = window.loadFiles;
window.loadFiles = function (list) {
_orig.call(this, list);
const area = $('uploadArea');
if (area) area.classList.remove('has-files');
requestAnimationFrame(() => {
requestAnimationFrame(() => {
enhancePreviewGrid(
list,
'preview-container',
'uploadArea',
null
);
const countEl = $('fileCount');
updateFileCountBadge(countEl, list.length, `image${list.length !== 1 ? 's' : ''} selected`);
});
});
};
}
if (typeof window.loadFilesC === 'function') {
const _origC = window.loadFilesC;
window.loadFilesC = function (list) {
_origC.call(this, list);
const areaC = $('uploadAreaC');
if (areaC) areaC.classList.remove('has-files');
requestAnimationFrame(() => {
requestAnimationFrame(() => {
enhancePreviewGrid(list, 'preview-container-c', 'uploadAreaC', null);
const countElC = $('fileCountC');
updateFileCountBadge(countElC, list.length, `image${list.length !== 1 ? 's' : ''} ready`);
});
});
};
}
}, 0);
}
function patchSetProgress() {
setTimeout(() => {
if (typeof window.setProgress === 'function') {
const _origSP = window.setProgress;
window.setProgress = function (wrapId, fillId, pctId, pct) {
_origSP.call(this, wrapId, fillId, pctId, pct);
if (pct >= 100) {
setTimeout(() => markProgressComplete(fillId), 300);
}
};
}
}, 0);
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', init);
} else {
init();
}
})();
// ── Android File Picker Fix ─────────────────────────────────────────────
// On Android (especially Android 13+), the system Photo Picker intercepts
// file inputs with image/* or image/xxx accept types and shows only gallery
// photos — HEIC files are not indexed there and appear as "No photos".
// Removing the accept attribute entirely forces the system Files app to open,
// which shows all files including HEIC from any folder.
(function androidFilePickerFix() {
  if (!/Android/i.test(navigator.userAgent)) return;

  function removeAccept(input) {
    if (!input || input.tagName !== 'INPUT' || input.type !== 'file') return;
    input.removeAttribute('accept');
  }

  function patchAll() {
    document.querySelectorAll('input[type="file"]').forEach(removeAccept);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchAll);
  } else {
    patchAll();
  }

  // Patch dynamically created inputs
  var obs = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (!node || node.nodeType !== 1) return;
        if (node.tagName === 'INPUT' && node.type === 'file') removeAccept(node);
        if (node.querySelectorAll) {
          node.querySelectorAll('input[type="file"]').forEach(removeAccept);
        }
      });
    });
  });

  var target = document.body || document.documentElement;
  if (target) {
    obs.observe(target, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      obs.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
