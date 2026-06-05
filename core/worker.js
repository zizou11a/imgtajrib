'use strict';
const WorkerManager = (function() {
let _worker = null;
let _callbacks = {};
let _supported = false;
function init() {
if (typeof Worker === 'undefined') return;
try {
_worker = new Worker('img-worker.js');
_worker.onmessage = function(e) {
const { type, payload } = e.data;
const cb = _callbacks[payload.id];
if (!cb) return;
delete _callbacks[payload.id];
if (type === 'done') cb.resolve(payload);
else cb.reject(new Error(payload.message));
};
_worker.onerror = function(err) {
console.warn('ImgSwift Worker error — falling back to main thread:', err.message);
_supported = false;
};
_supported = true;
} catch(e) {
_supported = false;
}
}
function _nextId() {
return Math.random().toString(36).slice(2);
}
function send(type, payload) {
return new Promise((resolve, reject) => {
if (!_supported || !_worker) {
reject(new Error('worker_unavailable'));
return;
}
const id = _nextId();
_callbacks[id] = { resolve, reject };
const buffer = payload.buffer;
_worker.postMessage({ type, payload: { ...payload, id } }, [buffer]);
});
}
init();
return { send, get supported() { return _supported; } };
})();
function processFileMainThread(file, mime, quality, targetW, targetH, keepRatio) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = e => {
const img = new Image();
img.onload = () => {
const { w, h } = getDims(img, !!(targetW || targetH), targetW, targetH, keepRatio);
const canvas = document.createElement('canvas');
canvas.width = w; canvas.height = h;
const ctx = canvas.getContext('2d');
if (mime === 'image/jpeg' || mime === 'image/bmp') {
ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
}
ctx.drawImage(img, 0, 0, w, h);
const NO_Q = ['image/png','image/gif','image/bmp','image/tiff','image/x-icon'];
const outMime = NO_Q.includes(mime) ? 'image/png' : mime;
canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
outMime, NO_Q.includes(mime) ? undefined : quality);
};
img.onerror = reject;
img.src = e.target.result;
};
reader.onerror = reject;
reader.readAsDataURL(file);
});
}
function compressFileMainThread(file, quality, forceMime) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = e => {
const img = new Image();
img.onload = () => {
const canvas = document.createElement('canvas');
canvas.width = img.width; canvas.height = img.height;
const ctx = canvas.getContext('2d');
const outMime = forceMime || (
file.type === 'image/webp' ? 'image/webp' :
file.type === 'image/png' ? 'image/png' : 'image/jpeg'
);
if (outMime === 'image/jpeg') {
ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
}
ctx.drawImage(img, 0, 0);
const q = outMime === 'image/png' ? undefined : quality;
canvas.toBlob(blob => blob ? resolve({ blob, outMime }) : reject(new Error('toBlob failed')),
outMime, q);
};
img.onerror = reject;
img.src = e.target.result;
};
reader.onerror = reject;
reader.readAsDataURL(file);
});
}
async function processFileWithWorker(file, mime, quality, targetW, targetH, keepRatio) {
const buffer = await file.arrayBuffer();
try {
const result = await WorkerManager.send('convert', {
buffer, mime, quality, targetW, targetH, keepRatio,
originalSize: file.size,
});
return result.blob;
} catch(e) {
return processFileMainThread(file, mime, quality, targetW, targetH, keepRatio);
}
}
async function compressFileWithWorker(file, quality) {
const buffer = await file.arrayBuffer();
try {
const result = await WorkerManager.send('compress', {
buffer, fileMime: file.type, quality,
originalSize: file.size,
});
return { blob: result.blob, outMime: result.outMime };
} catch(e) {
return compressFileMainThread(file, quality);
}
}