'use strict';
document.addEventListener('DOMContentLoaded', () => {
document.querySelectorAll('.upload-area').forEach(area => {
let dragCount = 0;
area.addEventListener('dragenter', e => {
e.preventDefault();
dragCount++;
area.classList.add('drag-over');
});
area.addEventListener('dragleave', () => {
dragCount--;
if (dragCount <= 0) {
dragCount = 0;
area.classList.remove('drag-over');
}
});
area.addEventListener('dragover', e => {
e.preventDefault();
});
area.addEventListener('drop', () => {
dragCount = 0;
area.classList.remove('drag-over');
});
});
const origLoadFiles = window.loadFiles;
if (origLoadFiles) {
window.loadFiles = function(list) {
const container = document.getElementById('preview-container');
if (container) {
container.innerHTML = '';
list.forEach(() => {
const wrap = document.createElement('div');
wrap.className = 'thumb-wrap';
wrap.innerHTML = `
<div class="skeleton skeleton-thumb"></div>
<div class="skeleton skeleton-text" style="margin-top:4px;"></div>
`;
container.appendChild(wrap);
});
}
setTimeout(() => origLoadFiles(list), 120);
};
}
function formatBytes(bytes) {
if (bytes < 1024) return bytes + ' B';
if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
return (bytes/(1024*1024)).toFixed(2) + ' MB';
}
const origCompressAll = window.compressAll;
if (origCompressAll) {
window.compressAll = function() {
origCompressAll();
const observer = new MutationObserver(() => {
const results = document.getElementById('compressResults');
if (results && results.style.display !== 'none' && results.children.length > 0) {
enhanceCompressResults(results);
observer.disconnect();
}
});
observer.observe(document.getElementById('compressResults') || document.body, {
childList: true, subtree: true, attributes: true, attributeFilter: ['style']
});
};
}
function enhanceCompressResults(container) {
const items = container.querySelectorAll('.compress-item');
let totalBefore = 0, totalAfter = 0;
items.forEach((item, idx) => {
const bars = item.querySelector('.compress-bars');
if (!bars) return;
const rows = bars.querySelectorAll('.bar-row');
if (rows.length < 2) return;
const sizeBefore = rows[0].querySelector('.bar-size');
const sizeAfter = rows[1].querySelector('.bar-size');
if (!sizeBefore || !sizeAfter) return;
const rawBefore = parseFloat(item.dataset.before || 0);
const rawAfter = parseFloat(item.dataset.after || 0);
if (!rawBefore || !rawAfter) return;
totalBefore += rawBefore;
totalAfter += rawAfter;
const saved = rawBefore - rawAfter;
const pct = Math.round((saved / rawBefore) * 100);
const isGood = pct > 0;
const beforeFill = item.querySelector('.bar-fill-before');
const afterFill = item.querySelector('.bar-fill-after');
if (beforeFill && afterFill) {
const ratio = rawAfter / rawBefore;
afterFill.style.width = Math.max(5, Math.round(ratio * 100)) + '%';
}
const savingEl = item.querySelector('.saving-pct');
if (savingEl) {
animateCount(savingEl, 0, Math.abs(pct), 600, v => {
savingEl.textContent = (isGood ? '-' : '+') + v + '%';
});
}
item.style.animationDelay = (idx * 80) + 'ms';
});
if (items.length > 1 && totalBefore > 0) {
const totalSaved = totalBefore - totalAfter;
const totalPct = Math.round((totalSaved / totalBefore) * 100);
const isGood = totalPct > 0;
const summary = document.createElement('div');
summary.className = 'savings-hero-card';
summary.innerHTML = `
<div class="savings-hero-pct ${isGood ? '' : 'negative'}" id="summaryPct">0%</div>
<div class="savings-hero-label">Total saved across ${items.length} images 🎉</div>
<div class="savings-size-row">
<div class="savings-before">
<span class="savings-before-label">Before</span>
<span class="savings-before-size">${formatBytes(totalBefore)}</span>
</div>
<div class="savings-arrow">→</div>
<div class="savings-after">
<span class="savings-after-label">After</span>
<span class="savings-after-size">${formatBytes(totalAfter)}</span>
</div>
</div>
`;
container.insertBefore(summary, container.firstChild);
const pctEl = summary.querySelector('#summaryPct');
animateCount(pctEl, 0, Math.abs(totalPct), 900, v => {
pctEl.textContent = (isGood ? '-' : '+') + v + '%';
});
}
}
function animateCount(el, from, to, duration, callback) {
const start = performance.now();
function tick(now) {
const t = Math.min((now - start) / duration, 1);
const ease = 1 - Math.pow(1 - t, 3);
const val = Math.round(from + (to - from) * ease);
callback(val);
if (t < 1) requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
}
function injectEmptyStates() {
const uploadArea = document.getElementById('uploadArea');
if (uploadArea) {
const icon = uploadArea.querySelector('.upload-icon');
if (icon) {
icon.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
uploadArea.addEventListener('mouseenter', () => { icon.style.transform = 'scale(1.15) translateY(-3px)'; });
uploadArea.addEventListener('mouseleave', () => { icon.style.transform = ''; });
}
}
}
injectEmptyStates();
function setupStickyButton() {
if (window.innerWidth > 520) return;
const btnConvert = document.getElementById('btnConvert');
if (!btnConvert) return;
const wrap = document.createElement('div');
wrap.className = 'btn-primary-sticky-wrap';
btnConvert.parentNode.insertBefore(wrap, btnConvert);
wrap.appendChild(btnConvert);
}
setupStickyButton();
const origSetProgress = window.setProgress;
if (origSetProgress) {
window.setProgress = function(wrapId, fillId, pctId, pct, current, total) {
origSetProgress(wrapId, fillId, pctId, pct);
const wrap = document.getElementById(wrapId);
if (!wrap) return;
wrap.style.display = 'block';
const labelEl = wrap.querySelector('.progress-label span:first-child');
if (labelEl && current != null && total != null) {
labelEl.textContent = `Converting ${current}/${total}…`;
}
};
}
function addFormatBadgesToThumbs() {
const fmt = document.getElementById('format');
if (!fmt) return;
const ext = fmt.options[fmt.selectedIndex]?.text || '';
document.querySelectorAll('.thumb-wrap').forEach(wrap => {
if (!wrap.querySelector('.thumb-savings-badge') && ext) {
const badge = document.createElement('span');
badge.className = 'thumb-savings-badge';
badge.textContent = ext;
wrap.appendChild(badge);
}
});
}
const btnConvert = document.getElementById('btnConvert');
if (btnConvert) {
const origClick = btnConvert.onclick;
btnConvert.onclick = function(e) {
if (origClick) origClick.call(this, e);
setTimeout(addFormatBadgesToThumbs, 200);
};
}
document.querySelectorAll('.tool-chip').forEach(chip => {
chip.addEventListener('click', function(e) {
const ripple = document.createElement('span');
const rect = chip.getBoundingClientRect();
ripple.style.cssText = `
position:absolute;
width:40px; height:40px;
left:${e.clientX - rect.left - 20}px;
top:${e.clientY - rect.top - 20}px;
background:rgba(79,142,247,0.2);
border-radius:50%;
transform:scale(0);
animation:rippleOut 0.4s ease forwards;
pointer-events:none;
`;
chip.style.position = 'relative';
chip.style.overflow = 'hidden';
chip.appendChild(ripple);
setTimeout(() => ripple.remove(), 400);
});
});
const style = document.createElement('style');
style.textContent = `
@keyframes rippleOut {
to { transform: scale(3); opacity: 0; }
}
`;
document.head.appendChild(style);
function patchCompressItemCreation() {
const resultsEl = document.getElementById('compressResults');
if (!resultsEl) return;
const observer = new MutationObserver(mutations => {
mutations.forEach(m => {
m.addedNodes.forEach(node => {
if (node.nodeType !== 1) return;
const items = node.classList?.contains('compress-item') ? [node]
: [...node.querySelectorAll('.compress-item')];
items.forEach(item => {
const sizes = item.querySelectorAll('.bar-size');
if (sizes.length >= 2) {
const before = parseSize(sizes[0].textContent);
const after = parseSize(sizes[1].textContent);
if (before && after) {
item.dataset.before = before;
item.dataset.after = after;
const afterFill = item.querySelector('.bar-fill-after');
if (afterFill) {
const ratio = after / before;
setTimeout(() => {
afterFill.style.width = Math.max(4, Math.round(ratio * 100)) + '%';
}, 100);
}
}
}
});
});
});
});
observer.observe(resultsEl, { childList: true, subtree: true });
}
function parseSize(str) {
if (!str) return 0;
str = str.trim();
const n = parseFloat(str);
if (str.includes('MB')) return n * 1024 * 1024;
if (str.includes('KB')) return n * 1024;
if (str.includes('B')) return n;
return 0;
}
patchCompressItemCreation();
const navLogo = document.querySelector('.nav-logo');
if (navLogo) {
navLogo.addEventListener('click', e => {
e.preventDefault();
window.scrollTo({ top: 0, behavior: 'smooth' });
});
}
});