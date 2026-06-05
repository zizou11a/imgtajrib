const _INJECTED = '__DEPLOY_VERSION__';
const VERSION = _INJECTED.startsWith('__') ? 'imgswift-v26' : 'imgswift-' + _INJECTED;
const SHELL = [
'/styles.css',
'/translations.js',
'/img-worker.js',
'/pdf-tool.js',
'/manifest.json',
'/features.css',
'/features.js',
'/smart-queue.js',
'/zip-download.js',
'/zip-download.css',
'/smart-queue.css',
'/amoled-theme.css',
'/amoled-theme.js',
'/idb-history.css',
'/idb-history.js',
'/seo-pages.js',
'/core/state.js',
'/core/utils.js',
'/core/worker.js',
'/core/ui.js',
'/core/convert.js',
'/core/compress.js',
'/core/pwa.js',
'/core/router.js',
'/core/recent.js',
];
self.addEventListener('install', e => {
e.waitUntil(
caches.open(VERSION)
.then(c => c.addAll(SHELL))
.then(() => self.skipWaiting())
);
});
self.addEventListener('activate', e => {
e.waitUntil(
caches.keys()
.then(keys => Promise.all(
keys
.filter(k => k !== VERSION)
.map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
))
.then(() => self.clients.claim())
.then(() => {
self.clients.matchAll({ type: 'window' }).then(clients => {
clients.forEach(client => {
client.postMessage({ type: 'SW_UPDATED' });
// Force reload to get new HTML
client.navigate(client.url);
});
});
})
);
});
self.addEventListener('fetch', e => {
const { request } = e;
const url = request.url;
if (request.method !== 'GET') return;
if (!url.startsWith('http')) return;
if (
url.includes('cdnjs.cloudflare.com') ||
url.includes('cdn.jsdelivr.net')
) {
e.respondWith(
fetch(request).catch(() =>
new Response('Offline — library unavailable', { status: 503 })
)
);
return;
}
if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
e.respondWith(staleWhileRevalidate(request, 'imgswift-fonts'));
return;
}
// HTML pages always network-first to get fresh content
if (url.endsWith('/') || url.endsWith('.html') || url.match(/imgswift\.xyz\/?$/)) {
e.respondWith(networkFirst(request));
return;
}
if (isShell(url)) {
e.respondWith(cacheFirst(request));
return;
}
e.respondWith(networkFirst(request));
});
function isShell(url) {
return SHELL.some(path => url.endsWith(path) || url.includes(path));
}
async function cacheFirst(request) {
const cached = await caches.match(request);
if (cached) return cached;
try {
const response = await fetch(request);
if (response.ok) {
const cache = await caches.open(VERSION);
cache.put(request, response.clone());
}
return response;
} catch {
return new Response('Offline', { status: 503 });
}
}
async function networkFirst(request) {
try {
const response = await fetch(request);
if (response.ok) {
const cache = await caches.open(VERSION);
cache.put(request, response.clone());
}
return response;
} catch {
const cached = await caches.match(request);
return cached || new Response('Offline', { status: 503 });
}
}
async function staleWhileRevalidate(request, cacheName) {
const cache = await caches.open(cacheName);
const cached = await cache.match(request);
const fetchPromise = fetch(request).then(response => {
if (response.ok) cache.put(request, response.clone());
return response;
}).catch(() => null);
return cached || fetchPromise;
}
