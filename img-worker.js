'use strict';
const supportsOffscreen = typeof OffscreenCanvas !== 'undefined';
async function bitmapToBlob(bitmap, mime, quality, targetW, targetH) {
const w = targetW || bitmap.width;
const h = targetH || bitmap.height;
if (supportsOffscreen) {
const canvas = new OffscreenCanvas(w, h);
const ctx = canvas.getContext('2d');
if (mime === 'image/jpeg' || mime === 'image/bmp') {
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, w, h);
}
ctx.drawImage(bitmap, 0, 0, w, h);
bitmap.close();
const opts = quality !== undefined ? { type: mime, quality } : { type: mime };
return canvas.convertToBlob(opts);
}
throw new Error('OffscreenCanvas not supported in this browser');
}
function calcDims(origW, origH, targetW, targetH, keepRatio) {
if (!targetW && !targetH) return { w: origW, h: origH };
if (!keepRatio) return { w: targetW || origW, h: targetH || origH };
const ratio = origW / origH;
if (targetW && targetH) {
const byWidth = { w: targetW, h: Math.round(targetW / ratio) };
const byHeight = { w: Math.round(targetH * ratio), h: targetH };
return byWidth.h <= targetH ? byWidth : byHeight;
}
if (targetW) return { w: targetW, h: Math.round(targetW / ratio) };
return { w: Math.round(targetH * ratio), h: targetH };
}
const NO_QUALITY = new Set(['image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/x-icon']);
/* image/avif intentionally excluded — browsers that support AVIF encoding accept a quality param */
self.onmessage = async function(e) {
const { type, payload } = e.data;
if (type === 'convert') {
const {
id,
buffer,
mime,
quality,
targetW,
targetH,
keepRatio,
originalSize,
} = payload;
try {
const blob = new Blob([buffer]);
const bitmap = await createImageBitmap(blob);
const { w, h } = calcDims(bitmap.width, bitmap.height, targetW, targetH, keepRatio);
const outQuality = NO_QUALITY.has(mime) ? undefined : quality;
const resultBlob = await bitmapToBlob(bitmap, mime, outQuality, w, h);
self.postMessage({
type: 'done',
payload: {
id,
blob: resultBlob,
originalSize,
resultSize: resultBlob.size,
}
});
} catch (err) {
self.postMessage({ type: 'error', payload: { id, message: err.message } });
}
}
else if (type === 'compress') {
const {
id,
buffer,
fileMime,
quality,
originalSize,
} = payload;
try {
const outMime =
fileMime === 'image/webp' ? 'image/webp' :
fileMime === 'image/png' ? 'image/png' : 'image/jpeg';
const blob = new Blob([buffer]);
const bitmap = await createImageBitmap(blob);
const outQuality = outMime === 'image/png' ? undefined : quality;
const resultBlob = await bitmapToBlob(bitmap, outMime, outQuality, bitmap.width, bitmap.height);
self.postMessage({
type: 'done',
payload: {
id,
blob: resultBlob,
originalSize,
resultSize: resultBlob.size,
outMime,
}
});
} catch (err) {
self.postMessage({ type: 'error', payload: { id, message: err.message } });
}
}
};