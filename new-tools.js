'use strict';
function _loadImageToCanvas(file, canvas, callback) {
const reader = new FileReader();
reader.onload = (e) => {
const img = new Image();
img.onload = () => callback(img);
img.src = e.target.result;
};
reader.readAsDataURL(file);
}
function _downloadCanvas(canvas, filename) {
const link = document.createElement('a');
link.download = filename;
link.href = canvas.toDataURL('image/png');
link.click();
}
function _setupDragDrop(uploadAreaId, handler) {
const area = document.getElementById(uploadAreaId);
if (!area) return;
area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
area.addEventListener('drop', (e) => {
e.preventDefault();
area.classList.remove('drag-over');
const f = e.dataTransfer.files[0];
if (f && f.type.startsWith('image/')) handler(f);
});
}
let _wmImage = null;
let _wmFileName = 'image';
function handleWatermarkFile(file) {
if (!file) return;
_wmFileName = file.name.replace(/\.[^.]+$/, '');
_loadImageToCanvas(file, document.getElementById('wmCanvas'), (img) => {
_wmImage = img;
document.getElementById('uploadAreaWatermark').style.display = 'none';
document.getElementById('wmControlsWrap').style.display = 'block';
renderWatermarkPreview();
});
}
function renderWatermarkPreview() {
if (!_wmImage) return;
const canvas = document.getElementById('wmCanvas');
const ctx = canvas.getContext('2d');
const text = document.getElementById('wmText').value || '© Watermark';
const fontSize= parseInt(document.getElementById('wmFont').value) || 36;
const opacity = parseInt(document.getElementById('wmOpacity').value) / 100;
const color = document.getElementById('wmColor').value;
const pos = document.getElementById('wmPosition').value;
const angle = (parseInt(document.getElementById('wmAngle').value) || 0) * Math.PI / 180;
canvas.width = _wmImage.naturalWidth;
canvas.height = _wmImage.naturalHeight;
ctx.drawImage(_wmImage, 0, 0);
ctx.save();
ctx.globalAlpha = opacity;
ctx.fillStyle = color;
ctx.font = `bold ${fontSize}px sans-serif`;
ctx.textBaseline = 'middle';
const pad = fontSize * 0.8;
const tw = ctx.measureText(text).width;
const th = fontSize;
if (pos === 'tile') {
const stepX = tw + fontSize * 3;
const stepY = th + fontSize * 3;
for (let x = -stepX; x < canvas.width + stepX; x += stepX) {
for (let y = -stepY; y < canvas.height + stepY; y += stepY) {
ctx.save();
ctx.translate(x + tw / 2, y + th / 2);
ctx.rotate(angle || -0.5);
ctx.fillText(text, -tw / 2, 0);
ctx.restore();
}
}
} else {
let x, y;
if (pos === 'bottom-right') { x = canvas.width - tw - pad; y = canvas.height - th - pad; }
else if (pos === 'bottom-left') { x = pad; y = canvas.height - th - pad; }
else if (pos === 'top-right') { x = canvas.width - tw - pad; y = pad + th / 2; }
else if (pos === 'top-left') { x = pad; y = pad + th / 2; }
else { x = (canvas.width - tw) / 2; y = canvas.height / 2; }
ctx.save();
ctx.translate(x + tw / 2, y);
ctx.rotate(angle);
ctx.fillText(text, -tw / 2, 0);
ctx.restore();
}
ctx.restore();
}
function downloadWatermark() {
_downloadCanvas(document.getElementById('wmCanvas'), _wmFileName + '-watermarked.png');
}
function resetWatermark() {
_wmImage = null;
document.getElementById('uploadAreaWatermark').style.display = '';
document.getElementById('wmControlsWrap').style.display = 'none';
document.getElementById('uploadWatermark').value = '';
const canvas = document.getElementById('wmCanvas');
canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
_setupDragDrop('uploadAreaWatermark', handleWatermarkFile);
let _rotImage = null;
let _rotAngle = 0;
let _rotFileName = 'image';
function handleRotateFile(file) {
if (!file) return;
_rotAngle = 0;
_rotFileName = file.name.replace(/\.[^.]+$/, '');
document.getElementById('rotateAngle').value = 0;
document.getElementById('rotateAngleVal').textContent = '0°';
_loadImageToCanvas(file, document.getElementById('rotateCanvas'), (img) => {
_rotImage = img;
document.getElementById('uploadAreaRotate').style.display = 'none';
document.getElementById('rotateControlsWrap').style.display = 'block';
renderRotatePreview();
});
}
function applyRotate(deg) {
_rotAngle = ((_rotAngle + deg) % 360 + 360) % 360;
const display = _rotAngle > 180 ? _rotAngle - 360 : _rotAngle;
document.getElementById('rotateAngle').value = display;
document.getElementById('rotateAngleVal').textContent = display + '°';
_drawRotate(_rotAngle * Math.PI / 180);
}
function renderRotatePreview() {
const deg = parseInt(document.getElementById('rotateAngle').value) || 0;
_rotAngle = ((deg % 360) + 360) % 360;
_drawRotate(deg * Math.PI / 180);
}
function _drawRotate(rad) {
if (!_rotImage) return;
const canvas = document.getElementById('rotateCanvas');
const ctx = canvas.getContext('2d');
const w = _rotImage.naturalWidth, h = _rotImage.naturalHeight;
const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
canvas.width = Math.round(w * cos + h * sin);
canvas.height = Math.round(w * sin + h * cos);
ctx.save();
ctx.translate(canvas.width / 2, canvas.height / 2);
ctx.rotate(rad);
ctx.drawImage(_rotImage, -w / 2, -h / 2);
ctx.restore();
}
function downloadRotate() {
_downloadCanvas(document.getElementById('rotateCanvas'), _rotFileName + '-rotated.png');
}
function resetRotate() {
_rotImage = null; _rotAngle = 0;
document.getElementById('uploadAreaRotate').style.display = '';
document.getElementById('rotateControlsWrap').style.display = 'none';
document.getElementById('uploadRotate').value = '';
}
_setupDragDrop('uploadAreaRotate', handleRotateFile);
let _flipImage = null;
let _flipH = false;
let _flipV = false;
let _flipFileName = 'image';
function handleFlipFile(file) {
if (!file) return;
_flipH = false; _flipV = false;
_flipFileName = file.name.replace(/\.[^.]+$/, '');
['btnFlipH','btnFlipV','btnFlipBoth'].forEach(id => document.getElementById(id).classList.remove('active'));
_loadImageToCanvas(file, document.getElementById('flipCanvas'), (img) => {
_flipImage = img;
document.getElementById('uploadAreaFlip').style.display = 'none';
document.getElementById('flipControlsWrap').style.display = 'block';
renderFlipPreview();
});
}
function toggleFlip(axis) {
if (axis === 'h') { _flipH = !_flipH; }
else if (axis === 'v') { _flipV = !_flipV; }
else { _flipH = !_flipH; _flipV = !_flipV; }
document.getElementById('btnFlipH').classList.toggle('active', _flipH);
document.getElementById('btnFlipV').classList.toggle('active', _flipV);
document.getElementById('btnFlipBoth').classList.toggle('active', _flipH && _flipV);
renderFlipPreview();
}
function renderFlipPreview() {
if (!_flipImage) return;
const canvas = document.getElementById('flipCanvas');
const ctx = canvas.getContext('2d');
canvas.width = _flipImage.naturalWidth;
canvas.height = _flipImage.naturalHeight;
ctx.save();
ctx.translate(_flipH ? canvas.width : 0, _flipV ? canvas.height : 0);
ctx.scale(_flipH ? -1 : 1, _flipV ? -1 : 1);
ctx.drawImage(_flipImage, 0, 0);
ctx.restore();
}
function downloadFlip() {
const suffix = _flipH && _flipV ? 'both' : _flipH ? 'horizontal' : _flipV ? 'vertical' : 'original';
_downloadCanvas(document.getElementById('flipCanvas'), _flipFileName + '-flipped-' + suffix + '.png');
}
function resetFlip() {
_flipImage = null; _flipH = false; _flipV = false;
document.getElementById('uploadAreaFlip').style.display = '';
document.getElementById('flipControlsWrap').style.display = 'none';
document.getElementById('uploadFlip').value = '';
}
_setupDragDrop('uploadAreaFlip', handleFlipFile);
let _metaData = {};
function handleMetaFile(file) {
if (!file) return;
const reader = new FileReader();
reader.onload = (e) => {
const img = new Image();
img.onload = () => {
_metaData = {};
_metaData['File Name'] = file.name;
_metaData['File Size'] = _fmtBytes(file.size);
_metaData['File Type'] = file.type || 'Unknown';
_metaData['Last Modified'] = new Date(file.lastModified).toLocaleString();
_metaData['Width'] = img.naturalWidth + ' px';
_metaData['Height'] = img.naturalHeight + ' px';
_metaData['Aspect Ratio'] = _gcd(img.naturalWidth, img.naturalHeight, img.naturalWidth, img.naturalHeight);
_metaData['Megapixels'] = ((img.naturalWidth * img.naturalHeight) / 1_000_000).toFixed(2) + ' MP';
_metaData['Color Space'] = file.type === 'image/jpeg' ? 'YCbCr / sRGB' : 'sRGB';
if (file.type === 'image/jpeg') {
_parseExif(e.target.result, _metaData, () => _showMeta(img));
} else {
_showMeta(img);
}
};
img.src = e.target.result;
};
reader.readAsDataURL(file);
}
function _showMeta(img) {
document.getElementById('uploadAreaMeta').style.display = 'none';
document.getElementById('metaResultWrap').style.display = 'block';
const summary = document.getElementById('metaSummaryRow');
summary.innerHTML = `
<div class="meta-summary-card"><span class="meta-summary-icon">📐</span><strong>${_metaData['Width']} × ${_metaData['Height']}</strong><small>Dimensions</small></div>
<div class="meta-summary-card"><span class="meta-summary-icon">💾</span><strong>${_metaData['File Size']}</strong><small>File Size</small></div>
<div class="meta-summary-card"><span class="meta-summary-icon">🎞️</span><strong>${_metaData['File Type'].replace('image/','').toUpperCase()}</strong><small>Format</small></div>
<div class="meta-summary-card"><span class="meta-summary-icon">📷</span><strong>${_metaData['Megapixels']}</strong><small>Megapixels</small></div>
`;
const tbody = document.getElementById('metaTableBody');
tbody.innerHTML = '';
for (const [key, val] of Object.entries(_metaData)) {
const tr = document.createElement('tr');
tr.innerHTML = `<td>${key}</td><td>${val}</td>`;
tbody.appendChild(tr);
}
}
function _parseExif(dataUrl, out, done) {
try {
const base64 = dataUrl.split(',')[1];
const binary = atob(base64);
const buf = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
const view = new DataView(buf.buffer);
if (view.getUint16(0) !== 0xFFD8) { done(); return; }
let offset = 2;
while (offset < buf.length) {
const marker = view.getUint16(offset);
offset += 2;
if (marker === 0xFFE1) {
const segLen = view.getUint16(offset);
const exifStr = String.fromCharCode(...buf.slice(offset + 2, offset + 6));
if (exifStr === 'Exif') {
_readIFD(view, offset + 8, out);
}
offset += segLen;
} else if ((marker & 0xFF00) === 0xFF00) {
offset += view.getUint16(offset);
} else { break; }
}
} catch (e) { }
done();
}
const EXIF_TAGS = {
0x010F: 'Camera Make', 0x0110: 'Camera Model', 0x0112: 'Orientation',
0x011A: 'X Resolution', 0x011B: 'Y Resolution', 0x0128: 'Resolution Unit',
0x0131: 'Software', 0x0132: 'Date/Time', 0x013B: 'Artist',
0x8769: 'EXIF Sub-IFD', 0x8825: 'GPS Info',
0x829A: 'Exposure Time', 0x829D: 'F-Number', 0x8827: 'ISO Speed',
0x9003: 'Date Original', 0x9004: 'Date Digitized', 0x9201: 'Shutter Speed',
0x9202: 'Aperture', 0x9203: 'Brightness', 0x9205: 'Max Aperture',
0x9207: 'Metering Mode', 0x9208: 'Light Source', 0x9209: 'Flash',
0x920A: 'Focal Length', 0xA001: 'Color Space', 0xA002: 'Pixel Width',
0xA003: 'Pixel Height', 0xA402: 'Exposure Mode', 0xA403: 'White Balance',
0xA405: 'Focal Length 35mm', 0xA406: 'Scene Type',
};
function _readIFD(view, start, out) {
try {
const littleEndian = view.getUint16(start) === 0x4949;
const ifdOffset = view.getUint32(start + 4, littleEndian);
const base = start;
const count = view.getUint16(base + ifdOffset, littleEndian);
for (let i = 0; i < count; i++) {
const off = base + ifdOffset + 2 + i * 12;
const tag = view.getUint16(off, littleEndian);
const type = view.getUint16(off + 2, littleEndian);
const cnt = view.getUint32(off + 4, littleEndian);
const name = EXIF_TAGS[tag];
if (!name || name === 'EXIF Sub-IFD' || name === 'GPS Info') continue;
try {
let val = _readExifValue(view, off + 8, type, cnt, base, littleEndian);
if (val !== null && val !== undefined) out[name] = String(val);
} catch (e) { }
}
} catch (e) { }
}
function _readExifValue(view, offset, type, count, base, le) {
const totalBytes = [0,1,1,2,4,8,1,1,2,4,8,4,8][type] * count;
const valOffset = totalBytes > 4 ? base + view.getUint32(offset, le) : offset;
if (type === 2) {
let s = '';
for (let i = 0; i < count - 1; i++) s += String.fromCharCode(view.getUint8(valOffset + i));
return s;
}
if (type === 3) return view.getUint16(valOffset, le);
if (type === 4) return view.getUint32(valOffset, le);
if (type === 5) {
const num = view.getUint32(valOffset, le);
const den = view.getUint32(valOffset + 4, le);
return den ? (num / den).toFixed(4) : num + '/0';
}
if (type === 10) {
const num = view.getInt32(valOffset, le);
const den = view.getInt32(valOffset + 4, le);
return den ? (num / den).toFixed(4) : num + '/0';
}
return null;
}
function _fmtBytes(b) {
if (b < 1024) return b + ' B';
if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
return (b / 1024 / 1024).toFixed(2) + ' MB';
}
function _gcd(w, h) {
let a = w, b = h;
while (b) { [a, b] = [b, a % b]; }
return (w / a) + ':' + (h / a);
}
function copyMetaJSON() {
const json = JSON.stringify(_metaData, null, 2);
navigator.clipboard.writeText(json).then(() => {
if (typeof showToast === 'function') showToast('📋 Metadata copied as JSON', 'success');
}).catch(() => {
const ta = document.createElement('textarea');
ta.value = json; document.body.appendChild(ta); ta.select();
document.execCommand('copy'); document.body.removeChild(ta);
if (typeof showToast === 'function') showToast('📋 Copied!', 'success');
});
}
function resetMeta() {
_metaData = {};
document.getElementById('uploadAreaMeta').style.display = '';
document.getElementById('metaResultWrap').style.display = 'none';
document.getElementById('uploadMeta').value = '';
}
_setupDragDrop('uploadAreaMeta', handleMetaFile);