'use strict';
function updateCompressQuality(input) {
$('compressQualVal').textContent = input.value + '%';
input.setAttribute('aria-valuenow', input.value);
const q = parseInt(input.value, 10);
document.querySelectorAll('.smart-mode-btn').forEach(btn => {
const modeQ = { light: 82, balanced: 65, maximum: 35 }[btn.dataset.mode];
btn.classList.toggle('active', modeQ === q);
});
}
let _compressMode = 'quality';
function setCompressMode(mode) {
_compressMode = mode;
$('modeBtnQuality').classList.toggle('active', mode === 'quality');
$('modeBtnTarget').classList.toggle('active', mode === 'target');
$('modeBtnQuality').setAttribute('aria-pressed', mode === 'quality');
$('modeBtnTarget').setAttribute('aria-pressed', mode === 'target');
$('qualityModePanel').style.display = mode === 'quality' ? 'block' : 'none';
$('targetModePanel').style.display = mode === 'target' ? 'block' : 'none';
}
function setTargetPreset(kb) {
$('targetKB').value = kb;
document.querySelectorAll('.target-preset').forEach(b => b.classList.remove('active'));
const map = { 1000: 'presetWhatsapp', 500: 'presetEmail', 200: 'presetWeb', 100: 'presetThumbnail' };
if (map[kb]) $(map[kb]).classList.add('active');
}
function clearTargetPresets() {
document.querySelectorAll('.target-preset').forEach(b => b.classList.remove('active'));
}
function handleFilesC(e) {
loadFilesC(Array.from(e.target.files));
}
function loadFilesC(list) {
filesC = list;
blobsC = [];
const t = T[currentLang];
$('fileCountC').textContent = `${t.selected} ${filesC.length} ${t.images}`;
$('compressStatus').textContent = '';
$('compressResults').style.display = 'none';
$('compressResults').innerHTML = '';
$('btnCompressNew').style.display = 'none';
$('btnCompress').style.display = 'flex';
$('uploadAreaC').querySelector('strong').textContent = `✅ ${filesC.length} ${t.images}`;
}
document.addEventListener('DOMContentLoaded', () => {
const uploadAreaC = $('uploadAreaC');
uploadAreaC.addEventListener('dragover', e => { e.preventDefault(); uploadAreaC.classList.add('drag-over'); });
uploadAreaC.addEventListener('dragleave', () => uploadAreaC.classList.remove('drag-over'));
uploadAreaC.addEventListener('drop', e => {
e.preventDefault();
uploadAreaC.classList.remove('drag-over');
const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
if (dropped.length) loadFilesC(dropped);
});
});
async function compressToTargetSize(file, targetBytes) {
const outMime =
file.type === 'image/webp' ? 'image/webp' :
file.type === 'image/png' ? 'image/jpeg' :
'image/jpeg';
let lo = 0.05, hi = 0.95, best = null, bestQ = hi;
const MAX_ITER = 10;
const _compress = (q) =>
(typeof window.compressFileWithWorker === 'function')
? window.compressFileWithWorker(file, q)
: compressFileMainThread(file, q, outMime);
for (let i = 0; i < MAX_ITER; i++) {
const mid = (lo + hi) / 2;
const { blob } = await _compress(mid);
if (blob.size <= targetBytes) { best = blob; bestQ = mid; lo = mid; }
else { hi = mid; }
if (hi - lo < 0.02) break;
}
if (!best) {
const { blob } = await _compress(0.05);
best = blob; bestQ = 0.05;
}
return { blob: best, outMime, finalQuality: Math.round(bestQ * 100) };
}
function compressAll() {
const t = T[currentLang];
if (!filesC.length) { showToast(t.alert, 'error'); return; }
const isTargetMode = _compressMode === 'target';
const targetKB = isTargetMode ? parseInt($('targetKB').value, 10) || 500 : null;
const targetBytes = targetKB ? targetKB * 1024 : null;
const q = isTargetMode ? 0.7 : $('compressQual').value / 100;
const btn = $('btnCompress');
btn.disabled = true;
blobsC = [];
$('compressResults').innerHTML = '';
$('compressResults').style.display = 'none';
let done = 0;
let failed = 0;
setProgress('progressWrapC', 'progressFillC', 'progressPctC', 0);
filesC.forEach((file, i) => {
const ext =
file.type === 'image/png' ? (isTargetMode ? 'jpg' : 'png') :
file.type === 'image/webp' ? 'webp' : 'jpg';
const compressPromise = isTargetMode
? compressToTargetSize(file, targetBytes)
: compressFileWithWorker(file, q);
compressPromise.then(({ blob, outMime, finalQuality }) => {
done++;
blobsC[i] = { blob, ext, name: file.name };
setProgress('progressWrapC', 'progressFillC', 'progressPctC',
Math.round(done / filesC.length * 100));
const originalSize = file.size;
const compressedSize = blob.size;
const savedPct = Math.round((1 - compressedSize / originalSize) * 100);
const originalUrl = URL.createObjectURL(file);
const compressedUrl = URL.createObjectURL(blob);
urlsC.push(originalUrl, compressedUrl);
const _revokeCard = () => {
URL.revokeObjectURL(originalUrl);
URL.revokeObjectURL(compressedUrl);
const idx = urlsC.indexOf(originalUrl);
if (idx >= 0) urlsC.splice(idx, 2);
};
const targetHit = targetBytes
? blob.size <= targetBytes
? `<span class="target-hit-badge success">✅ &lt; ${targetKB} KB</span>`
: `<span class="target-hit-badge warn">⚠️ ${Math.round(blob.size/1024)} KB</span>`
: '';
const div = document.createElement('div');
div.className = 'compress-item';
div.innerHTML = `
<div class="compress-item-name">📄 ${escapeHtml(file.name)}${targetHit}</div>
<div class="compress-bars">
<div class="bar-row">
<span class="bar-label">${t.before}</span>
<div class="bar-track"><div class="bar-fill-before" style="width:100%"></div></div>
<span class="bar-size">${fmtSize(originalSize)}</span>
</div>
<div class="bar-row">
<span class="bar-label">${t.after}</span>
<div class="bar-track">
<div class="bar-fill-after" style="width:${Math.round(compressedSize / originalSize * 100)}%"></div>
</div>
<span class="bar-size">${fmtSize(compressedSize)}</span>
</div>
</div>
<div class="compress-saving">
<div>
<div style="font-size:12px;color:var(--muted);margin-bottom:2px">${t.saved}</div>
<div class="saving-pct ${savedPct <= 0 ? 'negative' : ''}">${savedPct > 0 ? '-' + savedPct + '%' : '+' + Math.abs(savedPct) + '%'}</div>
</div>
<button class="btn-dl-single" data-idx="${i}">⬇️ ${t.download}</button>
</div>
<div class="ba-slider-wrap">
<div class="ba-slider-header">
<span class="ba-slider-title">👁️ ${t.before} / ${t.after}</span>
<span class="ba-hint"><span class="ba-hint-arrow">←</span> اسحب للمقارنة <span class="ba-hint-arrow">→</span></span>
</div>
<div class="ba-wrap" data-pos="50">
<div class="ba-before"><img src="${originalUrl}" alt="Before" loading="lazy"></div>
<div class="ba-after" style="clip-path:inset(0 50% 0 0)">
<img src="${compressedUrl}" alt="After" loading="lazy">
</div>
<img class="ba-spacer" src="${originalUrl}" alt="" loading="lazy">
<div class="ba-divider"></div>
<div class="ba-handle">
<svg viewBox="0 0 24 24">
<polyline points="15 18 9 12 15 6"/>
<polyline points="9 6 15 12 9 18" transform="translate(0,0)"/>
</svg>
</div>
<span class="ba-label-before">${t.before}</span>
<span class="ba-label-after">${t.after}</span>
</div>
</div>
`;
$('compressResults').appendChild(div);
if ('IntersectionObserver' in window) {
const _obs = new IntersectionObserver((entries, obs) => {
entries.forEach(entry => {
if (!entry.isIntersecting && entry.intersectionRatio === 0) {
_revokeCard();
obs.disconnect();
}
});
}, { rootMargin: '200px' });
_obs.observe(div);
}
div.querySelector(`[data-idx="${i}"]`).addEventListener('click', () => {
dlBlob(blobsC[i].blob, file.name.replace(/\.[^/.]+$/, '') + '_compressed.' + blobsC[i].ext);
});
const baWrap = div.querySelector('.ba-wrap');
if (baWrap) {
setTimeout(() => { initBaSlider(baWrap); _baIntroAnim(baWrap); }, 120);
}
if (done === filesC.length) {
const succeeded = done - failed;
if (failed === 0) {
$('compressStatus').textContent = `${t.compressSuccess} ${succeeded} ${t.compressSuccessEnd}`;
} else if (succeeded > 0) {
$('compressStatus').textContent = `⚠️ ${succeeded} done, ${failed} failed`;
} else {
$('compressStatus').textContent = `❌ All ${failed} files failed`;
}
const resultsEl = $('compressResults');
const header = document.createElement('div');
header.className = 'compress-header';
header.innerHTML = `
<span class="compress-header-title">${t.resultsTitle}</span>
<button class="btn-dl-all" id="btnDlAll">⬇️ ${t.downloadAll}</button>
`;
resultsEl.insertBefore(header, resultsEl.firstChild);
$('btnDlAll').addEventListener('click', downloadAllCompressed);
resultsEl.style.display = 'block';
btn.disabled = false;
$('btnCompress').style.display = 'none';
$('btnCompressNew').style.display = 'flex';
const succeeded = done - failed;
if (failed === 0) {
showToast(`${t.compressSuccess} ${succeeded} ${t.compressSuccessEnd}`, 'success');
} else if (succeeded > 0) {
showToast(`⚠️ ${succeeded} done, ${failed} failed`, 'error');
} else {
showToast(`❌ All ${failed} files failed`, 'error');
}
const ntcp = $('nextToolsCompress');
if (ntcp) ntcp.style.display = 'block';
}
}).catch(err => {
done++;
failed++;
showToast(friendlyError(err, file.name), 'error');
});
});
}
function downloadAllCompressed() {
blobsC.forEach((item, i) => {
if (!item) return;
dlBlob(item.blob, item.name.replace(/\.[^/.]+$/, '') + '_compressed.' + item.ext, i * 600);
});
}
function initBaSlider(wrap) {
if (wrap._baInit) return;
wrap._baInit = true;
const afterEl = wrap.querySelector('.ba-after');
const divider = wrap.querySelector('.ba-divider');
const handle = wrap.querySelector('.ba-handle');
const sliderWrap = wrap.closest('.ba-slider-wrap');
const hint = sliderWrap ? sliderWrap.querySelector('.ba-hint') : null;
let dragging = false;
let everDragged = false;
function setPos(pct) {
pct = Math.max(2, Math.min(98, pct));
afterEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
divider.style.left = pct + '%';
handle.style.left = pct + '%';
}
function getPos(e) {
const rect = wrap.getBoundingClientRect();
const clientX = e.touches ? e.touches[0].clientX : e.clientX;
return Math.round(((clientX - rect.left) / rect.width) * 100);
}
function onStart(e) {
dragging = true;
wrap.classList.add('dragging');
setPos(getPos(e));
if (!everDragged && hint) { everDragged = true; hint.classList.add('hidden'); }
}
wrap.addEventListener('mousedown', onStart);
wrap.addEventListener('touchstart', onStart, { passive: true });
window.addEventListener('mousemove', e => { if (dragging) setPos(getPos(e)); });
window.addEventListener('touchmove', e => { if (dragging) setPos(getPos(e)); }, { passive: true });
window.addEventListener('mouseup', () => { dragging = false; wrap.classList.remove('dragging'); });
window.addEventListener('touchend', () => { dragging = false; wrap.classList.remove('dragging'); });
setPos(50);
}
function _baIntroAnim(wrap) {
if (wrap._baIntro) return;
wrap._baIntro = true;
const afterEl = wrap.querySelector('.ba-after');
const divider = wrap.querySelector('.ba-divider');
const handle = wrap.querySelector('.ba-handle');
function setRaw(pct) {
if (wrap.classList.contains('dragging')) return;
afterEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
divider.style.left = pct + '%';
handle.style.left = pct + '%';
}
setTimeout(() => setRaw(75), 200);
setTimeout(() => setRaw(28), 800);
setTimeout(() => setRaw(50), 1150);
}
function resetCompress() {
urlsC.forEach(u => URL.revokeObjectURL(u));
urlsC = [];
filesC = [];
blobsC = [];
$('uploadC').value = '';
$('fileCountC').textContent = '';
$('compressStatus').textContent = '';
$('compressResults').style.display = 'none';
$('compressResults').innerHTML = '';
$('uploadAreaC').querySelector('strong').textContent = T[currentLang].uploadTitleC;
$('progressWrapC').style.display = 'none';
$('progressFillC').style.width = '0%';
$('progressPctC').textContent = '0%';
$('btnCompressNew').style.display = 'none';
$('btnCompress').style.display = 'flex';
$('btnCompress').disabled = false;
const ntcp = $('nextToolsCompress');
if (ntcp) ntcp.style.display = 'none';
}
const SMART_MODE_SETTINGS = {
light: { quality: 82, label: '✨ Light', desc: 'Minimal compression, max quality' },
balanced: { quality: 65, label: '⚖️ Balanced', desc: 'Best quality/size ratio' },
maximum: { quality: 35, label: '🚀 Maximum', desc: 'Smallest file, good quality' },
};
function setSmartMode(mode) {
const setting = SMART_MODE_SETTINGS[mode];
if (!setting) return;
const slider = $('compressQual');
if (slider) {
slider.value = setting.quality;
updateCompressQuality(slider);
}
if (_compressMode !== 'quality') setCompressMode('quality');
document.querySelectorAll('.smart-mode-btn').forEach(btn => {
btn.classList.toggle('active', btn.dataset.mode === mode);
});
}