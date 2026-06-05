'use strict';
const SmartQueue = (function () {
const DEFAULT_CONCURRENCY = Math.min(
Math.max(navigator.hardwareConcurrency || 2, 3),
6
);
let _concurrency = DEFAULT_CONCURRENCY;
let _running = 0;
let _queue = [];
function enqueue(fn) {
return new Promise((resolve, reject) => {
_queue.push({ fn, resolve, reject });
_tick();
});
}
function _tick() {
while (_running < _concurrency && _queue.length > 0) {
const { fn, resolve, reject } = _queue.shift();
_running++;
fn()
.then(result => { resolve(result); })
.catch(err => { reject(err); })
.finally(() => { _running--; _tick(); });
}
}
return {
enqueue,
setConcurrency(n) { _concurrency = Math.max(1, n); },
getConcurrency() { return _concurrency; },
get pending() { return _queue.length; },
get running() { return _running; },
reset() { _queue = []; _running = 0; },
};
})();
document.addEventListener('DOMContentLoaded', () => {
const _origProcessFileWithWorker = window.processFileWithWorker;
const _origCompressFileWithWorker = window.compressFileWithWorker;
if (typeof _origProcessFileWithWorker === 'function') {
window.processFileWithWorker = function(file, mime, quality, targetW, targetH, keepRatio) {
return SmartQueue.enqueue(() =>
_origProcessFileWithWorker(file, mime, quality, targetW, targetH, keepRatio)
);
};
}
if (typeof _origCompressFileWithWorker === 'function') {
window.compressFileWithWorker = function(file, quality) {
return SmartQueue.enqueue(() =>
_origCompressFileWithWorker(file, quality)
);
};
}
_patchProgressBars();
});
function _patchProgressBars() {
_addQueueLabel('progressWrap', 'queue-label-convert');
_addQueueLabel('progressWrapC', 'queue-label-compress');
_observeFill('progressFill', 'queue-label-convert');
_observeFill('progressFillC', 'queue-label-compress');
}
function _addQueueLabel(wrapId, labelId) {
const wrap = document.getElementById(wrapId);
if (!wrap || document.getElementById(labelId)) return;
const lbl = document.createElement('div');
lbl.id = labelId;
lbl.className = 'queue-status-label';
lbl.style.display = 'none';
wrap.parentNode.insertBefore(lbl, wrap.nextSibling);
}
function _observeFill(fillId, labelId) {
const fill = document.getElementById(fillId);
if (!fill) return;
const obs = new MutationObserver(() => {
const lbl = document.getElementById(labelId);
if (!lbl) return;
const pct = parseInt(fill.style.width) || 0;
if (pct > 0 && pct < 100) {
lbl.style.display = 'block';
const running = SmartQueue.running;
const waiting = SmartQueue.pending;
lbl.textContent = waiting > 0
? `⚙️ ${running} processing · ${waiting} waiting`
: `⚙️ ${running} processing`;
} else {
lbl.style.display = 'none';
}
});
obs.observe(fill, { attributes: true, attributeFilter: ['style'] });
}