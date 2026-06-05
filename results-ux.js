'use strict';
(function () {
const esc = s => String(s)
.replace(/&/g,'&amp;').replace(/</g,'&lt;')
.replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function fmtSz(bytes) {
if (bytes == null) return '—';
if (bytes === 0) return '0 B';
const k = 1024;
const sizes = ['B','KB','MB','GB'];
const i = Math.floor(Math.log(bytes) / Math.log(k));
return parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)) + ' ' + sizes[i];
}
function fmtDim(w, h) {
if (!w || !h) return null;
return `${w} × ${h}`;
}
function fmtTime(ms) {
if (ms < 1000) return ms + 'ms';
return (ms / 1000).toFixed(1) + 's';
}
function fmtRelTime(ts) {
const diff = Date.now() - ts;
if (diff < 60000) return 'Just now';
if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
if (diff < 86400000) return 'Today ' + new Date(ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
if (diff < 172800000) return 'Yesterday';
return new Date(ts).toLocaleDateString([], {month:'short',day:'numeric'});
}
function savingsPct(orig, result) {
if (!orig || orig === 0) return 0;
return Math.round((1 - result / orig) * 100);
}
function savedBytes(orig, result) {
return Math.max(0, orig - result);
}
/* Get image dimensions from a Blob */
function getImageDims(blob) {
return new Promise(resolve => {
const url = URL.createObjectURL(blob);
const img = new Image();
img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
img.src = url;
});
}
/* Guess extension label from mime or filename */
function extLabel(fileOrMime) {
if (!fileOrMime) return '?';
const s = (fileOrMime.type || fileOrMime.name || fileOrMime || '').toLowerCase();
if (s.includes('webp')) return 'WebP';
if (s.includes('avif')) return 'AVIF';
if (s.includes('png')) return 'PNG';
if (s.includes('jpeg') || s.includes('jpg')) return 'JPG';
if (s.includes('gif')) return 'GIF';
if (s.includes('pdf')) return 'PDF';
// fallback: extract extension from filename
const m = (fileOrMime.name || '').match(/\.(\w+)$/);
return m ? m[1].toUpperCase() : '?';
}
/* ────────────────────────────────────────────────────────────
TOOL RECOMMENDATIONS MAP
─────────────────────────────────────────────────────────────── */
const RECOMMENDATIONS = {
'jpg-png': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Reduce PNG size' },
{ key:'jpg-avif', icon:'🆕', label:'Convert to AVIF', benefit:'50% smaller file' },
{ key:'exif', icon:'🧹', label:'Remove EXIF', benefit:'Strip metadata' },
{ key:'resize', icon:'📐', label:'Resize Image', benefit:'Adjust dimensions' },
],
'png-jpg': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Optimise further' },
{ key:'jpg-webp', icon:'⚡', label:'Convert to WebP', benefit:'30% smaller' },
{ key:'jpg-avif', icon:'🆕', label:'Convert to AVIF', benefit:'Next-gen format' },
],
'jpg-webp': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Squeeze more' },
{ key:'jpg-avif', icon:'🆕', label:'Convert to AVIF', benefit:'Even smaller' },
{ key:'exif', icon:'🧹', label:'Remove EXIF', benefit:'Privacy first' },
],
'webp-jpg': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Optimise JPG' },
{ key:'jpg-png', icon:'🖼️', label:'Convert to PNG', benefit:'Lossless output' },
],
'png-webp': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Shrink further' },
{ key:'png-avif', icon:'🆕', label:'Convert to AVIF', benefit:'Best format' },
],
'webp-png': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Optimise PNG' },
{ key:'exif', icon:'🧹', label:'Remove EXIF', benefit:'Clean metadata' },
],
'jpg-avif': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Extra savings' },
{ key:'exif', icon:'🧹', label:'Remove EXIF', benefit:'Strip metadata' },
{ key:'resize', icon:'📐', label:'Resize Image', benefit:'Perfect dimensions' },
],
'png-avif': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Additional savings' },
{ key:'exif', icon:'🧹', label:'Remove EXIF', benefit:'Remove metadata' },
],
'webp-avif': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Go even smaller' },
{ key:'resize', icon:'📐', label:'Resize Image', benefit:'Adjust size' },
],
'avif-jpg': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Optimise JPG' },
{ key:'jpg-webp', icon:'⚡', label:'Convert to WebP', benefit:'Modern format' },
],
'avif-png': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Reduce PNG size' },
{ key:'png-jpg', icon:'🔄', label:'Convert to JPG', benefit:'Smaller photos' },
],
'avif-webp': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Squeeze more' },
{ key:'resize', icon:'📐', label:'Resize Image', benefit:'Fit your layout' },
],
'compress': [
{ key:'jpg-avif', icon:'🆕', label:'Convert to AVIF', benefit:'Even smaller' },
{ key:'jpg-webp', icon:'⚡', label:'Convert to WebP', benefit:'Modern format' },
{ key:'resize', icon:'📐', label:'Resize Image', benefit:'Perfect dimensions' },
{ key:'exif', icon:'🧹', label:'Remove EXIF', benefit:'Strip GPS & metadata' },
],
'resize': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Optimise file size' },
{ key:'jpg-webp', icon:'⚡', label:'Convert to WebP', benefit:'Smaller format' },
{ key:'watermark',icon:'💧', label:'Add Watermark', benefit:'Brand your image' },
],
'crop': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Reduce file size' },
{ key:'watermark',icon:'💧', label:'Add Watermark', benefit:'Brand it' },
{ key:'resize', icon:'📐', label:'Resize Image', benefit:'Fine-tune dimensions' },
],
'rotate': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Shrink the file' },
{ key:'crop', icon:'✂️', label:'Crop Image', benefit:'Remove edges' },
{ key:'watermark',icon:'💧', label:'Add Watermark', benefit:'Add branding' },
],
'flip': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Shrink the file' },
{ key:'rotate', icon:'🔃', label:'Rotate Image', benefit:'Adjust orientation' },
{ key:'watermark',icon:'💧', label:'Add Watermark', benefit:'Add branding' },
],
'watermark': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Reduce file size' },
{ key:'jpg-webp', icon:'⚡', label:'Convert to WebP', benefit:'Smaller format' },
{ key:'jpg-pdf', icon:'📄', label:'Image to PDF', benefit:'Create a document' },
],
'exif': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Optimise size' },
{ key:'jpg-webp', icon:'⚡', label:'Convert to WebP', benefit:'Modern format' },
{ key:'jpg-png', icon:'🖼️', label:'Convert to PNG', benefit:'Lossless format' },
],
'metadata': [
{ key:'exif', icon:'🧹', label:'Remove EXIF', benefit:'Strip all metadata' },
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Reduce file size' },
],
'pdf-img': [
{ key:'compress', icon:'📦', label:'Compress Images', benefit:'Reduce output size' },
{ key:'jpg-webp', icon:'⚡', label:'Convert to WebP', benefit:'Modern format' },
],
'jpg-pdf': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Before converting' },
{ key:'jpg-png', icon:'🖼️', label:'Convert to PNG', benefit:'Lossless version' },
],
'png-pdf': [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Before converting' },
{ key:'resize', icon:'📐', label:'Resize Image', benefit:'Adjust for PDF' },
],
};
const DEFAULT_RECS = [
{ key:'compress', icon:'📦', label:'Compress Image', benefit:'Reduce file size' },
{ key:'jpg-webp', icon:'⚡', label:'Convert to WebP', benefit:'Modern format' },
{ key:'resize', icon:'📐', label:'Resize Image', benefit:'Adjust dimensions' },
];
/* ────────────────────────────────────────────────────────────
BUILD: Success Banner
─────────────────────────────────────────────────────────────── */
function buildSuccessBanner(opts = {}) {
const { count = 1, elapsedMs, operationLabel = 'Conversion' } = opts;
const el = document.createElement('div');
el.className = 'rux-success-banner';
const timeHtml = elapsedMs != null
? `<span class="rux-success-time">⏱ ${fmtTime(elapsedMs)}</span>` : '';
const subText = count > 1
? `${count} files processed successfully`
: `${operationLabel} complete`;
el.innerHTML = `
<div class="rux-success-icon" aria-hidden="true">✓</div>
<div class="rux-success-text">
<div class="rux-success-title">Completed Successfully</div>
<div class="rux-success-sub">${esc(subText)}</div>
</div>
${timeHtml}
`;
return el;
}
/* ────────────────────────────────────────────────────────────
BUILD: Stats Card
─────────────────────────────────────────────────────────────── */
function buildStatsCard(opts = {}) {
const {
origSize, resultSize,
origFormat = '?', resultFormat = '?',
origDims = null, resultDims = null,
filename = null,
elapsedMs = null,
} = opts;
const pct = savingsPct(origSize, resultSize);
const saved = savedBytes(origSize, resultSize);
const isNeg = pct < 0;
const absPct = Math.abs(pct);
const card = document.createElement('div');
card.className = 'rux-stats-card';
const headerNameHtml = filename
? `<span class="rux-stats-header-name">📄 ${esc(filename)}</span>` : '';
const origDimHtml = origDims ? `<div class="rux-stats-dim">${esc(fmtDim(origDims.w, origDims.h))}</div>` : '';
const resultDimHtml= resultDims ? `<div class="rux-stats-dim">${esc(fmtDim(resultDims.w, resultDims.h))}</div>` : '';
const savingsCol = isNeg
? `<div class="rux-stats-col rux-col-savings rux-savings-neg">
<div class="rux-stats-col-label">Size Change</div>
<div class="rux-savings-pct">+${absPct}%</div>
<div class="rux-savings-bytes">${fmtSz(Math.abs(saved))} larger</div>
<div class="rux-savings-bar-wrap"><div class="rux-savings-bar-fill" style="width:${Math.min(absPct,100)}%;"></div></div>
</div>`
: pct === 0
? `<div class="rux-stats-col rux-col-savings rux-savings-neg">
<div class="rux-stats-col-label">Size Change</div>
<div class="rux-savings-pct" style="color:var(--muted)">—</div>
<div class="rux-savings-bytes" style="color:var(--muted)">No change</div>
</div>`
: `<div class="rux-stats-col rux-col-savings">
<div class="rux-stats-col-label">Saved</div>
<div class="rux-savings-pct">${pct}%</div>
<div class="rux-savings-bytes">−${fmtSz(saved)}</div>
<div class="rux-savings-bar-wrap"><div class="rux-savings-bar-fill" style="width:0%;"></div></div>
</div>`;
const timeHtml = elapsedMs != null
? `<div style="padding: 0 16px 12px; display:flex; justify-content:center;">
<span class="rux-proc-time">
<span class="rux-proc-time-dot"></span>
Processed in ${fmtTime(elapsedMs)}
</span>
</div>` : '';
card.innerHTML = `
<div class="rux-stats-header">
<span class="rux-stats-header-title">📊 Conversion Stats</span>
${headerNameHtml}
</div>
<div class="rux-stats-grid">
<div class="rux-stats-col rux-col-original">
<div class="rux-stats-col-label">Original</div>
<div class="rux-stats-format">${esc(origFormat)}</div>
<div class="rux-stats-size">${fmtSz(origSize)}</div>
${origDimHtml}
</div>
<div class="rux-stats-arrow" aria-hidden="true">→</div>
<div class="rux-stats-col rux-col-result">
<div class="rux-stats-col-label">Result</div>
<div class="rux-stats-format">${esc(resultFormat)}</div>
<div class="rux-stats-size">${fmtSz(resultSize)}</div>
${resultDimHtml}
</div>
<div class="rux-stats-arrow" aria-hidden="true"></div>
${savingsCol}
</div>
${timeHtml}
`;
/* Animate savings bar after paint */
if (pct > 0) {
requestAnimationFrame(() => {
setTimeout(() => {
const bar = card.querySelector('.rux-savings-bar-fill');
if (bar) bar.style.width = Math.min(pct, 100) + '%';
}, 120);
});
}
return card;
}
/* ────────────────────────────────────────────────────────────
BUILD: Details Panel
─────────────────────────────────────────────────────────────── */
function buildDetailsPanel(opts = {}) {
const { format, dims, fileSize, compressionPct, metadataStatus, elapsedMs } = opts;
const chips = [];
if (format)
chips.push({ label: 'Format', val: format, cls: 'rux-val-accent' });
if (dims)
chips.push({ label: 'Dimensions', val: fmtDim(dims.w, dims.h), cls: '' });
if (fileSize != null)
chips.push({ label: 'File Size', val: fmtSz(fileSize), cls: '' });
if (compressionPct != null)
chips.push({ label: 'Compression', val: compressionPct + '%', cls: compressionPct > 0 ? 'rux-val-green' : '' });
if (metadataStatus)
chips.push({ label: 'Metadata', val: metadataStatus, cls: metadataStatus === 'Removed' ? 'rux-val-green' : '' });
if (elapsedMs != null)
chips.push({ label: 'Time', val: fmtTime(elapsedMs), cls: '' });
if (!chips.length) return null;
const panel = document.createElement('div');
panel.className = 'rux-details-panel';
chips.forEach((c, i) => {
const chip = document.createElement('div');
chip.className = 'rux-detail-chip';
chip.style.animationDelay = (i * 0.05) + 's';
chip.innerHTML = `
<div class="rux-detail-chip-label">${esc(c.label)}</div>
<div class="rux-detail-chip-val ${c.cls}">${esc(c.val)}</div>
`;
panel.appendChild(chip);
});
return panel;
}
/* ────────────────────────────────────────────────────────────
BUILD: Quick Actions
─────────────────────────────────────────────────────────────── */
function buildQuickActions(opts = {}) {
const {
blobs = [], // [{blob, name}]
onAgain = null, // callback for "Convert Again"
onNewFile = null, // callback for "Process Another"
toolKey = null,
showZip = false,
showShare = false,
statsText = null, // text to copy
} = opts;
const bar = document.createElement('div');
bar.className = 'rux-actions';
bar.setAttribute('role', 'toolbar');
bar.setAttribute('aria-label', 'Result Actions');
/* Primary: Download (single) or Download All (batch) */
if (blobs.length === 1) {
const btnDl = _makeBtn('rux-btn-primary', '⬇', 'Download');
btnDl.addEventListener('click', () => _dlBlob(blobs[0].blob, blobs[0].name));
bar.appendChild(btnDl);
} else if (blobs.length > 1) {
const btnDlAll = _makeBtn('rux-btn-primary', '⬇', `Download All (${blobs.length})`);
btnDlAll.addEventListener('click', () => blobs.forEach(b => _dlBlob(b.blob, b.name)));
bar.appendChild(btnDlAll);
}
/* ZIP download for batch */
if (showZip && blobs.length > 1 && typeof JSZip !== 'undefined') {
const btnZip = _makeBtn('rux-btn-green', '🗜', 'Download ZIP');
btnZip.addEventListener('click', () => _downloadZip(blobs));
bar.appendChild(btnZip);
}
/* Divider */
if (blobs.length > 0 && (onAgain || onNewFile)) {
const div = document.createElement('span');
div.className = 'rux-btn-divider'; div.setAttribute('aria-hidden','true');
bar.appendChild(div);
}
/* Convert Again */
if (onAgain) {
const btnAgain = _makeBtn('rux-btn-secondary', '🔄', 'Convert Again');
btnAgain.addEventListener('click', onAgain);
bar.appendChild(btnAgain);
}
/* Process Another */
if (onNewFile) {
const btnNew = _makeBtn('rux-btn-ghost', '📁', 'New File');
btnNew.addEventListener('click', onNewFile);
bar.appendChild(btnNew);
}
/* Share (single file, Web Share API) */
if (showShare && blobs.length === 1) {
const b = blobs[0];
const file = new File([b.blob], b.name, { type: b.blob.type });
if (navigator.canShare && navigator.canShare({ files:[file] })) {
const btnShare = _makeBtn('rux-btn-ghost', '↗', 'Share');
btnShare.addEventListener('click', async () => {
try { await navigator.share({ files:[file], title: b.name }); }
catch(e) { if (e.name !== 'AbortError' && typeof showToast === 'function')
showToast('Sharing not supported on this device', 'error'); }
});
bar.appendChild(btnShare);
}
}
/* Copy result info */
if (statsText) {
const btnCopy = _makeBtn('rux-btn-ghost', '📋', 'Copy Info');
btnCopy.addEventListener('click', async () => {
try {
await navigator.clipboard.writeText(statsText);
btnCopy.classList.add('rux-copied');
btnCopy.querySelector('.rux-btn-icon').textContent = '✓';
btnCopy.childNodes[1].textContent = ' Copied!';
setTimeout(() => {
btnCopy.classList.remove('rux-copied');
btnCopy.querySelector('.rux-btn-icon').textContent = '📋';
btnCopy.childNodes[1].textContent = ' Copy Info';
}, 2000);
} catch(e) {}
});
bar.appendChild(btnCopy);
}
return bar;
}
function _makeBtn(cls, iconText, labelText) {
const btn = document.createElement('button');
btn.className = 'rux-btn ' + cls;
btn.innerHTML = `<span class="rux-btn-icon" aria-hidden="true">${iconText}</span> ${esc(labelText)}`;
return btn;
}
function _dlBlob(blob, name) {
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = name;
document.body.appendChild(a); a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function _downloadZip(blobs) {
if (typeof JSZip === 'undefined') return;
const zip = new JSZip();
blobs.forEach(b => zip.file(b.name, b.blob));
const zipBlob = await zip.generateAsync({ type:'blob' });
_dlBlob(zipBlob, 'imgswift-results.zip');
}
/* ────────────────────────────────────────────────────────────
BUILD: Smart Recommendations
─────────────────────────────────────────────────────────────── */
function buildRecommendations(toolKey) {
const recs = RECOMMENDATIONS[toolKey] || DEFAULT_RECS;
if (!recs.length) return null;
const wrap = document.createElement('div');
wrap.className = 'rux-recommendations';
wrap.innerHTML = `
<div class="rux-rec-header">
<span class="rux-rec-title">Next Steps</span>
<span class="rux-rec-badge">Recommended</span>
</div>
<div class="rux-rec-grid" id="rux-rec-grid"></div>
`;
const grid = wrap.querySelector('#rux-rec-grid');
recs.slice(0, 4).forEach(r => {
const chip = document.createElement('a');
chip.className = 'rux-rec-chip';
chip.setAttribute('href', '#' + r.key);
chip.setAttribute('role', 'button');
chip.innerHTML = `
<span class="rux-rec-chip-icon" aria-hidden="true">${r.icon}</span>
<span>
<strong>${esc(r.label)}</strong>
<span class="rux-rec-chip-benefit">${esc(r.benefit)}</span>
</span>
`;
chip.addEventListener('click', e => {
e.preventDefault();
if (typeof sendToTool === 'function') sendToTool(r.key);
else if (typeof pickTool === 'function') pickTool(r.key);
const main = document.getElementById('main-content');
if (main) main.scrollIntoView({ behavior:'smooth', block:'start' });
});
grid.appendChild(chip);
});
return wrap;
}
/* ────────────────────────────────────────────────────────────
BUILD: Batch Dashboard
─────────────────────────────────────────────────────────────── */
function buildBatchDashboard(opts = {}) {
const {
total = 0, completed = 0, failed = 0,
totalOriginalBytes = 0, totalResultBytes = 0,
operationLabel = 'Operation',
} = opts;
const saved = savedBytes(totalOriginalBytes, totalResultBytes);
const pct = savingsPct(totalOriginalBytes, totalResultBytes);
const progressPct = total > 0 ? Math.round((completed / total) * 100) : 100;
const dash = document.createElement('div');
dash.className = 'rux-batch-dashboard';
dash.innerHTML = `
<div class="rux-batch-header">
<div>
<div class="rux-batch-title">📁 Batch ${esc(operationLabel)} Complete</div>
<div class="rux-batch-subtitle">${esc(operationLabel)} session summary</div>
</div>
<span class="rux-success-time">✓ Done</span>
</div>
<div class="rux-batch-progress-bar">
<div class="rux-batch-progress-fill" style="width:${progressPct}%"></div>
</div>
<div class="rux-batch-stats">
<div class="rux-batch-stat">
<div class="rux-batch-stat-val rux-accent">${total}</div>
<div class="rux-batch-stat-label">Files</div>
</div>
<div class="rux-batch-stat">
<div class="rux-batch-stat-val rux-green">${completed}</div>
<div class="rux-batch-stat-label">Completed</div>
</div>
<div class="rux-batch-stat">
<div class="rux-batch-stat-val ${failed > 0 ? 'rux-red' : ''}">${failed}</div>
<div class="rux-batch-stat-label">Failed</div>
</div>
<div class="rux-batch-stat">
<div class="rux-batch-stat-val rux-green">${saved > 0 ? fmtSz(saved) : '—'}</div>
<div class="rux-batch-stat-label">${pct > 0 ? pct + '% Saved' : 'Size Change'}</div>
</div>
</div>
`;
return dash;
}
/* ────────────────────────────────────────────────────────────
BUILD: Download Block
─────────────────────────────────────────────────────────────── */
function buildDownloadBlock(opts = {}) {
const { blobs = [], onAgain = null, showZip = false } = opts;
if (!blobs.length) return null;
const isBatch = blobs.length > 1;
const block = document.createElement('div');
block.className = 'rux-download-block';
const info = document.createElement('div');
info.className = 'rux-download-info';
info.innerHTML = `
<div class="rux-download-info-title">${isBatch ? `${blobs.length} files ready` : '📁 ' + esc(blobs[0].name)}</div>
<div class="rux-download-info-sub">${isBatch ? 'All files processed and ready to download' : fmtSz(blobs[0].blob.size) + ' · Ready to download'}</div>
`;
block.appendChild(info);
const actions = document.createElement('div');
actions.className = 'rux-download-actions';
if (isBatch) {
const btnAll = _makeBtn('rux-btn-primary', '⬇', `Download All (${blobs.length})`);
btnAll.addEventListener('click', () => blobs.forEach(b => _dlBlob(b.blob, b.name)));
actions.appendChild(btnAll);
if (showZip) {
const btnZip = _makeBtn('rux-btn-green', '🗜', 'Download ZIP');
btnZip.addEventListener('click', () => _downloadZip(blobs));
actions.appendChild(btnZip);
}
} else {
const btnDl = _makeBtn('rux-btn-primary', '⬇', 'Download');
btnDl.addEventListener('click', () => _dlBlob(blobs[0].blob, blobs[0].name));
actions.appendChild(btnDl);
}
block.appendChild(actions);
return block;
}
/* ────────────────────────────────────────────────────────────
HISTORY CARD UPGRADE
Monkey-patches renderHistoryPanel to use richer cards
─────────────────────────────────────────────────────────────── */
function _buildEnhancedHistoryCard(entry, grid, onRemove) {
const url = URL.createObjectURL(entry.blob);
const date = fmtRelTime(entry.ts);
const origSz = entry.originalSize || 0;
const resultSz = entry.resultSize || entry.blob.size;
const pct = savingsPct(origSz, resultSz);
const hasSaving = origSz > 0 && pct > 0;
const opLabel = (entry.tool || 'Processed').toUpperCase();
const card = document.createElement('div');
card.className = 'rux-history-card';
card.innerHTML = `
<div class="rux-history-thumb-wrap">
<img class="rux-history-thumb" src="${url}"
alt="${esc(entry.filename)}" loading="lazy">
<span class="rux-history-op-badge">${esc(opLabel)}</span>
${hasSaving
? `<span class="rux-history-savings-badge">−${pct}%</span>`
: `<span class="rux-history-savings-badge rux-neutral">Processed</span>`
}
</div>
<div class="rux-history-body">
<div class="rux-history-name">${esc(entry.filename)}</div>
${origSz > 0
? `<div class="rux-history-size-row">
<span class="rux-history-size-orig">${fmtSz(origSz)}</span>
<span class="rux-history-size-arrow">→</span>
<span class="rux-history-size-new">${fmtSz(resultSz)}</span>
</div>`
: `<div class="rux-history-size-row"><span>${fmtSz(resultSz)}</span></div>`
}
<div class="rux-history-timestamp">🕐 ${esc(date)}</div>
</div>
<div class="rux-history-footer">
<button class="rux-history-btn rux-history-btn-dl" aria-label="Download ${esc(entry.filename)}">⬇ Download</button>
<button class="rux-history-btn rux-history-btn-rm" data-id="${entry.id}" aria-label="Remove from history">✕</button>
</div>
`;
card.querySelector('.rux-history-btn-dl').addEventListener('click', () => _dlBlob(entry.blob, entry.filename));
card.querySelector('.rux-history-btn-rm').addEventListener('click', () => {
URL.revokeObjectURL(url);
if (typeof IDBHistory !== 'undefined') {
IDBHistory.remove(entry.id).then(onRemove);
}
card.style.opacity = '0';
card.style.transform = 'scale(0.9)';
card.style.transition = 'all 0.25s ease';
setTimeout(() => card.remove(), 260);
});
grid.appendChild(card);
}
function _patchHistoryRender() {
const origRender = window.renderHistoryPanel;
if (typeof origRender !== 'function') return false;
window.renderHistoryPanel = function () {
if (typeof IDBHistory === 'undefined') return origRender.call(this);
IDBHistory.getAll().then(entries => {
let panel = document.getElementById('historyPanel');
if (!entries.length) { if (panel) panel.style.display = 'none'; return; }
if (!panel) {
/* Let original build the shell, then we replace content */
origRender.call(this);
panel = document.getElementById('historyPanel');
if (!panel) return;
}
panel.style.display = 'block';
const grid = document.getElementById('historyGrid');
if (!grid) return origRender.call(this);
grid.innerHTML = '';
/* Replace history-grid class with our grid too */
grid.classList.add('history-grid');
const MAX_VIS = 20;
entries.slice(0, MAX_VIS).forEach(entry => {
_buildEnhancedHistoryCard(entry, grid, () => window.renderHistoryPanel());
});
}).catch(() => { if (typeof origRender === 'function') origRender.call(this); });
};
return true;
}
/* ────────────────────────────────────────────────────────────
PATCH: _renderConvertResults (convert tab)
─────────────────────────────────────────────────────────────── */
function _patchConvertRender() {
const origRender = window._renderConvertResults;
if (typeof origRender !== 'function') return false;
window._renderConvertResults = function (results, fromExt, toExt, t) {
/* Track start time (set by convertAll before calling us) */
const t0 = window._rux_convertStartTime || Date.now();
const elapsedMs = Date.now() - t0;
/* Run original render */
origRender.call(this, results, fromExt, toExt, t);
const container = document.getElementById('convertResults');
if (!container) return;
const validResults = results.filter(Boolean);
const totalOrig = validResults.reduce((s, r) => s + (r.file ? r.file.size : 0), 0);
const totalResult = validResults.reduce((s, r) => s + (r.blob ? r.blob.size : 0), 0);
const isBatch = validResults.length > 1;
/* Build premium header block */
const headerBlock = document.createElement('div');
/* Success banner */
headerBlock.appendChild(buildSuccessBanner({
count: validResults.length,
elapsedMs,
operationLabel: `${fromExt} → ${toExt}`,
}));
/* Batch dashboard or single stats card */
if (isBatch) {
headerBlock.appendChild(buildBatchDashboard({
total: results.length,
completed: validResults.length,
failed: results.length - validResults.length,
totalOriginalBytes: totalOrig,
totalResultBytes: totalResult,
operationLabel: `${fromExt} → ${toExt}`,
}));
} else if (validResults[0]) {
const r = validResults[0];
headerBlock.appendChild(buildStatsCard({
origSize: r.file.size,
resultSize: r.blob.size,
origFormat: fromExt,
resultFormat: toExt,
filename: r.file.name,
elapsedMs,
}));
/* Before / After slider for single image conversions */
const ba = buildBeforeAfter({
origFile:   r.file,
resultBlob: r.blob,
fromExt,
toExt,
});
if (ba) headerBlock.appendChild(ba);
}
/* Blobs for actions */
const blobs = validResults.map(r => ({
blob: r.blob,
name: r.file.name.replace(/\.[^/.]+$/, '') + '.' + toExt.toLowerCase(),
}));
/* Determine tool key from current active tool */
const toolKey = _getCurrentToolKey();
/* Compose stats text for copy */
const statsText = _buildStatsText({ results: validResults, fromExt, toExt, totalOrig, totalResult });
/* Quick actions */
headerBlock.appendChild(buildQuickActions({
blobs,
onAgain: () => { if (typeof resetConvert === 'function') resetConvert(); },
onNewFile: () => { if (typeof resetConvert === 'function') resetConvert(); },
showZip: isBatch,
showShare: !isBatch,
toolKey,
statsText,
}));
/* Recommendations */
const recs = buildRecommendations(toolKey || 'compress');
if (recs) headerBlock.appendChild(recs);
/* Insert before existing cards */
container.insertBefore(headerBlock, container.firstChild);
/* Remove old plain header if present */
const oldHeader = container.querySelector('.convert-results-header');
if (oldHeader) oldHeader.remove();
};
return true;
}
/* ────────────────────────────────────────────────────────────
PATCH: compress results
─────────────────────────────────────────────────────────────── */
function _patchCompressRender() {
/* We hook into the completion block inside compressAll.
We add a MutationObserver that fires when compressResults goes visible. */
const compressResults = document.getElementById('compressResults');
if (!compressResults) return;
let _t0 = null;
/* Intercept compressAll start time */
const origCompressAll = window.compressAll;
if (typeof origCompressAll === 'function') {
window.compressAll = function () {
_t0 = Date.now();
window._rux_compressStartTime = _t0;
return origCompressAll.apply(this, arguments);
};
}
const obs = new MutationObserver(() => {
if (compressResults.style.display === 'block' &&
!compressResults.querySelector('.rux-success-banner')) {
_injectCompressUpgrade(compressResults, _t0);
}
});
obs.observe(compressResults, { attributes: true, attributeFilter: ['style'] });
}
function _injectCompressUpgrade(container, t0) {
const elapsedMs = t0 ? Date.now() - t0 : null;
/* Gather blobs from window.blobsC */
const blobsC = window.blobsC || [];
const filesC = window.filesC || [];
if (!blobsC.length) return;
const totalOrig = filesC.reduce((s, f) => s + f.size, 0);
const totalResult = blobsC.reduce((s, b) => s + (b.blob ? b.blob.size : 0), 0);
const isBatch = blobsC.length > 1;
const block = document.createElement('div');
block.appendChild(buildSuccessBanner({
count: blobsC.length,
elapsedMs,
operationLabel: 'Compression',
}));
if (isBatch) {
block.appendChild(buildBatchDashboard({
total: filesC.length,
completed: blobsC.filter(b => b && b.blob).length,
failed: filesC.length - blobsC.filter(b => b && b.blob).length,
totalOriginalBytes: totalOrig,
totalResultBytes: totalResult,
operationLabel: 'Compression',
}));
} else {
const origFile = filesC[0];
const resultBlob = blobsC[0] && blobsC[0].blob;
if (origFile && resultBlob) {
block.appendChild(buildStatsCard({
origSize: origFile.size,
resultSize: resultBlob.size,
origFormat: extLabel(origFile),
resultFormat: (blobsC[0].ext || extLabel(resultBlob)).toUpperCase(),
filename: origFile.name,
elapsedMs,
}));
/* Before / After slider */
const ba = buildBeforeAfter({
origFile,
resultBlob,
fromExt: extLabel(origFile),
toExt:   (blobsC[0].ext || extLabel(resultBlob)).toUpperCase(),
});
if (ba) block.appendChild(ba);
}
}
const blobs = blobsC.filter(b => b && b.blob).map((b, i) => ({
blob: b.blob,
name: (filesC[i] ? filesC[i].name.replace(/\.[^/.]+$/, '') : 'compressed') + '_compressed.' + (b.ext || 'jpg'),
}));
block.appendChild(buildQuickActions({
blobs,
onAgain: () => { if (typeof resetCompress === 'function') resetCompress(); },
onNewFile: () => { if (typeof resetCompress === 'function') resetCompress(); },
showZip: isBatch,
showShare: !isBatch,
statsText: `Compressed ${blobs.length} image(s) · ${fmtSz(totalOrig)} → ${fmtSz(totalResult)} (${savingsPct(totalOrig, totalResult)}% saved)`,
}));
block.appendChild(buildRecommendations('compress'));
/* Remove old header */
const oldHeader = container.querySelector('.compress-header');
if (oldHeader) oldHeader.remove();
container.insertBefore(block, container.firstChild);
}
/* ────────────────────────────────────────────────────────────
PATCH: convertAll — capture start time
─────────────────────────────────────────────────────────────── */
function _patchConvertAllTiming() {
const origConvertAll = window.convertAll;
if (typeof origConvertAll !== 'function') return;
window.convertAll = function () {
window._rux_convertStartTime = Date.now();
return origConvertAll.apply(this, arguments);
};
}
/* ────────────────────────────────────────────────────────────
HELPERS: get active tool key, build stats text
─────────────────────────────────────────────────────────────── */
function _getCurrentToolKey() {
/* Try router's _activeTool */
if (typeof window._activeTool !== 'undefined' && window._activeTool) return window._activeTool;
/* Try URL hash */
const hash = window.location.hash.replace('#','');
if (typeof HASH_TO_KEY !== 'undefined' && HASH_TO_KEY[hash]) return HASH_TO_KEY[hash];
/* Try format select */
const fmtEl = document.getElementById('format');
if (fmtEl) {
const fmt = fmtEl.value;
if (fmt === 'image/webp') return 'jpg-webp';
if (fmt === 'image/png') return 'jpg-png';
if (fmt === 'image/avif') return 'jpg-avif';
if (fmt === 'image/jpeg') return 'png-jpg';
}
return null;
}
function _buildStatsText({ results, fromExt, toExt, totalOrig, totalResult }) {
const pct = savingsPct(totalOrig, totalResult);
if (results.length === 1) {
const r = results[0];
return [
`ImgSwift — ${fromExt} → ${toExt} Conversion`,
`File: ${r.file.name}`,
`Original: ${fmtSz(r.file.size)} (${fromExt})`,
`Result: ${fmtSz(r.blob.size)} (${toExt})`,
pct > 0 ? `Saved: ${fmtSz(savedBytes(r.file.size, r.blob.size))} (${pct}%)` : '',
`imgswift.xyz`,
].filter(Boolean).join('\n');
}
return [
`ImgSwift — ${fromExt} → ${toExt} Batch Conversion`,
`Files: ${results.length}`,
`Total original: ${fmtSz(totalOrig)}`,
`Total result: ${fmtSz(totalResult)}`,
pct > 0 ? `Saved: ${fmtSz(savedBytes(totalOrig, totalResult))} (${pct}%)` : '',
`imgswift.xyz`,
].filter(Boolean).join('\n');
}
/* ────────────────────────────────────────────────────────────
BUILD: Before / After Slider
─────────────────────────────────────────────────────────────── */
function buildBeforeAfter(opts = {}) {
const { origFile, resultBlob, fromExt, toExt } = opts;
if (!origFile || !resultBlob) return null;
/* Only show for image-to-image (skip PDF output etc.) */
const imageExts = ['jpg','jpeg','png','webp','avif','gif','bmp','tiff','ico'];
const toExtClean = (toExt || '').toLowerCase().replace('.','');
if (!imageExts.includes(toExtClean)) return null;

const wrap = document.createElement('div');
wrap.className = 'rux-ba-wrap';

const origUrl  = URL.createObjectURL(origFile);
const resultUrl = URL.createObjectURL(resultBlob);

wrap.innerHTML = `
<div class="rux-ba-header">
  <span class="rux-ba-title">🔍 Before / After</span>
  <span class="rux-ba-hint">Drag the slider to compare</span>
</div>
<div class="rux-ba-stage" tabindex="0" aria-label="Before and after image comparison slider">
  <img class="rux-ba-img rux-ba-after"  src="${resultUrl}" alt="After conversion" draggable="false">
  <div class="rux-ba-before-clip">
    <img class="rux-ba-img rux-ba-before" src="${origUrl}"   alt="Before conversion" draggable="false">
  </div>
  <div class="rux-ba-divider" role="separator">
    <div class="rux-ba-handle">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="9" fill="var(--accent)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        <path d="M6.5 10l-2.5-3v6l2.5-3zm7 0l2.5-3v6l-2.5-3z" fill="#fff"/>
      </svg>
    </div>
  </div>
  <div class="rux-ba-label rux-ba-label-before">${(fromExt || 'Before').toUpperCase()}<br><span>${fmtSz(origFile.size)}</span></div>
  <div class="rux-ba-label rux-ba-label-after">${(toExt   || 'After' ).toUpperCase()}<br><span>${fmtSz(resultBlob.size)}</span></div>
</div>`;

/* Interactive slider logic */
const stage    = wrap.querySelector('.rux-ba-stage');
const clip     = wrap.querySelector('.rux-ba-before-clip');
const divider  = wrap.querySelector('.rux-ba-divider');
let pos = 50; /* % */

function setPos(pct) {
  pos = Math.max(2, Math.min(98, pct));
  divider.style.left = pos + '%';
  clip.style.width   = pos + '%';
}
setPos(50);

function fromEvent(e) {
  const rect = stage.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return ((clientX - rect.left) / rect.width) * 100;
}

let dragging = false;
divider.addEventListener('mousedown',  e => { dragging = true; e.preventDefault(); });
document.addEventListener('mousemove', e => { if (dragging) setPos(fromEvent(e)); });
document.addEventListener('mouseup',   () => { dragging = false; });
divider.addEventListener('touchstart', e => { dragging = true; }, { passive: true });
document.addEventListener('touchmove', e => { if (dragging) setPos(fromEvent(e)); }, { passive: true });
document.addEventListener('touchend',  () => { dragging = false; });

/* Click anywhere on stage to jump */
stage.addEventListener('click', e => {
  if (e.target === divider || divider.contains(e.target)) return;
  setPos(fromEvent(e));
});

/* Keyboard: left/right arrows */
stage.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  setPos(pos - 5);
  if (e.key === 'ArrowRight') setPos(pos + 5);
});

/* Revoke object URLs when removed from DOM */
const mo = new MutationObserver(() => {
  if (!document.contains(wrap)) {
    URL.revokeObjectURL(origUrl);
    URL.revokeObjectURL(resultUrl);
    mo.disconnect();
  }
});
mo.observe(document.body, { childList: true, subtree: true });

return wrap;
}

/* ────────────────────────────────────────────────────────────
BOOT
─────────────────────────────────────────────────────────────── */
function boot() {
let convertPatched = false;
let historyPatched = false;
let attempts = 0;
const tryPatch = setInterval(() => {
attempts++;
if (!convertPatched) {
_patchConvertAllTiming();
convertPatched = _patchConvertRender();
}
if (!historyPatched) {
historyPatched = _patchHistoryRender();
}
if ((convertPatched && historyPatched) || attempts > 60) {
clearInterval(tryPatch);
/* Patch compress after DOM fully settled */
setTimeout(_patchCompressRender, 500);
}
}, 100);
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', boot);
} else {
boot();
}
/* Expose for external tools (PDF, crop, rotate, flip, watermark, etc.) */
window.ResultsUX = {
buildSuccessBanner,
buildStatsCard,
buildDetailsPanel,
buildQuickActions,
buildRecommendations,
buildBatchDashboard,
buildDownloadBlock,
buildBeforeAfter,
fmtSz,
fmtTime,
savingsPct,
savedBytes,
getImageDims,
extLabel,
};
})();