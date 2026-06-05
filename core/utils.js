'use strict';
const extMap = {
'image/jpeg': 'jpg',
'image/png': 'png',
'image/webp': 'webp',
'image/avif': 'avif',
'image/gif': 'gif',
'image/bmp': 'bmp',
'image/tiff': 'tiff',
'image/x-icon': 'ico',
'pdf': 'pdf',
};
const NO_QUALITY_FORMATS = ['image/png','image/gif','image/bmp','image/tiff','image/x-icon'];
function getDims(img, enabled, targetW, targetH, keepRatio) {
let w = img.width, h = img.height;
if (enabled && (targetW || targetH)) {
if (keepRatio) {
if (targetW && !targetH) {
w = targetW;
h = Math.round(img.height * targetW / img.width);
} else if (targetH && !targetW) {
h = targetH;
w = Math.round(img.width * targetH / img.height);
} else {
w = targetW; h = targetH;
}
} else {
w = targetW || img.width;
h = targetH || img.height;
}
}
return { w, h };
}
function dlBlob(blob, name, delay = 0) {
setTimeout(() => {
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.download = name;
a.href = url;
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 1000);
}, delay);
}
function fmtSize(bytes) {
if (bytes < 1024) return bytes + ' B';
if (bytes < 1024*1024) return (bytes / 1024).toFixed(1) + ' KB';
return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
const SCRIPT_URLS = {
jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js',
heic2any: 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js',
libraw: 'https://cdn.jsdelivr.net/npm/libraw.js@0.0.6/dist/libraw.js',
};
const _loaded = {};
function loadScript(key) {
if (_loaded[key]) return _loaded[key];
_loaded[key] = new Promise((resolve, reject) => {
const s = document.createElement('script');
s.src = SCRIPT_URLS[key];
s.onload = () => {
if (key === 'pdfjs' && window.pdfjsLib) {
window.pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
resolve();
};
s.onerror = () => reject(new Error('Failed to load: ' + key));
document.head.appendChild(s);
});
return _loaded[key];
}
function escapeHtml(str) {
return str
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');
}
/* ── FRIENDLY ERROR MESSAGES ── */
const ERR_MAP = {
/* Browser capability */
'OffscreenCanvas not supported in this browser':
{ en: 'Your browser lacks advanced rendering support — try Chrome or Firefox.',
ar: 'متصفحك لا يدعم المعالجة المتقدمة — جرّب Chrome أو Firefox.',
retryable: false },
'createImageBitmap is not a function':
{ en: 'Your browser doesn\'t support this image feature — please update your browser.',
ar: 'متصفحك لا يدعم هذه الميزة — يرجى تحديث المتصفح.',
retryable: false },
/* Export failures */
'toBlob failed':
{ en: 'Could not export the image — it may be corrupt or too large.',
ar: 'تعذّر تصدير الصورة — قد تكون تالفة أو كبيرة جداً.',
retryable: true },
'toBlob returned null':
{ en: 'Image export returned empty — try a different format or lower quality.',
ar: 'تصدير الصورة أعاد نتيجة فارغة — جرّب صيغة أخرى أو جودة أقل.',
retryable: true },
/* Worker / engine */
'worker_unavailable':
{ en: 'Processing engine unavailable — falling back to main thread.',
ar: 'محرك المعالجة غير متاح — جاري التراجع للوضع الاحتياطي.',
retryable: true },
'Worker terminated':
{ en: 'Background processor crashed — retrying on main thread.',
ar: 'توقّف المعالج في الخلفية — جاري إعادة المحاولة.',
retryable: true },
'Script error.':
{ en: 'A background script failed to load — check your internet connection.',
ar: 'فشل تحميل سكريبت في الخلفية — تحقق من اتصالك بالإنترنت.',
retryable: true },
/* Network / library loading */
'Failed to load: jspdf':
{ en: 'PDF library failed to load — check your internet connection.',
ar: 'فشل تحميل مكتبة PDF — تحقق من اتصالك بالإنترنت.',
retryable: true },
'Failed to load: pdfjs':
{ en: 'PDF reader library failed to load — check your internet connection.',
ar: 'فشل تحميل مكتبة قراءة PDF — تحقق من اتصالك بالإنترنت.',
retryable: true },
'Failed to load: tesseract':
{ en: 'OCR library failed to load — check your internet connection.',
ar: 'فشل تحميل مكتبة OCR — تحقق من اتصالك بالإنترنت.',
retryable: true },
'Failed to fetch':
{ en: 'Network request failed — check your internet connection and try again.',
ar: 'فشل طلب الشبكة — تحقق من اتصالك وحاول مجدداً.',
retryable: true },
'NetworkError when attempting to fetch resource':
{ en: 'Network error — you may be offline.',
ar: 'خطأ في الشبكة — قد تكون غير متصل بالإنترنت.',
retryable: true },
/* File / format errors */
'File type not supported':
{ en: 'This file type is not supported — use JPG, PNG, WebP, GIF, BMP, TIFF, or ICO.',
ar: 'نوع الملف غير مدعوم — استخدم JPG أو PNG أو WebP أو GIF أو BMP أو TIFF أو ICO.',
retryable: false },
'Invalid image':
{ en: 'This file doesn\'t appear to be a valid image — it may be corrupt.',
ar: 'هذا الملف لا يبدو صورة صالحة — قد يكون تالفاً.',
retryable: false },
'The image could not be loaded':
{ en: 'Could not load the image — the file may be corrupt or in an unsupported format.',
ar: 'تعذّر تحميل الصورة — قد يكون الملف تالفاً أو بصيغة غير مدعومة.',
retryable: false },
'File is too large':
{ en: 'File is too large to process in the browser — try a smaller file.',
ar: 'الملف كبير جداً للمعالجة في المتصفح — جرّب ملفاً أصغر.',
retryable: false },
/* Canvas / memory */
'Out of memory':
{ en: 'Ran out of memory — try fewer files at once or use a smaller image.',
ar: 'نفدت الذاكرة — جرّب ملفات أقل أو صورة أصغر.',
retryable: false },
'Canvas area exceeds the maximum limit':
{ en: 'Image resolution is too high for the browser to process — try resizing first.',
ar: 'دقة الصورة عالية جداً للمتصفح — جرّب تصغيرها أولاً.',
retryable: false },
/* PDF-specific */
'Invalid PDF structure':
{ en: 'This PDF file appears to be corrupt or password-protected.',
ar: 'ملف PDF يبدو تالفاً أو محمياً بكلمة مرور.',
retryable: false },
'Password required':
{ en: 'This PDF is password-protected — remove the password before converting.',
ar: 'هذا PDF محمي بكلمة مرور — قم بإزالتها قبل التحويل.',
retryable: false },
/* OCR */
'Tesseract not initialized':
{ en: 'OCR engine failed to initialize — please reload the page.',
ar: 'فشل تهيئة محرك OCR — يرجى إعادة تحميل الصفحة.',
retryable: false },
/* Generic JS errors */
'QuotaExceededError':
{ en: 'Storage quota exceeded — clear some browser data and try again.',
ar: 'تجاوزت حصة التخزين — امسح بعض بيانات المتصفح وحاول مجدداً.',
retryable: false },
};
/* ── PATTERN-BASED ERROR MATCHING ── */
const ERR_PATTERNS = [
{ test: /out of memory/i,
en: 'Ran out of memory — try fewer files or a smaller image.',
ar: 'نفدت الذاكرة — جرّب ملفات أقل أو صورة أصغر.',
retryable: false },
{ test: /network|fetch|load.*fail|fail.*load/i,
en: 'A network error occurred — check your connection and try again.',
ar: 'حدث خطأ في الشبكة — تحقق من اتصالك وحاول مجدداً.',
retryable: true },
{ test: /canvas|resolution|dimension/i,
en: 'Image dimensions are too large for the browser — try resizing first.',
ar: 'أبعاد الصورة كبيرة جداً للمتصفح — جرّب تصغيرها أولاً.',
retryable: false },
{ test: /corrupt|invalid|broken/i,
en: 'This file appears to be corrupt or in an unsupported format.',
ar: 'يبدو أن هذا الملف تالف أو بصيغة غير مدعومة.',
retryable: false },
{ test: /security|tainted|cross.?origin/i,
en: 'Security error — the image may be from a restricted source.',
ar: 'خطأ أمني — قد تكون الصورة من مصدر مقيّد.',
retryable: false },
];
function friendlyError(err, filename) {
const msg = (err && err.message) || String(err || '');
/* Exact match first */
let entry = ERR_MAP[msg] || null;
/* Pattern match fallback */
if (!entry && msg) {
for (const p of ERR_PATTERNS) {
if (p.test.test(msg)) { entry = p; break; }
}
}
const lang = entry && currentLang in entry ? currentLang : 'en';
const base = entry
? entry[lang]
: (currentLang === 'ar' ? 'خطأ في معالجة الملف' : 'Error processing file');
return filename ? `${base} — ${filename}` : base;
}
/* Whether this error is worth retrying */
function isRetryable(err) {
const msg = (err && err.message) || String(err || '');
const exact = ERR_MAP[msg];
if (exact) return !!exact.retryable;
for (const p of ERR_PATTERNS) {
if (p.test.test(msg)) return !!p.retryable;
}
return true; /* default: allow retry for unknown errors */
}