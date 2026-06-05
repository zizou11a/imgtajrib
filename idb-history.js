'use strict';
const IDBHistory = (function () {
const DB_NAME = 'imgswift-history';
const DB_VERSION = 1;
const STORE = 'entries';
const MAX = 20;
let _db = null;
function openDB() {
if (_db) return Promise.resolve(_db);
return new Promise((resolve, reject) => {
let req;
try {
req = indexedDB.open(DB_NAME, DB_VERSION);
} catch (syncErr) {
return reject(syncErr);
}
req.onupgradeneeded = e => {
const db = e.target.result;
const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
store.createIndex('ts', 'ts', { unique: false });
};
req.onsuccess = e => { _db = e.target.result; resolve(_db); };
req.onerror = e => reject(e.target.error);
});
}
const MAX_BLOB_SIZE = 4 * 1024 * 1024;
async function add({ blob, filename, tool, originalSize, resultSize }) {
if (blob && blob.size > MAX_BLOB_SIZE) return;
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(STORE, 'readwrite');
const store = tx.objectStore(STORE);
store.add({ blob, filename, tool, originalSize, resultSize, ts: Date.now() });
tx.oncomplete = () => { _pruneOld(db); resolve(); };
tx.onerror = e => reject(e.target.error);
});
}
async function _pruneOld(db) {
const tx = db.transaction(STORE, 'readwrite');
const store = tx.objectStore(STORE);
const countReq = store.count();
countReq.onsuccess = () => {
const total = countReq.result;
if (total <= MAX) return;
const toDelete = total - MAX;
let deleted = 0;
const cursor = store.index('ts').openCursor(null, 'next');
cursor.onsuccess = e => {
const c = e.target.result;
if (!c || deleted >= toDelete) return;
c.delete();
deleted++;
c.continue();
};
};
}
async function getAll() {
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(STORE, 'readonly');
const store = tx.objectStore(STORE);
const req = store.index('ts').getAll();
req.onsuccess = e => resolve(e.target.result.reverse());
req.onerror = e => reject(e.target.error);
});
}
async function remove(id) {
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(STORE, 'readwrite');
tx.objectStore(STORE).delete(id);
tx.oncomplete = resolve;
tx.onerror = e => reject(e.target.error);
});
}
async function clearAll() {
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(STORE, 'readwrite');
tx.objectStore(STORE).clear();
tx.oncomplete = resolve;
tx.onerror = e => reject(e.target.error);
});
}
return { add, getAll, remove, clearAll };
})();
(function patchForHistory() {
const TOOL_LABELS = {
'jpg-png': 'JPG → PNG', 'jpg-webp': 'JPG → WebP', 'jpg-pdf': 'JPG → PDF',
'png-jpg': 'PNG → JPG', 'png-webp': 'PNG → WebP', 'png-pdf': 'PNG → PDF',
'webp-jpg': 'WebP → JPG', 'webp-png': 'WebP → PNG', 'compress': 'Compress',
'pdf-img': 'PDF → Img', 'ocr': 'OCR', 'bgremove': 'Remove BG',
};
document.addEventListener('DOMContentLoaded', () => {
const _orig = window.dlBlob;
window.dlBlob = function (blob, name, delay) {
if (_orig) _orig(blob, name, delay);
const tool = (typeof _activeTool !== 'undefined' && _activeTool) || 'convert';
let origSize = null;
if (typeof window.files !== 'undefined' && Array.isArray(window.files)) {
const baseName = name.replace(/\.[^/.]+$/, '');
const match = window.files.find(f => f.name.replace(/\.[^/.]+$/, '') === baseName);
if (match) origSize = match.size;
}
if (!origSize && typeof window.filesC !== 'undefined' && Array.isArray(window.filesC)) {
const baseName = name.replace(/_compressed\.[^/.]+$/, '').replace(/\.[^/.]+$/, '');
const match = window.filesC.find(f => f.name.replace(/\.[^/.]+$/, '') === baseName);
if (match) origSize = match.size;
}
IDBHistory.add({
blob,
filename: name,
tool: TOOL_LABELS[tool] || tool,
originalSize: origSize,
resultSize: blob.size,
}).then(() => renderHistoryPanel()).catch(() => {});
};
renderHistoryPanel();
});
})();
function renderHistoryPanel() {
IDBHistory.getAll().then(entries => {
let panel = document.getElementById('historyPanel');
if (!entries.length) {
if (panel) panel.style.display = 'none';
return;
}
if (!panel) {
panel = _buildPanel();
const anchor = document.getElementById('recentSection') ||
document.querySelector('footer') ||
document.body;
anchor.parentNode
? anchor.parentNode.insertBefore(panel, anchor.nextSibling)
: document.body.appendChild(panel);
}
panel.style.display = 'block';
const grid = document.getElementById('historyGrid');
grid.innerHTML = '';
entries.slice(0, MAX_VISIBLE).forEach(entry => {
const url = URL.createObjectURL(entry.blob);
const kb = (entry.blob.size / 1024).toFixed(0);
const date = _relTime(entry.ts);
const card = document.createElement('div');
card.className = 'history-card';
card.innerHTML = `
<img class="history-thumb" src="${url}" alt="${escapeHtml(entry.filename)}" loading="lazy">
<div class="history-info">
<div class="history-name">${escapeHtml(entry.filename)}</div>
<div class="history-meta">
<span class="history-tool">${escapeHtml(entry.tool)}</span>
<span class="history-size">${kb} KB</span>
<span class="history-date">${date}</span>
</div>
</div>
<div class="history-actions">
<button class="history-dl-btn" title="Download">⬇️</button>
<button class="history-rm-btn" title="Remove" data-id="${entry.id}">✕</button>
</div>
`;
card.querySelector('.history-dl-btn').addEventListener('click', () => {
const a = document.createElement('a');
a.href = url;
a.download = entry.filename;
document.body.appendChild(a);
a.click();
a.remove();
});
card.querySelector('.history-rm-btn').addEventListener('click', () => {
URL.revokeObjectURL(url);
IDBHistory.remove(entry.id).then(renderHistoryPanel);
card.classList.add('history-card--removing');
setTimeout(() => card.remove(), 280);
});
grid.appendChild(card);
});
}).catch(() => {});
}
const MAX_VISIBLE = 20;
function _buildPanel() {
const panel = document.createElement('section');
panel.id = 'historyPanel';
panel.className = 'history-panel';
panel.innerHTML = `
<div class="history-header">
<span class="history-title">🕓 Recent Results</span>
<button class="history-clear-btn" id="historyClearBtn">Clear all</button>
</div>
<div class="history-grid" id="historyGrid"></div>
`;
panel.querySelector('#historyClearBtn').addEventListener('click', () => {
IDBHistory.clearAll().then(renderHistoryPanel);
});
return panel;
}
function _relTime(ts) {
const diff = Date.now() - ts;
const m = Math.floor(diff / 60000);
const h = Math.floor(diff / 3600000);
const d = Math.floor(diff / 86400000);
if (m < 1) return 'just now';
if (m < 60) return `${m}m ago`;
if (h < 24) return `${h}h ago`;
return `${d}d ago`;
}