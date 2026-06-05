'use strict';
let pdfPageBlobs = [];
function handlePDF(e) {
const file = e.target.files[0];
if (!file) return;
loadPDF(file);
}
document.addEventListener('DOMContentLoaded', () => {
const uploadAreaPDF = document.getElementById('uploadAreaPDF');
uploadAreaPDF.addEventListener('dragover', e => {
e.preventDefault(); uploadAreaPDF.classList.add('drag-over');
});
uploadAreaPDF.addEventListener('dragleave', () => uploadAreaPDF.classList.remove('drag-over'));
uploadAreaPDF.addEventListener('drop', e => {
e.preventDefault(); uploadAreaPDF.classList.remove('drag-over');
const f = e.dataTransfer.files[0];
if (f && f.type === 'application/pdf') loadPDF(f);
else showToast(T[currentLang].pdfAlert, 'error');
});
});
async function loadPDF(file) {
const t = T[currentLang];
try {
await loadScript('pdfjs');
} catch(e) {
showToast('Failed to load PDF library. Check connection.', 'error');
return;
}
pdfPageBlobs = [];
document.getElementById('pdfPagesGrid').innerHTML = '';
document.getElementById('pdfStatus').textContent = '';
document.getElementById('pdfInfoBar').style.display = 'none';
document.getElementById('pdfFormatRow').style.display = 'none';
document.getElementById('btnPdfNew').style.display = 'none';
document.getElementById('progressWrapPDF').style.display = 'block';
document.getElementById('progressFillPDF').style.width = '0%';
document.getElementById('progressPctPDF').textContent = '0%';
uploadAreaPDF.querySelector('strong').textContent = `📄 ${file.name}`;
try {
const arrayBuffer = await file.arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
const numPages = pdf.numPages;
const infoBar = document.getElementById('pdfInfoBar');
document.getElementById('pdfInfoText').innerHTML =
`📄 <strong>${file.name}</strong> &nbsp;·&nbsp; <strong>${numPages}</strong> ${t.pdfInfo}`;
infoBar.style.display = 'flex';
document.getElementById('pdfFormatRow').style.display = 'flex';
const grid = document.getElementById('pdfPagesGrid');
const format = document.getElementById('pdfOutFormat').value;
const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
for (let i = 1; i <= numPages; i++) {
const page = await pdf.getPage(i);
const viewport = page.getViewport({ scale: 2 });
const canvas = document.createElement('canvas');
canvas.width = viewport.width;
canvas.height = viewport.height;
const ctx = canvas.getContext('2d');
if (format === 'image/jpeg') {
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
}
await page.render({ canvasContext: ctx, viewport }).promise;
const blob = await new Promise(res => canvas.toBlob(res, format, 0.92));
pdfPageBlobs[i - 1] = { blob, ext, name: `page_${i}` };
const thumbCanvas = document.createElement('canvas');
const thumbW = 130, thumbH = Math.round(viewport.height / viewport.width * thumbW);
thumbCanvas.width = thumbW * 2; thumbCanvas.height = thumbH * 2;
thumbCanvas.style.width = thumbW + 'px'; thumbCanvas.style.height = thumbH + 'px';
const thumbCtx = thumbCanvas.getContext('2d');
thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
const card = document.createElement('div');
card.className = 'pdf-page-card';
thumbCanvas.className = 'pdf-page-canvas';
card.appendChild(thumbCanvas);
const footer = document.createElement('div');
footer.className = 'pdf-page-footer';
footer.innerHTML = `<span class="pdf-page-num">${t.pdfPage} ${i}</span>`;
const dlBtn = document.createElement('button');
dlBtn.className = 'btn-dl-page';
dlBtn.textContent = `⬇️`;
dlBtn.title = t.pdfDownload;
dlBtn.addEventListener('click', () => {
dlBlob(pdfPageBlobs[i-1].blob, `page_${i}.${ext}`);
});
footer.appendChild(dlBtn);
card.appendChild(footer);
grid.appendChild(card);
const pct = Math.round(i / numPages * 100);
document.getElementById('progressFillPDF').style.width = pct + '%';
document.getElementById('progressPctPDF').textContent = pct + '%';
}
document.getElementById('progressWrapPDF').style.display = 'none';
document.getElementById('pdfStatus').textContent =
`${t.pdfSuccess} ${numPages} ${t.pdfSuccessEnd}`;
document.getElementById('btnPdfNew').style.display = 'flex';
showToast(`${t.pdfSuccess} ${numPages} ${t.pdfSuccessEnd}`, 'success');
document.getElementById('btnDlAllPages').onclick = () => {
const fmt = document.getElementById('pdfOutFormat').value;
const ex = fmt === 'image/jpeg' ? 'jpg' : fmt === 'image/webp' ? 'webp' : 'png';
pdfPageBlobs.forEach((item, idx) => {
if (item) dlBlob(item.blob, `page_${idx+1}.${ex}`, idx * 400);
});
};
} catch (err) {
showToast('Error reading PDF. Try another file.', 'error');
document.getElementById('progressWrapPDF').style.display = 'none';
}
}
function resetPdf() {
pdfPageBlobs = [];
document.getElementById('uploadPDF').value = '';
document.getElementById('pdfPagesGrid').innerHTML = '';
document.getElementById('pdfStatus').textContent = '';
document.getElementById('pdfInfoBar').style.display = 'none';
document.getElementById('pdfFormatRow').style.display = 'none';
document.getElementById('progressWrapPDF').style.display = 'none';
document.getElementById('btnPdfNew').style.display = 'none';
document.getElementById('uploadAreaPDF').querySelector('strong').textContent =
T[currentLang].uploadTitlePdf;
}