'use strict';
const RECENT_KEY = 'imgswift-recent';
const RECENT_MAX = 6;
function recentLoad() {
try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}
function recentSave(list) {
try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
}
function recentAdd(filename, toolKey, meta) {
const list = recentLoad();
const filtered = list.filter(r => !(r.name === filename && r.tool === toolKey));
filtered.unshift({ name: filename, tool: toolKey, ts: Date.now(), ...(meta || {}) });
recentSave(filtered.slice(0, RECENT_MAX));
recentRender();
}
function recentRender() {
const list = recentLoad();
const section = document.getElementById('recentSection');
const grid = document.getElementById('recentGrid');
if (!section || !grid) return;
if (!list.length) { section.style.display = 'none'; return; }
section.style.display = 'block';
grid.innerHTML = '';
list.forEach(item => {
const chip = document.createElement('div');
chip.className = 'recent-chip';
chip.title = item.name;
const tool = TOOL_MAP[item.tool];
const toolLabel = tool ? tool.label : item.tool;
const ext = item.name.split('.').pop().toUpperCase();
const icon = ext === 'PDF' ? '📄' : ext === 'WEBP' ? '⚡' : '🖼️';
let sizeLine = '';
if (item.origSize && item.convSize) {
const savedPct = Math.round((1 - item.convSize / item.origSize) * 100);
const fromTo = (item.fromExt && item.toExt) ? `${item.fromExt} → ${item.toExt} · ` : '';
sizeLine = `<span class="recent-chip-size">${fromTo}${fmtSize(item.origSize)} → ${fmtSize(item.convSize)}${savedPct > 0 ? ' · -' + savedPct + '%' : ''}</span>`;
} else if (item.fromExt && item.toExt) {
sizeLine = `<span class="recent-chip-size">${item.fromExt} → ${item.toExt}</span>`;
}
chip.innerHTML = `
<span>${icon}</span>
<span class="recent-chip-name">${escapeHtml(item.name)}</span>
<span class="recent-chip-tool">${toolLabel}</span>
${sizeLine}
`;
chip.addEventListener('click', () => { if (item.tool) pickTool(item.tool); });
grid.appendChild(chip);
});
}
document.addEventListener('DOMContentLoaded', () => {
recentRender();
const _origHandle = window.handleFiles;
window.handleFiles = function(e) {
if (_origHandle) _origHandle(e);
const f = e.target.files[0];
if (f && _activeTool) recentAdd(f.name, _activeTool);
};
const _origHandleC = window.handleFilesC;
if (_origHandleC) {
window.handleFilesC = function(e) {
_origHandleC(e);
const f = e.target.files[0];
if (f) recentAdd(f.name, 'compress');
};
}
});