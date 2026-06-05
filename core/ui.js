'use strict';
(function() {
const saved = Store.get('imgswift-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = saved || (prefersDark ? 'dark' : 'light');
if (theme === 'light') {
document.documentElement.setAttribute('data-theme', 'light');
document.addEventListener('DOMContentLoaded', () => {
const btn = $('themeToggle');
if (btn) btn.textContent = '☀️';
});
}
})();
function toggleTheme() {
const html = document.documentElement;
const btn = $('themeToggle');
const isLight = html.getAttribute('data-theme') === 'light';
if (isLight) {
html.removeAttribute('data-theme');
btn.textContent = '🌙';
Store.set('imgswift-theme', 'dark');
} else {
html.setAttribute('data-theme', 'light');
btn.textContent = '☀️';
Store.set('imgswift-theme', 'light');
}
}
let toastTimer = null;
function showToast(msg, type = '', duration = 3500) {
const el = $('toast');
el.className = type ? `show ${type}` : 'show';
el.textContent = msg;
if (toastTimer) clearTimeout(toastTimer);
toastTimer = setTimeout(() => { el.className = ''; }, duration);
}
function showErrorPanel(errors, opts = {}) {
const old = document.getElementById('error-panel');
if (old) old.remove();
const panel = document.createElement('div');
panel.id = 'error-panel';
panel.setAttribute('role', 'alertdialog');
panel.setAttribute('aria-modal', 'false');
panel.setAttribute('aria-label', currentLang === 'ar' ? 'تفاصيل الأخطاء' : 'Error details');
const isAr = currentLang === 'ar';
const title = opts.title || (isAr ? 'تفاصيل الأخطاء' : 'Error Details');
const hasRetry = opts.onRetry && errors.some(e => isRetryable(e.err));
panel.innerHTML = `
<div class="ep-header">
<span class="ep-icon">⚠️</span>
<span class="ep-title">${escapeHtml(title)}</span>
<button class="ep-close" aria-label="Close" onclick="this.closest('#error-panel').remove()">✕</button>
</div>
<div class="ep-list">
${errors.map(e => `
<div class="ep-row ${isRetryable(e.err) ? 'ep-retryable' : 'ep-fatal'}">
<span class="ep-filename" title="${escapeHtml(e.file || '')}">${escapeHtml(e.file || (isAr ? 'ملف' : 'File'))}</span>
<span class="ep-msg">${escapeHtml(friendlyError(e.err, ''))}</span>
</div>`).join('')}
</div>
<div class="ep-footer">
${hasRetry ? `<button class="ep-retry-btn" id="ep-retry-btn">${isAr ? '🔄 إعادة المحاولة' : '🔄 Retry Failed'}</button>` : ''}
<button class="ep-dismiss" onclick="this.closest('#error-panel').remove()">${isAr ? 'إغلاق' : 'Dismiss'}</button>
</div>`;
document.body.appendChild(panel);
requestAnimationFrame(() => panel.classList.add('ep-visible'));
if (hasRetry) {
document.getElementById('ep-retry-btn').addEventListener('click', () => {
panel.remove();
opts.onRetry();
});
}
return panel;
}
(function initGlobalErrorBoundary() {
window.addEventListener('unhandledrejection', e => {
const err = e.reason;
if (!err) return;
const msg = (err && err.message) || String(err);
if (/ResizeObserver|IntersectionObserver/i.test(msg)) return;
console.error('[imgswift] unhandledrejection:', err);
showToast(friendlyError(err, ''), 'error', 5000);
});
window.addEventListener('error', e => {
if (!e.error) return;
const msg = (e.error && e.error.message) || '';
if (/ResizeObserver|IntersectionObserver/i.test(msg)) return;
if (e.target && e.target.tagName === 'SCRIPT') return;
console.error('[imgswift] global error:', e.error);
showToast(friendlyError(e.error, ''), 'error', 5000);
});
})();
function switchTab(name, el) {
document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
document.querySelectorAll('.tab-btn').forEach(b => {
b.classList.remove('active');
b.setAttribute('aria-selected', 'false');
});
$('panel-' + name).classList.add('active');
el.classList.add('active');
el.setAttribute('aria-selected', 'true');
}
function setLang(lang, el) {
currentLang = lang;
const t = T[lang];
const isRtl = lang === 'ar';
document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', lang);
const set = (id, val) => { const n = $(id); if (n) n.textContent = val; };
const setHTML = (id, val) => { const n = $(id); if (n) n.innerHTML = val; };
$('t-skip').textContent = t.skip;
set('t-tab-convert', t.tabConvert);
set('t-tab-compress', t.tabCompress);
set('t-tab-pdf', t.tabPdf);
set('t-tab-ocr', t.tabOcr);
set('t-tab-stats', t.tabStats);
set('t-tab-smartcomp', t.tabSmartcomp);
set('t-tab-recommend', t.tabRecommend);
set('t-tab-bulk', t.tabBulk);
set('t-tab-redownload', t.tabRedownload);
set('t-stats-title', t.statsTitle);
set('t-stats-reset', t.statsReset);
set('t-sc-upload-title', t.scUploadTitle);
set('t-sc-upload-sub', t.scUploadSub);
set('t-sc-download-btn', t.scDownloadBtn);
set('t-sc-new-btn', t.scNewBtn);
set('t-rec-title', t.recTitle);
set('t-rec-sub', t.recSub);
set('t-rec-question', t.recQuestion);
set('t-rec-shrink', t.recShrink);
set('t-rec-convert', t.recConvert);
set('t-rec-web', t.recWeb);
set('t-rec-privacy', t.recPrivacy);
set('t-rec-edit', t.recEdit);
set('t-rec-pdf', t.recPdf);
set('t-rec-info', t.recInfo);
set('t-rec-bulk', t.recBulk);
set('t-rec-ask-again', t.recAskAgain);
set('t-bulk-upload-title',t.bulkUploadTitle);
set('t-bulk-upload-sub', t.bulkUploadSub);
set('t-bulk-op-label', t.bulkOperation);
set('t-bulk-op-convert', t.bulkOpConvert);
set('t-bulk-op-compress', t.bulkOpCompress);
set('t-bulk-op-fliph', t.bulkOpFlipH);
set('t-bulk-op-flipv', t.bulkOpFlipV);
set('t-bulk-op-rot90', t.bulkOpRot90);
set('t-bulk-op-rot180', t.bulkOpRot180);
set('t-bulk-format-label',t.bulkFormat);
set('t-bulk-quality-label',t.bulkQuality);
set('t-bulk-process', t.bulkProcess);
set('t-bulk-dl-all', t.bulkDownloadAll);
set('t-bulk-clear', t.bulkClear);
set('t-rdl-title', t.rdlTitle);
set('t-rdl-clear-all', t.rdlClearAll);
set('t-rdl-all', t.rdlAll);
set('t-rdl-convert', t.rdlConvert);
set('t-rdl-compress', t.rdlCompress);
set('t-rdl-empty', t.rdlEmpty);
const rdlSrch = document.getElementById('rdlSearch');
if (rdlSrch && t.rdlSearch) rdlSrch.placeholder = t.rdlSearch;
set('t-eyebrow', t.eyebrow);
setHTML('t-hero-title', t.heroTitle);
set('t-hero-desc', t.heroDesc);
['b1','b2','b3','b4','b5','b6'].forEach(id => set(id, t[id]));
set('t-upload-title', t.uploadTitle);
set('t-upload-sub', t.uploadSub);
set('t-upload-title-c', t.uploadTitleC);
set('t-upload-sub-c', t.uploadSubC);
set('t-format-title', t.formatTitle);
set('t-quality', t.quality);
set('t-quality-note', t.qualityNote);
set('t-resize-title', t.resizeTitle);
set('t-enable-resize', t.enableResize);
set('t-width', t.width);
set('t-height', t.height);
set('t-ratio', t.ratio);
set('t-convert-btn', t.convertBtn);
set('t-new-btn', t.newBtn);
set('t-processing', t.processing);
set('t-processing-c', t.processing);
set('t-compress-quality', t.compressQuality);
set('t-compress-small', t.compressSmall);
set('t-compress-quality-label', t.compressQualLabel);
set('t-compress-btn', t.compressBtn);
set('t-compress-new', t.compressNew);
set('t-footer-privacy', t.footerPrivacy);
set('t-upload-title-pdf', t.uploadTitlePdf);
set('t-upload-sub-pdf', t.uploadSubPdf);
set('t-pdf-format-label', t.pdfFormatLabel);
set('t-pdf-dl-all', t.pdfDlAll);
set('t-processing-pdf', t.pdfProcessing);
set('t-pdf-new', t.pdfNew);
set('t-upload-title-ocr', t.uploadTitleOcr);
set('t-upload-sub-ocr', t.uploadSubOcr);
set('t-ocr-lang-label', t.ocrLangLabel);
set('t-ocr-btn', t.ocrBtn);
set('t-ocr-result-label', t.ocrResultLabel);
set('t-ocr-copy', t.ocrCopy);
set('t-ocr-dl', t.ocrDl);
set('t-ocr-new', t.ocrNew);
if (t.tabBgremove) set('t-tab-bgremove', t.tabBgremove);
if (t.modeQuality) set('t-mode-quality', t.modeQuality);
if (t.modeTarget) set('t-mode-target', t.modeTarget);
if (t.targetLabel) set('t-target-label', t.targetLabel);
if (t.targetNote) set('t-target-note', t.targetNote);
if (t.uploadTitleBgr) set('t-upload-title-bgr', t.uploadTitleBgr);
if (t.uploadSubBgr) set('t-upload-sub-bgr', t.uploadSubBgr);
if (t.bgrBtn) set('t-bgr-btn', t.bgrBtn);
if (t.bgrDl) set('t-bgr-dl', t.bgrDl);
if (t.bgrNew) set('t-bgr-new', t.bgrNew);
if (t.bgrFill) set('t-bgr-fill', t.bgrFill);
if (t.bgrBefore) set('t-bgr-before', t.bgrBefore);
if (t.bgrAfter) set('t-bgr-after', t.bgrAfter);
if (t.tabExif) set('t-tab-exif', t.tabExif);
if (t.uploadTitleExif) set('t-upload-title-exif', t.uploadTitleExif);
if (t.uploadSubExif) set('t-upload-sub-exif', t.uploadSubExif);
if (t.exifBtn) set('t-exif-btn', t.exifBtn);
if (t.exifDl) set('t-exif-dl', t.exifDl);
if (t.exifCopy) set('t-exif-copy', t.exifCopy);
if (t.exifShare) set('t-exif-share', t.exifShare);
if (t.exifProcessing) set('t-exif-processing', t.exifProcessing);
if (t.exifNew) set('t-exif-new', t.exifNew);
if (t.exifExplainTitle) set('t-exif-explain-title', t.exifExplainTitle);
if (t.exifExplainBody) set('t-exif-explain-body', t.exifExplainBody);
if (t.smartModesLabel) set('t-smart-modes-label', t.smartModesLabel);
if (t.smartLight) set('t-smart-light', t.smartLight);
if (t.smartBalanced) set('t-smart-balanced', t.smartBalanced);
if (t.smartMaximum) set('t-smart-maximum', t.smartMaximum);
if (t.tabTranslate) set('t-tab-translate', t.tabTranslate);
if (t.translateUploadTitle) set('t-upload-title-translate', t.translateUploadTitle);
if (t.translateUploadSub) set('t-upload-sub-translate', t.translateUploadSub);
if (t.translateOcrLangLabel) set('t-translate-ocr-lang-label', t.translateOcrLangLabel);
if (t.translateTargetLangLabel) set('t-translate-target-lang-label', t.translateTargetLangLabel);
if (t.translateBtn) set('t-translate-btn', t.translateBtn);
if (t.translateExtractedLabel) set('t-translate-extracted-label', t.translateExtractedLabel);
if (t.translateResultLabel) set('t-translate-result-label', t.translateResultLabel);
if (t.translateCopyOcr) set('t-translate-copy-ocr', t.translateCopyOcr);
if (t.translateCopyResult) set('t-translate-copy-result', t.translateCopyResult);
if (t.translateDl) set('t-translate-dl', t.translateDl);
if (t.translateNew) set('t-translate-new', t.translateNew);
if (t.translatePowered) set('t-translate-powered', t.translatePowered);
document.querySelectorAll('.lang-btn').forEach(b => {
b.classList.remove('active');
b.setAttribute('aria-pressed', 'false');
});
el.classList.add('active');
el.setAttribute('aria-pressed', 'true');
}
function setProgress(wrapId, fillId, pctId, pct) {
const wrap = $(wrapId);
const fill = $(fillId);
const pctEl = $(pctId);
if (!wrap.style.display || wrap.style.display === 'none') wrap.style.display = 'block';
fill.style.width = pct + '%';
if (pctEl) pctEl.textContent = pct + '%';
wrap.setAttribute('aria-valuenow', pct);
}