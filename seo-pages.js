'use strict';
(function initSeoPages() {
const SEO = {
'jpg-png': {
title: 'JPG to PNG Converter — Free Online | ImgSwift',
description: 'Convert JPG to PNG online for free. Lossless PNG output, transparent background support. No upload, no signup. 100% browser-based.',
hash: 'jpg-to-png',
icon: '🖼️',
label: 'JPG → PNG',
accent: '#f97316',
bg: '#1a0a00',
},
'jpg-webp': {
title: 'JPG to WebP Converter — Free Online | ImgSwift',
description: 'Convert JPG to WebP online. Reduce image size by up to 30% with better quality. Fast, free, no upload needed.',
hash: 'jpg-to-webp',
icon: '⚡',
label: 'JPG → WebP',
accent: '#3b82f6',
bg: '#000d1a',
},
'jpg-pdf': {
title: 'JPG to PDF Converter — Free Online | ImgSwift',
description: 'Convert multiple JPG images to a single PDF file online. Batch support, custom quality. No upload, works in your browser.',
hash: 'jpg-to-pdf',
icon: '📄',
label: 'JPG → PDF',
accent: '#ef4444',
bg: '#1a0000',
},
'png-jpg': {
title: 'PNG to JPG Converter — Free Online | ImgSwift',
description: 'Convert PNG to JPG online free. Smaller file sizes for sharing and web. Adjustable quality slider. No upload required.',
hash: 'png-to-jpg',
icon: '🖼️',
label: 'PNG → JPG',
accent: '#8b5cf6',
bg: '#0d0014',
},
'png-webp': {
title: 'PNG to WebP Converter — Free Online | ImgSwift',
description: 'Convert PNG to WebP online. Smaller files, same visual quality. Ideal for web performance. Free, browser-based.',
hash: 'png-to-webp',
icon: '⚡',
label: 'PNG → WebP',
accent: '#06b6d4',
bg: '#001214',
},
'png-pdf': {
title: 'PNG to PDF Converter — Free Online | ImgSwift',
description: 'Convert PNG images to PDF online. Batch convert multiple PNGs into one PDF. Free, no upload, instant download.',
hash: 'png-to-pdf',
icon: '📄',
label: 'PNG → PDF',
accent: '#10b981',
bg: '#001209',
},
'webp-jpg': {
title: 'WebP to JPG Converter — Free Online | ImgSwift',
description: 'Convert WebP images to JPG online free. Maximum compatibility for email and social media. No upload needed.',
hash: 'webp-to-jpg',
icon: '🔄',
label: 'WebP → JPG',
accent: '#f59e0b',
bg: '#140900',
},
'webp-png': {
title: 'WebP to PNG Converter — Free Online | ImgSwift',
description: 'Convert WebP to PNG online free. Lossless, transparent-background PNG output. Instant, browser-based.',
hash: 'webp-to-png',
icon: '🔄',
label: 'WebP → PNG',
accent: '#a78bfa',
bg: '#0c0014',
},
'compress': {
title: 'Compress Images Free Online — Up to 90% Smaller | ImgSwift',
description: 'Compress JPG, PNG and WebP images online free. Reduce file size up to 90% without visible quality loss. No upload, no signup.',
hash: 'compress',
icon: '🗜️',
label: 'Compress Image',
accent: '#22c55e',
bg: '#001a08',
},
'pdf-img': {
title: 'PDF to Image Converter — Free Online | ImgSwift',
description: 'Convert PDF pages to JPG or PNG images online free. Extract every page as a separate image. No upload, no signup.',
hash: 'pdf',
icon: '📑',
label: 'PDF → Image',
accent: '#f43f5e',
bg: '#1a0008',
},
'ocr': {
title: 'Extract Text from Image (OCR) — Free Online | ImgSwift',
description: 'Extract text from images online free with OCR. Supports English, Arabic, French and more. No upload, works in your browser.',
hash: 'ocr',
icon: '🔍',
label: 'Image OCR',
accent: '#eab308',
bg: '#141000',
},
'bgremove': {
title: 'Remove Image Background Free Online | ImgSwift',
description: 'Remove the background from any image free online. Get a transparent PNG instantly. No upload, no signup, 100% browser-based.',
hash: 'remove-bg',
icon: '✂️',
label: 'Remove BG',
accent: '#ec4899',
bg: '#1a0010',
},
'watermark': {
title: 'Add Watermark to Image Free Online — Text & Logo | ImgSwift',
description: 'Add a text watermark to any image free online. Customize position, opacity, font size and color. No upload, no signup, 100% browser-based.',
hash: 'watermark',
icon: '🔏',
label: 'Add Watermark',
accent: '#6366f1',
bg: '#06001a',
},
'resize': {
title: 'Resize Image Free Online — Exact Pixels or Percentage | ImgSwift',
description: 'Resize any image online free. Set exact pixel dimensions or scale by percentage. JPG, PNG, WebP, AVIF supported. No upload, no signup, 100% browser-based.',
hash: 'resize',
icon: '↔️',
label: 'Resize Image',
accent: '#0ea5e9',
bg: '#001219',
},
'metadata': {
title: 'View Image Metadata Free Online — EXIF, GPS, Camera Info | ImgSwift',
description: 'Read EXIF metadata from any image free online. See GPS location, camera model, lens, date taken, shutter speed, aperture, and ISO. No upload, 100% browser-based.',
hash: 'view-image-metadata',
icon: '🔬',
label: 'View Metadata',
accent: '#14b8a6',
bg: '#001413',
},
'rotate': {
title: 'Rotate Image Free Online — 90°, 180°, Flip &amp; Mirror | ImgSwift',
description: 'Rotate any image 90°, 180°, or 270° online free. Flip horizontally or vertically. JPG, PNG, WebP, AVIF supported. No upload, no signup, 100% browser-based.',
hash: 'rotate-image',
icon: '🔄',
label: 'Rotate Image',
accent: '#f97316',
bg: '#1a0800',
},
'flip': {
title: 'Flip Image Free Online — Horizontal &amp; Vertical Mirror | ImgSwift',
description: 'Flip any image horizontally or vertically online free. Mirror images instantly. JPG, PNG, WebP, AVIF supported. No upload, no signup, 100% browser-based.',
hash: 'flip-image',
icon: '↔️',
label: 'Flip Image',
accent: '#a855f7',
bg: '#0e0019',
},
'crop': {
title: 'Crop Image Free Online — Custom Size & Aspect Ratio | ImgSwift',
description: 'Crop any image online free. Set custom crop area or choose a preset aspect ratio. No upload, no signup, 100% browser-based.',
hash: 'crop',
icon: '✂️',
label: 'Crop Image',
accent: '#f43f5e',
bg: '#190006',
},
'exif': {
title: 'Remove EXIF Data Free Online — Strip Image Metadata | ImgSwift',
description: 'Remove EXIF metadata from images online free. Strip GPS, camera info and personal data before sharing. No upload, 100% browser-based.',
hash: 'remove-exif',
icon: '🧹',
label: 'Remove EXIF',
accent: '#ef4444',
bg: '#1a0000',
},
};
const DEFAULT = {
title: 'ImgSwift – Free Image Converter & Compressor | JPG PNG WebP PDF Online',
description: 'Convert & compress images free online. Convert JPG to WebP, PNG to JPG, images to PDF and 8+ formats. Compress images up to 90% without quality loss. 100% browser-based — no upload, no signup.',
canonical: 'https://imgswift.xyz/',
ogImage: 'https://imgswift.xyz/og-image.png',
};
const BASE_URL = 'https://imgswift.xyz/';
let _ogCanvas = null;
function _getOgCanvas() {
if (!_ogCanvas) {
_ogCanvas = document.createElement('canvas');
_ogCanvas.width = 1200;
_ogCanvas.height = 630;
}
return _ogCanvas;
}
function _generateOgImage(seo) {
return new Promise((resolve) => {
const canvas = _getOgCanvas();
const ctx = canvas.getContext('2d');
const W = 1200, H = 630;
ctx.clearRect(0, 0, W, H);
ctx.fillStyle = seo.bg || '#0a0a0f';
ctx.fillRect(0, 0, W, H);
const grd = ctx.createRadialGradient(200, H / 2, 0, 200, H / 2, 500);
grd.addColorStop(0, _hexAlpha(seo.accent, 0.18));
grd.addColorStop(1, 'transparent');
ctx.fillStyle = grd;
ctx.fillRect(0, 0, W, H);
ctx.strokeStyle = _hexAlpha(seo.accent, 0.25);
ctx.lineWidth = 1.5;
ctx.strokeRect(28, 28, W - 56, H - 56);
ctx.strokeStyle = _hexAlpha(seo.accent, 0.12);
ctx.lineWidth = 1;
for (let i = 0; i < 6; i++) {
const y = 90 + i * 90;
ctx.beginPath();
ctx.moveTo(60, y);
ctx.lineTo(W - 60, y);
ctx.stroke();
}
for (let i = 0; i < 30; i++) {
const x = 60 + (i % 10) * 115;
const y = 60 + Math.floor(i / 10) * 260;
ctx.beginPath();
ctx.arc(x, y, 1.5, 0, Math.PI * 2);
ctx.fillStyle = _hexAlpha(seo.accent, 0.15);
ctx.fill();
}
ctx.font = 'bold 22px monospace';
ctx.fillStyle = _hexAlpha('#ffffff', 0.4);
ctx.textBaseline = 'top';
ctx.fillText('⚡ imgswift.xyz', 60, 52);
ctx.font = '110px serif';
ctx.textBaseline = 'middle';
ctx.textAlign = 'left';
ctx.fillText(seo.icon, 60, H / 2 - 40);
ctx.font = 'bold 80px sans-serif';
ctx.fillStyle = seo.accent;
ctx.textBaseline = 'alphabetic';
ctx.textAlign = 'left';
const labelFontSize = seo.label.length > 14 ? 58 : seo.label.length > 10 ? 68 : 80;
ctx.font = `bold ${labelFontSize}px sans-serif`;
ctx.fillText(seo.label, 60, H / 2 + 80);
const desc = 'Free · Online · No Upload';
ctx.font = 'bold 28px sans-serif';
ctx.fillStyle = _hexAlpha('#ffffff', 0.55);
ctx.textBaseline = 'alphabetic';
ctx.fillText(desc, 62, H / 2 + 128);
const grad2 = ctx.createLinearGradient(60, 0, W - 60, 0);
grad2.addColorStop(0, seo.accent);
grad2.addColorStop(1, _hexAlpha(seo.accent, 0.0));
ctx.fillStyle = grad2;
ctx.fillRect(60, H - 60, W - 120, 3);
const cx = W - 200, cy = H / 2;
const ringGrd = ctx.createRadialGradient(cx, cy, 80, cx, cy, 200);
ringGrd.addColorStop(0, _hexAlpha(seo.accent, 0.08));
ringGrd.addColorStop(0.7, _hexAlpha(seo.accent, 0.05));
ringGrd.addColorStop(1, 'transparent');
ctx.fillStyle = ringGrd;
ctx.beginPath();
ctx.arc(cx, cy, 200, 0, Math.PI * 2);
ctx.fill();
[180, 140, 100].forEach((r, i) => {
ctx.beginPath();
ctx.arc(cx, cy, r, 0, Math.PI * 2);
ctx.strokeStyle = _hexAlpha(seo.accent, 0.08 + i * 0.04);
ctx.lineWidth = 1;
ctx.stroke();
});
ctx.font = '72px serif';
ctx.textBaseline = 'middle';
ctx.textAlign = 'center';
ctx.globalAlpha = 0.4;
ctx.fillText(seo.icon, cx, cy);
ctx.globalAlpha = 1;
resolve(canvas.toDataURL('image/png'));
});
}
function _hexAlpha(hex, alpha) {
const r = parseInt(hex.slice(1, 3), 16);
const g = parseInt(hex.slice(3, 5), 16);
const b = parseInt(hex.slice(5, 7), 16);
return `rgba(${r},${g},${b},${alpha})`;
}
function _setMeta(name, content, prop = false) {
const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
let el = document.querySelector(sel);
if (!el) {
el = document.createElement('meta');
prop ? el.setAttribute('property', name) : el.setAttribute('name', name);
document.head.appendChild(el);
}
el.setAttribute('content', content);
}
function _setCanonical(url) {
let el = document.querySelector('link[rel="canonical"]');
if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
el.href = url;
}
function applySeo(toolKey) {
const seo = SEO[toolKey];
if (!seo) { resetSeo(); return; }
const canonical = BASE_URL + '#' + seo.hash;
document.title = seo.title;
_setMeta('description', seo.description);
_setMeta('og:title', seo.title, true);
_setMeta('og:description', seo.description, true);
_setMeta('og:url', canonical, true);
_setMeta('twitter:title', seo.title);
_setMeta('twitter:description', seo.description);
_setCanonical(canonical);
_generateOgImage(seo).then((dataUrl) => {
_setMeta('og:image', dataUrl, true);
_setMeta('twitter:image', dataUrl);
});
history.replaceState(null, '', '#' + seo.hash);
}
function resetSeo() {
document.title = DEFAULT.title;
_setMeta('description', DEFAULT.description);
_setMeta('og:title', DEFAULT.title, true);
_setMeta('og:description', DEFAULT.description, true);
_setMeta('og:url', DEFAULT.canonical, true);
_setMeta('og:image', DEFAULT.ogImage, true);
_setMeta('twitter:title', DEFAULT.title);
_setMeta('twitter:description', DEFAULT.description);
_setMeta('twitter:image', DEFAULT.ogImage);
_setCanonical(DEFAULT.canonical);
history.replaceState(null, '', location.pathname);
}
document.addEventListener('DOMContentLoaded', () => {
const _orig = window.pickTool;
if (typeof _orig === 'function') {
window.pickTool = function (key) { _orig(key); applySeo(key); };
}
const _origClear = window.clearToolPick;
if (typeof _origClear === 'function') {
window.clearToolPick = function () { _origClear(); resetSeo(); };
}
});
window.ImgSwiftSeo = { applySeo, resetSeo, generateOgImage: _generateOgImage, SEO_DATA: SEO };
})();