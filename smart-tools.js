'use strict';
function _fmtBytesS(b) {
if (!b || b < 0) return '0 B';
if (b < 1024) return b + ' B';
if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
return (b / 1024 / 1024).toFixed(2) + ' MB';
}
function _hexToRgba(hex, alpha) {
const r = parseInt(hex.slice(1,3),16);
const g = parseInt(hex.slice(3,5),16);
const b = parseInt(hex.slice(5,7),16);
return `rgba(${r},${g},${b},${alpha})`;
}
function _relTimeS(ts) {
const d = Date.now() - ts;
if (d < 60000) return 'just now';
if (d < 3600000) return Math.floor(d/60000) + 'm ago';
if (d < 86400000) return Math.floor(d/3600000) + 'h ago';
return Math.floor(d/86400000) + 'd ago';
}
function _drawCanvasPie(canvas, labels, values, colors) {
const ctx = canvas.getContext('2d');
const W = canvas.width = canvas.offsetWidth || 280;
const H = canvas.height;
ctx.clearRect(0,0,W,H);
const cx = W * 0.42, cy = H/2, r = Math.min(cx, cy) * 0.82;
const total = values.reduce((a,b)=>a+b,0);
if (!total) { ctx.fillStyle='#555'; ctx.font='13px sans-serif'; ctx.textAlign='center'; ctx.fillText('No data yet',cx,cy); return; }
let angle = -Math.PI/2;
values.forEach((v,i) => {
const slice = (v/total) * 2 * Math.PI;
ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,angle,angle+slice); ctx.closePath();
ctx.fillStyle = colors[i % colors.length]; ctx.fill();
ctx.strokeStyle='#0e1420'; ctx.lineWidth=2; ctx.stroke();
angle += slice;
});
const lx = W * 0.86;
labels.forEach((lbl,i) => {
const ly = 18 + i * 22;
ctx.fillStyle = colors[i % colors.length];
ctx.fillRect(lx - 14, ly - 10, 12, 12);
ctx.fillStyle='#e8eaf0'; ctx.font='11px sans-serif'; ctx.textAlign='left';
ctx.fillText(lbl.length > 12 ? lbl.slice(0,11)+'…' : lbl, lx, ly);
});
}
function _drawCanvasBar(canvas, labels, values, color) {
const ctx = canvas.getContext('2d');
const W = canvas.width = canvas.offsetWidth || 280;
const H = canvas.height;
ctx.clearRect(0,0,W,H);
const pad = {t:16, r:16, b:32, l:32};
const cw = W - pad.l - pad.r;
const ch = H - pad.t - pad.b;
const max = Math.max(...values, 1);
const bw = (cw / labels.length) * 0.6;
const gap = (cw / labels.length) * 0.4;
ctx.fillStyle='#2a3140';
ctx.fillRect(pad.l, pad.t, cw, ch);
values.forEach((v,i) => {
const bh = (v/max)*ch;
const x = pad.l + i*(bw+gap) + gap/2;
const y = pad.t + ch - bh;
const grad = ctx.createLinearGradient(x, y, x, pad.t+ch);
grad.addColorStop(0, color); grad.addColorStop(1, _hexToRgba(color, 0.3));
ctx.fillStyle = grad;
ctx.beginPath();
const radius = Math.min(4, bh/2);
ctx.moveTo(x+radius, y); ctx.lineTo(x+bw-radius, y);
ctx.quadraticCurveTo(x+bw, y, x+bw, y+radius);
ctx.lineTo(x+bw, y+bh); ctx.lineTo(x, y+bh); ctx.lineTo(x, y+radius);
ctx.quadraticCurveTo(x, y, x+radius, y); ctx.closePath();
ctx.fill();
ctx.fillStyle='#8892a0'; ctx.font='10px sans-serif'; ctx.textAlign='center';
ctx.fillText(labels[i], x+bw/2, H-pad.b+14);
if (v > 0) { ctx.fillStyle='#e8eaf0'; ctx.fillText(v, x+bw/2, y-4); }
});
}
const STATS_KEY = 'imgswift_stats_v1';
function _statsLoad() {
try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; }
catch { return {}; }
}
function _statsSave(d) {
try { localStorage.setItem(STATS_KEY, JSON.stringify(d)); } catch {}
}
window.statsTrack = function(tool, originalSize, resultSize) {
const d = _statsLoad();
if (!d.tools) d.tools = {};
if (!d.days) d.days = {};
if (!d.total) d.total = { count:0, originalBytes:0, resultBytes:0 };
if (!d.tools[tool]) d.tools[tool] = { count:0, originalBytes:0, resultBytes:0 };
d.tools[tool].count++;
d.tools[tool].originalBytes += (originalSize || 0);
d.tools[tool].resultBytes += (resultSize || 0);
const day = new Date().toISOString().slice(0,10);
d.days[day] = (d.days[day] || 0) + 1;
d.total.count++;
d.total.originalBytes += (originalSize || 0);
d.total.resultBytes += (resultSize || 0);
_statsSave(d);
if (document.getElementById('panel-stats')?.classList.contains('active')) renderStats();
};
function statsReset() {
if (!confirm('Reset all statistics? This cannot be undone.')) return;
localStorage.removeItem(STATS_KEY);
renderStats();
}
function renderStats() {
const d = _statsLoad();
const tools = d.tools || {};
const days = d.days || {};
const total = d.total || { count:0, originalBytes:0, resultBytes:0 };
const saved = Math.max(0, total.originalBytes - total.resultBytes);
const kpiEl = document.getElementById('statsKpiRow');
if (kpiEl) kpiEl.innerHTML = `
<div class="stats-kpi"><span class="stats-kpi-icon">🔄</span><div class="stats-kpi-val">${total.count}</div><div class="stats-kpi-lbl">Total Operations</div></div>
<div class="stats-kpi"><span class="stats-kpi-icon">💾</span><div class="stats-kpi-val">${_fmtBytesS(saved)}</div><div class="stats-kpi-lbl">Total Saved</div></div>
<div class="stats-kpi"><span class="stats-kpi-icon">📅</span><div class="stats-kpi-val">${Object.keys(days).length}</div><div class="stats-kpi-lbl">Active Days</div></div>
<div class="stats-kpi"><span class="stats-kpi-icon">⚡</span><div class="stats-kpi-val">${Object.keys(tools).length}</div><div class="stats-kpi-lbl">Tools Used</div></div>
`;
const COLORS = ['#4f8ef7','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316'];
const tc = document.getElementById('statsChartTools');
if (tc) {
const toolNames = Object.keys(tools);
_drawCanvasPie(tc, toolNames, toolNames.map(t=>tools[t].count), COLORS);
}
const bc = document.getElementById('statsChartDays');
if (bc) {
const labels=[], values=[];
for (let i=6; i>=0; i--) {
const d2 = new Date(Date.now()-i*86400000);
const key = d2.toISOString().slice(0,10);
labels.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d2.getDay()]);
values.push(days[key] || 0);
}
_drawCanvasBar(bc, labels, values, '#4f8ef7');
}
const tbody = document.getElementById('statsTableBody');
if (tbody) {
tbody.innerHTML = '';
Object.entries(tools).sort((a,b)=>b[1].count-a[1].count).forEach(([tool,info])=>{
const sv = Math.max(0, info.originalBytes - info.resultBytes);
const avg = info.count ? _fmtBytesS(info.resultBytes / info.count) : '—';
const tr = document.createElement('tr');
tr.innerHTML=`<td>${tool}</td><td>${info.count}</td><td>${_fmtBytesS(sv)}</td><td>${avg}</td>`;
tbody.appendChild(tr);
});
if (!Object.keys(tools).length) {
tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No operations yet. Start converting!</td></tr>';
}
}
}
document.addEventListener('DOMContentLoaded', () => {
const statsTab = document.getElementById('tab-stats');
if (statsTab) statsTab.addEventListener('click', () => setTimeout(renderStats, 60));
});
document.addEventListener('DOMContentLoaded', () => {
const _origDlBlob = window.dlBlob;
window.dlBlob = function(blob, name, delay) {
if (_origDlBlob) _origDlBlob(blob, name, delay);
const tool = (typeof _activeTool !== 'undefined' && _activeTool) || 'convert';
window.statsTrack(tool, null, blob.size);
};
});
let _scFile = null, _scImg = null, _scResult = null;
function handleSmartComp(file) {
if (!file) return;
_scFile = file;
const reader = new FileReader();
reader.onload = e => {
_scImg = new Image();
_scImg.onload = () => {
document.getElementById('uploadAreaSmartComp').style.display = 'none';
document.getElementById('smartCompResultWrap').style.display = 'block';
_scAnalyze();
};
_scImg.src = e.target.result;
};
reader.readAsDataURL(file);
}
function _scAnalyze() {
const img = _scImg;
const mp = (img.naturalWidth * img.naturalHeight) / 1e6;
const kb = _scFile.size / 1024;
let recQ = 82, reason = '', tag = 'Good';
if (kb < 100) {
recQ = 90; reason = 'Small file — preserve quality'; tag = 'High';
} else if (mp > 8) {
recQ = 72; reason = 'High-res image — aggressive compression safe'; tag = 'Aggressive';
} else if (kb / mp > 500) {
recQ = 78; reason = 'Uncompressed source — significant savings possible'; tag = 'Balanced';
} else {
recQ = 85; reason = 'Standard image — light compression recommended'; tag = 'Light';
}
document.getElementById('scQualitySlider').value = recQ;
document.getElementById('scQualityVal').textContent = recQ + '%';
const grid = document.getElementById('scAnalysisGrid');
grid.innerHTML = `
<div class="sc-analysis-card"><span class="sc-ac-icon">📐</span><strong>${img.naturalWidth}×${img.naturalHeight}</strong><small>Dimensions</small></div>
<div class="sc-analysis-card"><span class="sc-ac-icon">💾</span><strong>${_fmtBytesS(_scFile.size)}</strong><small>Original Size</small></div>
<div class="sc-analysis-card"><span class="sc-ac-icon">📷</span><strong>${mp.toFixed(1)} MP</strong><small>Megapixels</small></div>
<div class="sc-analysis-card sc-rec-card"><span class="sc-ac-icon">🧠</span><strong>Q${recQ}% — ${tag}</strong><small>${reason}</small></div>
`;
scUpdatePreview();
}
function scUpdatePreview() {
if (!_scImg) return;
const q = parseInt(document.getElementById('scQualitySlider').value) / 100;
const canvas = document.createElement('canvas');
canvas.width = _scImg.naturalWidth;
canvas.height = _scImg.naturalHeight;
canvas.getContext('2d').drawImage(_scImg, 0, 0);
canvas.toBlob(blob => {
_scResult = blob;
const saving = Math.max(0, _scFile.size - blob.size);
const pct = _scFile.size ? Math.round(saving/_scFile.size*100) : 0;
const row = document.getElementById('scPreviewRow');
row.innerHTML = `
<div class="sc-preview-stat"><span>🔻 Size</span><strong>${_fmtBytesS(blob.size)}</strong></div>
<div class="sc-preview-stat sc-saving ${pct>0?'good':''}"><span>💰 Saved</span><strong>${pct}% (${_fmtBytesS(saving)})</strong></div>
`;
}, 'image/jpeg', q);
}
function scDownload() {
if (!_scResult) return;
const a = document.createElement('a');
a.href = URL.createObjectURL(_scResult);
a.download = (_scFile.name.replace(/\.[^.]+$/, '') || 'image') + '-optimized.jpg';
a.click();
window.statsTrack('smart-compress', _scFile.size, _scResult.size);
}
function resetSmartComp() {
_scFile = _scImg = _scResult = null;
document.getElementById('uploadAreaSmartComp').style.display = '';
document.getElementById('smartCompResultWrap').style.display = 'none';
document.getElementById('uploadSmartComp').value = '';
}
(function scDrag() {
const area = document.getElementById('uploadAreaSmartComp');
if (!area) return;
area.addEventListener('dragover', e=>{e.preventDefault();area.classList.add('drag-over');});
area.addEventListener('dragleave', ()=>area.classList.remove('drag-over'));
area.addEventListener('drop', e=>{e.preventDefault();area.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/'))handleSmartComp(f);});
})();
const REC_MAP = {
shrink: {
title: '📦 Best Tools to Reduce File Size',
items: [
{ tool:'compress', label:'Image Compressor', desc:'Reduce size up to 90% with quality control', icon:'📦' },
{ tool:'smartcomp', label:'Smart Compress', desc:'AI-picks the best quality automatically', icon:'🧠' },
{ tool:'jpg-webp', label:'Convert to WebP', desc:'WebP is 30% smaller than JPG on average', icon:'⚡' },
]
},
convert: {
title: '🔄 Format Conversion Tools',
items: [
{ tool:'jpg-png', label:'JPG → PNG', desc:'Lossless quality, larger size', icon:'🖼️' },
{ tool:'png-jpg', label:'PNG → JPG', desc:'Smaller photos, slight quality loss', icon:'🔄' },
{ tool:'jpg-webp', label:'JPG → WebP', desc:'Modern format, best compression', icon:'⚡' },
{ tool:'png-webp', label:'PNG → WebP', desc:'Supports transparency + compression', icon:'⚡' },
]
},
web: {
title: '🌐 Optimize for Web',
items: [
{ tool:'jpg-webp', label:'Convert to WebP', desc:'Best web format: small + fast loading', icon:'⚡' },
{ tool:'compress', label:'Compress Image', desc:'Reduce payload, improve page speed', icon:'📦' },
{ tool:'png-webp', label:'PNG → WebP', desc:'WebP with transparency for UI elements', icon:'🖼️' },
]
},
privacy: {
title: '🔒 Privacy & Metadata Tools',
items: [
{ tool:'exif', label:'Remove EXIF', desc:'Strip GPS, camera & device info', icon:'🧹' },
{ tool:'metadata', label:'View Metadata', desc:'See what info your image contains', icon:'🔍' },
]
},
edit: {
title: '✏️ Edit Your Image',
items: [
{ tool:'rotate', label:'Rotate Image', desc:'90°, 180°, or custom angle', icon:'🔃' },
{ tool:'flip', label:'Flip Image', desc:'Horizontal, vertical, or both', icon:'🔁' },
{ tool:'watermark', label:'Add Watermark', desc:'Text watermark with opacity & position', icon:'💧' },
]
},
pdf: {
title: '📄 PDF Tools',
items: [
{ tool:'jpg-pdf', label:'JPG → PDF', desc:'Convert photo to PDF document', icon:'📄' },
{ tool:'png-pdf', label:'PNG → PDF', desc:'Convert PNG to PDF document', icon:'📄' },
{ tool:'pdf-img', label:'PDF → Image', desc:'Extract pages as images', icon:'📑' },
]
},
info: {
title: '🔍 Image Information',
items: [
{ tool:'metadata', label:'Metadata Viewer', desc:'Full EXIF, dimensions, file info', icon:'🔍' },
{ tool:'stats', label:'Your Statistics', desc:'See your personal usage analytics', icon:'📊' },
]
},
bulk: {
title: '📁 Bulk Processing',
items: [
{ tool:'bulk', label:'Bulk Dashboard', desc:'Process 50+ images in one click', icon:'📁' },
{ tool:'compress',label:'Batch Compress', desc:'Works with multiple files too', icon:'📦' },
]
}
};
function recAnswer(key) {
const rec = REC_MAP[key];
if (!rec) return;
document.getElementById('recQuiz').style.display = 'none';
document.getElementById('recResetWrap').style.display = 'block';
const resultEl = document.getElementById('recResult');
resultEl.style.display = 'block';
resultEl.innerHTML = `
<div class="rec-result-title">${rec.title}</div>
<div class="rec-result-grid">
${rec.items.map(item=>`
<div class="rec-result-card" onclick="pickTool('${item.tool}')">
<span class="rec-card-icon">${item.icon}</span>
<div class="rec-card-body">
<div class="rec-card-label">${item.label}</div>
<div class="rec-card-desc">${item.desc}</div>
</div>
<span class="rec-card-arrow">→</span>
</div>
`).join('')}
</div>
`;
}
function recReset() {
document.getElementById('recQuiz').style.display = 'block';
document.getElementById('recResult').style.display = 'none';
document.getElementById('recResetWrap').style.display = 'none';
}
let _bulkFiles = [], _bulkResults = [];
function handleBulkFiles(fileList) {
_bulkFiles = Array.from(fileList).filter(f=>f.type.startsWith('image/')).slice(0,50);
_bulkResults = [];
if (!_bulkFiles.length) return;
document.getElementById('uploadAreaBulk').style.display = 'none';
document.getElementById('bulkControlsWrap').style.display = 'block';
bulkUpdateUI();
_bulkRenderList();
}
function bulkUpdateUI() {
const op = document.getElementById('bulkOperation').value;
const showFormat = op === 'convert';
document.getElementById('bulkFormatField').style.display = showFormat ? '' : 'none';
_bulkUpdateSummary();
}
function _bulkUpdateSummary() {
const bar = document.getElementById('bulkSummaryBar');
const totalKB = _bulkFiles.reduce((a,f)=>a+f.size,0);
bar.innerHTML = `
<span>📁 <strong>${_bulkFiles.length}</strong> files</span>
<span>💾 <strong>${_fmtBytesS(totalKB)}</strong> total</span>
<span>🖼️ Ready to process</span>
`;
}
function _bulkRenderList() {
const list = document.getElementById('bulkFileList');
list.innerHTML = '';
_bulkFiles.forEach((f,i) => {
const row = document.createElement('div');
row.className = 'bulk-file-row';
row.id = `bulk-row-${i}`;
row.innerHTML = `
<span class="bulk-file-name">${f.name}</span>
<span class="bulk-file-size">${_fmtBytesS(f.size)}</span>
<span class="bulk-file-status" id="bulk-status-${i}">⏳ Waiting</span>
`;
list.appendChild(row);
});
}
async function bulkRun() {
if (!_bulkFiles.length) return;
const op = document.getElementById('bulkOperation').value;
const format = document.getElementById('bulkFormat').value;
const quality= parseInt(document.getElementById('bulkQuality').value) / 100;
_bulkResults = [];
document.getElementById('bulkRunBtn').disabled = true;
document.getElementById('bulkProgress').style.display = 'block';
for (let i = 0; i < _bulkFiles.length; i++) {
const f = _bulkFiles[i];
const statusEl = document.getElementById(`bulk-status-${i}`);
statusEl.textContent = '⚙️ Processing…';
try {
const blob = await _bulkProcessOne(f, op, format, quality);
_bulkResults.push({ blob, name: _bulkOutputName(f.name, op, format) });
statusEl.innerHTML = `<span style="color:#10b981">✅ ${_fmtBytesS(blob.size)}</span>`;
window.statsTrack('bulk-' + op, f.size, blob.size);
} catch (e) {
statusEl.innerHTML = `<span style="color:#ef4444">❌ Error</span>`;
}
const pct = Math.round((i+1)/_bulkFiles.length*100);
document.getElementById('bulkProgressFill').style.width = pct + '%';
document.getElementById('bulkProgressLabel').textContent = `${i+1} / ${_bulkFiles.length} processed`;
}
document.getElementById('bulkRunBtn').disabled = false;
document.getElementById('bulkDownloadAllBtn').style.display = _bulkResults.length ? '' : 'none';
if (typeof showToast === 'function') showToast(`✅ Processed ${_bulkResults.length} files`, 'success');
}
function _bulkProcessOne(file, op, format, quality) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onerror = reject;
reader.onload = e => {
const img = new Image();
img.onerror = reject;
img.onload = () => {
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
let w = img.naturalWidth, h = img.naturalHeight;
if (op === 'rotate-90') { canvas.width=h; canvas.height=w; ctx.translate(h/2,w/2); ctx.rotate(Math.PI/2); ctx.drawImage(img,-w/2,-h/2); }
else if (op==='rotate-180'){ canvas.width=w; canvas.height=h; ctx.translate(w/2,h/2); ctx.rotate(Math.PI); ctx.drawImage(img,-w/2,-h/2); }
else if (op==='flip-h') { canvas.width=w; canvas.height=h; ctx.translate(w,0); ctx.scale(-1,1); ctx.drawImage(img,0,0); }
else if (op==='flip-v') { canvas.width=w; canvas.height=h; ctx.translate(0,h); ctx.scale(1,-1); ctx.drawImage(img,0,0); }
else { canvas.width=w; canvas.height=h; ctx.drawImage(img,0,0); }
const outFmt = (op==='compress') ? 'image/jpeg' : format;
const outQ = (op==='compress') ? quality : (outFmt==='image/jpeg'?quality:undefined);
canvas.toBlob(blob => { if (blob) resolve(blob); else reject(new Error('toBlob failed')); }, outFmt, outQ);
};
img.src = e.target.result;
};
reader.readAsDataURL(file);
});
}
function _bulkOutputName(name, op, format) {
const base = name.replace(/\.[^.]+$/, '');
const extMap = {'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};
if (op==='convert') return base + (extMap[format] || '.jpg');
if (op==='compress') return base + '-compressed.jpg';
if (op==='flip-h') return base + '-flipped-h.png';
if (op==='flip-v') return base + '-flipped-v.png';
if (op==='rotate-90') return base + '-rotated90.png';
if (op==='rotate-180') return base + '-rotated180.png';
return base + '-processed.png';
}
async function bulkDownloadAll() {
if (!_bulkResults.length) return;
if (window.JSZip) {
const zip = new window.JSZip();
_bulkResults.forEach(r => zip.file(r.name, r.blob));
const content = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
const a = document.createElement('a');
a.href = URL.createObjectURL(content);
a.download = 'imgswift-bulk.zip';
a.click();
} else {
for (const r of _bulkResults) {
const a = document.createElement('a');
a.href = URL.createObjectURL(r.blob);
a.download = r.name;
a.click();
await new Promise(res => setTimeout(res, 250));
}
}
}
function resetBulk() {
_bulkFiles = []; _bulkResults = [];
document.getElementById('uploadAreaBulk').style.display = '';
document.getElementById('bulkControlsWrap').style.display = 'none';
document.getElementById('bulkFileList').innerHTML = '';
document.getElementById('uploadBulk').value = '';
document.getElementById('bulkDownloadAllBtn').style.display = 'none';
document.getElementById('bulkProgress').style.display = 'none';
}
(function bulkDrag() {
const area = document.getElementById('uploadAreaBulk');
if (!area) return;
area.addEventListener('dragover', e=>{e.preventDefault();area.classList.add('drag-over');});
area.addEventListener('dragleave', ()=>area.classList.remove('drag-over'));
area.addEventListener('drop', e=>{
e.preventDefault(); area.classList.remove('drag-over');
const files = Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/'));
if (files.length) handleBulkFiles(files);
});
})();
let _rdlFilter = 'all', _rdlSearch = '';
function rdlFilter() {
_rdlSearch = document.getElementById('rdlSearch').value.toLowerCase();
rdlRender();
}
function rdlSetFilter(f, btn) {
_rdlFilter = f;
document.querySelectorAll('.rdl-filter-btn').forEach(b => b.classList.remove('active'));
btn.classList.add('active');
rdlRender();
}
function rdlClearAll() {
if (!confirm('Clear all download history?')) return;
if (typeof IDBHistory !== 'undefined') {
IDBHistory.clearAll().then(rdlRender).catch(()=>{});
}
}
function rdlRender() {
if (typeof IDBHistory === 'undefined') {
document.getElementById('rdlEmpty').style.display = 'block';
return;
}
IDBHistory.getAll().then(entries => {
let filtered = entries.filter(e => {
const matchFilter = _rdlFilter==='all' ||
(_rdlFilter==='compress' && (e.tool||'').toLowerCase().includes('compress')) ||
(_rdlFilter==='convert' && !(e.tool||'').toLowerCase().includes('compress'));
const matchSearch = !_rdlSearch ||
(e.filename||'').toLowerCase().includes(_rdlSearch) ||
(e.tool||'').toLowerCase().includes(_rdlSearch);
return matchFilter && matchSearch;
});
const emptyEl = document.getElementById('rdlEmpty');
const gridEl = document.getElementById('rdlGrid');
if (!filtered.length) {
emptyEl.style.display = 'block';
gridEl.innerHTML = '';
_rdlUpdateStats(entries);
return;
}
emptyEl.style.display = 'none';
gridEl.innerHTML = '';
filtered.slice(0,40).forEach(entry => {
if (!entry.blob) return;
const url = URL.createObjectURL(entry.blob);
const card = document.createElement('div');
card.className = 'rdl-card';
card.innerHTML = `
<div class="rdl-card-thumb-wrap">
<img class="rdl-card-thumb" src="${url}" alt="${escapeHtml(entry.filename||'image')}" loading="lazy">
<div class="rdl-card-overlay">
<button class="rdl-dl-btn" title="Download" onclick="rdlDownload(this,'${encodeURIComponent(entry.filename||'image')}','${url}')">⬇️</button>
<button class="rdl-rm-btn" title="Remove" data-id="${entry.id}" onclick="rdlRemove(${entry.id}, this)">🗑</button>
</div>
</div>
<div class="rdl-card-info">
<div class="rdl-card-name" title="${escapeHtml(entry.filename||'')}">${escapeHtml((entry.filename||'').length>22?(entry.filename.slice(0,20)+'…'):entry.filename||'image')}</div>
<div class="rdl-card-meta">
<span class="rdl-card-tool">${escapeHtml(entry.tool||'—')}</span>
<span class="rdl-card-size">${_fmtBytesS(entry.blob.size)}</span>
</div>
<div class="rdl-card-date">${_relTimeS(entry.ts)}</div>
</div>
`;
gridEl.appendChild(card);
});
_rdlUpdateStats(entries);
}).catch(()=>{
document.getElementById('rdlEmpty').style.display = 'block';
});
}
function rdlDownload(btn, encodedName, url) {
const a = document.createElement('a');
a.href = url; a.download = decodeURIComponent(encodedName);
document.body.appendChild(a); a.click(); a.remove();
if (typeof showToast === 'function') showToast('⬇️ Downloaded!', 'success');
}
function rdlRemove(id, btn) {
if (typeof IDBHistory === 'undefined') return;
const card = btn.closest('.rdl-card');
if (card) { card.style.opacity='0'; card.style.transform='scale(0.9)'; card.style.transition='all 0.2s'; }
IDBHistory.remove(id).then(() => {
setTimeout(rdlRender, 220);
}).catch(()=>{});
}
function _rdlUpdateStats(entries) {
const bar = document.getElementById('rdlStatsBar');
if (!bar) return;
const totalBytes = entries.reduce((a,e)=>a+(e.blob?e.blob.size:0),0);
bar.innerHTML = `
<span>📦 ${entries.length} files in history</span>
<span>💾 ${_fmtBytesS(totalBytes)} total</span>
`;
}
document.addEventListener('DOMContentLoaded', () => {
const rdlTab = document.getElementById('tab-redownload');
if (rdlTab) rdlTab.addEventListener('click', () => setTimeout(rdlRender, 80));
});