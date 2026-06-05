'use strict';
/* ══════════════════════════════════════════
   ImgSwift — Background Remover (Batch)
   Uses @huggingface/transformers@3.5.0
   100% browser-based, no server, free forever
══════════════════════════════════════════ */

(function () {

  /* ══════════════════════════════
     State
  ══════════════════════════════ */
  let _pipeline    = null;  // cached AI pipeline
  let _processing  = false;
  let _bgColor     = 'transparent';

  // Batch queue: array of { file, status, resultBlob }
  let _queue       = [];
  let _currentIdx  = -1;

  /* ══════════════════════════════
     Public: handleBgFile (single)
  ══════════════════════════════ */
  window.handleBgFile = function (file) {
    if (!file) return;
    addToQueue([file]);
  };

  /* ══════════════════════════════
     Public: handleBgFiles (batch)
  ══════════════════════════════ */
  window.handleBgFiles = function (files) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) return;
    addToQueue(arr);
  };

  /* ══════════════════════════════
     Add files to queue & start
  ══════════════════════════════ */
  function addToQueue(files) {
    if (_processing) return;

    _queue = files.map(f => ({ file: f, status: 'pending', resultBlob: null }));
    _currentIdx = 0;
    _bgColor = 'transparent';

    showUploadArea(false);
    showBatchUI(true);
    renderQueueList();
    processNext();
  }

  /* ══════════════════════════════
     Process next in queue
  ══════════════════════════════ */
  async function processNext() {
    if (_currentIdx >= _queue.length) {
      onAllDone();
      return;
    }

    _processing = true;
    const item = _queue[_currentIdx];
    item.status = 'processing';
    renderQueueList();
    updateBatchProgress();

    setMsg(`Processing ${_currentIdx + 1} of ${_queue.length}: ${item.file.name}`);
    setProgress(0);

    try {
      // Load library once
      if (!window._transformers) {
        setMsg('Loading AI library…');
        const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0/dist/transformers.min.js');
        window._transformers = mod;
      }

      const { pipeline, env } = window._transformers;
      env.allowRemoteModels = true;
      env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0/dist/';

      // Load pipeline once and cache
      if (!_pipeline) {
        setMsg('Loading AI model (first time ~30s)…');
        _pipeline = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
          device: 'wasm',
          dtype: 'fp32',
          progress_callback: (p) => {
            if (p.status === 'downloading') {
              const pct = p.progress ? Math.round(p.progress * 0.4) + 5 : 5;
              setProgress(Math.min(pct, 50));
              setMsg(`Downloading model… ${p.progress ? Math.round(p.progress) + '%' : ''}`);
            }
          }
        });
      }

      setProgress(55);
      setMsg(`Removing background (${_currentIdx + 1}/${_queue.length})…`);

      // Run model
      const objectUrl = URL.createObjectURL(item.file);
      const result = await _pipeline(objectUrl);
      URL.revokeObjectURL(objectUrl);

      setProgress(85);

      // Convert result mask to PNG blob
      const maskInput = result[0].mask;
      if (maskInput && maskInput.data) {
        item.resultBlob = await rawImageToBlob(maskInput, item.file);
      } else {
        item.resultBlob = await applyMask(item.file, maskInput);
      }

      item.status = 'done';
      setProgress(100);

    } catch (err) {
      console.error('BG removal error:', err);
      item.status = 'error';
      item.error = err.message || 'Unknown error';
      _pipeline = null; // reset on error
    }

    renderQueueList();
    updateBatchProgress();

    _currentIdx++;
    _processing = false;

    // Small delay between images to let browser breathe
    setTimeout(processNext, 200);
  }

  /* ══════════════════════════════
     All done
  ══════════════════════════════ */
  function onAllDone() {
    const doneCount  = _queue.filter(i => i.status === 'done').length;
    const errorCount = _queue.filter(i => i.status === 'error').length;

    setMsg(`✅ Done! ${doneCount} image${doneCount !== 1 ? 's' : ''} processed${errorCount ? `, ${errorCount} failed` : ''}.`);
    setProgress(100);

    // Show download all button if more than 1 success
    const dlAllBtn = document.getElementById('bgDownloadAllBtn');
    if (dlAllBtn) dlAllBtn.style.display = doneCount > 1 ? '' : 'none';

    // Show preview of first successful result
    const first = _queue.find(i => i.status === 'done');
    if (first) showSinglePreview(first);
  }

  /* ══════════════════════════════
     Show preview of one result
  ══════════════════════════════ */
  async function showSinglePreview(item) {
    const resultWrap = document.getElementById('bgResultWrap');
    if (!resultWrap) return;

    // Original
    const origImg = document.getElementById('bgOriginalImg');
    if (origImg) origImg.src = URL.createObjectURL(item.file);

    // Result canvas
    await renderBlobToCanvas(item.resultBlob);
    resultWrap.style.display = '';
  }

  /* ══════════════════════════════
     Render blob to bgCanvas
  ══════════════════════════════ */
  async function renderBlobToCanvas(blob) {
    if (!blob) return;
    const img = await blobToImage(blob);
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (_bgColor !== 'transparent') {
      ctx.fillStyle = _bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    const wrap = document.getElementById('bgResultCanvas');
    if (wrap) {
      if (_bgColor === 'transparent') {
        wrap.style.backgroundImage = `
          linear-gradient(45deg,#ccc 25%,transparent 25%),
          linear-gradient(-45deg,#ccc 25%,transparent 25%),
          linear-gradient(45deg,transparent 75%,#ccc 75%),
          linear-gradient(-45deg,transparent 75%,#ccc 75%)`;
        wrap.style.backgroundSize = '16px 16px';
        wrap.style.backgroundPosition = '0 0,0 8px,8px -8px,-8px 0';
      } else {
        wrap.style.backgroundImage = 'none';
        wrap.style.backgroundColor = _bgColor;
      }
    }
  }

  /* ══════════════════════════════
     Render queue list in UI
  ══════════════════════════════ */
  function renderQueueList() {
    const list = document.getElementById('bgQueueList');
    if (!list) return;

    list.innerHTML = _queue.map((item, i) => {
      const icon = item.status === 'done'       ? '✅'
                 : item.status === 'error'      ? '❌'
                 : item.status === 'processing' ? '⏳'
                 : '🕐';

      const name = item.file.name.length > 28
        ? item.file.name.slice(0, 25) + '…'
        : item.file.name;

      const dlBtn = item.status === 'done'
        ? `<button onclick="bgDownloadOne(${i})" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:1px solid var(--accent,#4f8ef7);background:transparent;color:var(--accent,#4f8ef7);cursor:pointer;">⬇ Save</button>`
        : '';

      const errMsg = item.status === 'error'
        ? `<span style="font-size:0.7rem;color:#f77;margin-left:6px;">${item.error || ''}</span>`
        : '';

      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border,#2a2a3a);">
        <span style="font-size:1.1rem;">${icon}</span>
        <span style="flex:1;font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
        ${errMsg}
        ${dlBtn}
      </div>`;
    }).join('');
  }

  /* ══════════════════════════════
     Update overall batch progress
  ══════════════════════════════ */
  function updateBatchProgress() {
    const done  = _queue.filter(i => i.status === 'done' || i.status === 'error').length;
    const total = _queue.length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

    const counter = document.getElementById('bgBatchCounter');
    if (counter) counter.textContent = `${done} / ${total}`;

    const fill = document.getElementById('bgBatchProgressFill');
    if (fill) fill.style.width = pct + '%';
  }

  /* ══════════════════════════════
     Public: Download one result
  ══════════════════════════════ */
  window.bgDownloadOne = function (idx) {
    const item = _queue[idx];
    if (!item || !item.resultBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(item.resultBlob);
    a.download = item.file.name.replace(/\.[^.]+$/, '') + '_no_bg.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  /* ══════════════════════════════
     Public: Download single (from preview)
  ══════════════════════════════ */
  window.downloadBg = function () {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const first = _queue.find(i => i.status === 'done');
    const name = first ? first.file.name.replace(/\.[^.]+$/, '') : 'image';
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name + '_no_bg.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  };

  /* ══════════════════════════════
     Public: Download all as ZIP
  ══════════════════════════════ */
  window.bgDownloadAll = async function () {
    const done = _queue.filter(i => i.status === 'done');
    if (done.length === 0) return;

    const btn = document.getElementById('bgDownloadAllBtn');
    if (btn) btn.textContent = '⏳ Preparing ZIP…';

    // Use JSZip if available, else download one by one
    if (window.JSZip) {
      const zip = new window.JSZip();
      for (const item of done) {
        const name = item.file.name.replace(/\.[^.]+$/, '') + '_no_bg.png';
        const buf = await item.resultBlob.arrayBuffer();
        zip.file(name, buf);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'imgswift_no_bg.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } else {
      // Fallback: download one by one
      for (let i = 0; i < done.length; i++) {
        const item = done[i];
        const a = document.createElement('a');
        a.href = URL.createObjectURL(item.resultBlob);
        a.download = item.file.name.replace(/\.[^.]+$/, '') + '_no_bg.png';
        a.click();
        await new Promise(r => setTimeout(r, 400));
        URL.revokeObjectURL(a.href);
      }
    }

    if (btn) btn.textContent = '⬇️ Download All (ZIP)';
  };

  /* ══════════════════════════════
     Public: setBgColor
  ══════════════════════════════ */
  window.setBgColor = function (color) {
    _bgColor = color;
    document.querySelectorAll('.bg-preset-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.bg-preset-btn[data-color="${color}"]`);
    if (btn) btn.classList.add('active');
    // Re-render preview
    const first = _queue.find(i => i.status === 'done');
    if (first) renderBlobToCanvas(first.resultBlob);
  };

  /* ══════════════════════════════
     Public: resetBg
  ══════════════════════════════ */
  window.resetBg = function () {
    _queue      = [];
    _currentIdx = -1;
    _processing = false;
    _bgColor    = 'transparent';

    showUploadArea(true);
    showBatchUI(false);

    document.getElementById('bgResultWrap').style.display  = 'none';
    document.getElementById('bgLoadingWrap').style.display = 'none';

    const area = document.getElementById('uploadAreaBg');
    if (area) {
      const strong = area.querySelector('strong');
      const small  = area.querySelector('small');
      if (strong) strong.textContent = 'Click or drag images here';
      if (small)  small.textContent  = 'JPG, PNG, WebP — up to 20 images at once';
    }
    const input = document.getElementById('uploadBg');
    if (input) input.value = '';

    document.querySelectorAll('.bg-preset-btn').forEach(b => b.classList.remove('active'));
    const trans = document.querySelector('.bg-preset-btn[data-color="transparent"]');
    if (trans) trans.classList.add('active');
  };

  /* ══════════════════════════════
     UI helpers
  ══════════════════════════════ */
  function showUploadArea(show) {
    const area = document.getElementById('uploadAreaBg');
    if (area) area.style.display = show ? '' : 'none';
  }

  function showBatchUI(show) {
    const el = document.getElementById('bgBatchWrap');
    if (el) el.style.display = show ? '' : 'none';
  }

  function setProgress(pct) {
    const fill = document.getElementById('bgProgressFill');
    if (fill) fill.style.width = pct + '%';
  }

  function setMsg(msg) {
    const el = document.getElementById('bgLoadingMsg');
    if (el) el.textContent = msg;
  }

  /* ══════════════════════════════
     Apply mask (v2 blob path)
  ══════════════════════════════ */
  async function applyMask(originalFile, mask) {
    const origImg = await blobToImage(originalFile);
    const maskImg = await blobToImage(mask);
    const canvas  = document.createElement('canvas');
    canvas.width  = origImg.naturalWidth;
    canvas.height = origImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(origImg, 0, 0);
    const imageData  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width  = origImg.naturalWidth;
    maskCanvas.height = origImg.naturalHeight;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = maskData.data[i];
    }
    ctx.putImageData(imageData, 0, 0);
    return new Promise(res => canvas.toBlob(res, 'image/png'));
  }

  /* ══════════════════════════════
     Convert RawImage (v3.x) to masked blob
  ══════════════════════════════ */
  async function rawImageToBlob(rawMask, originalFile) {
    const origImg = await blobToImage(originalFile);
    const canvas  = document.createElement('canvas');
    canvas.width  = origImg.naturalWidth;
    canvas.height = origImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(origImg, 0, 0);
    const imageData  = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width  = rawMask.width;
    maskCanvas.height = rawMask.height;
    const maskCtx     = maskCanvas.getContext('2d');
    const channels    = rawMask.channels || 1;
    const maskImgData = maskCtx.createImageData(rawMask.width, rawMask.height);
    for (let i = 0; i < rawMask.width * rawMask.height; i++) {
      const val = rawMask.data[i * channels];
      maskImgData.data[i * 4]     = val;
      maskImgData.data[i * 4 + 1] = val;
      maskImgData.data[i * 4 + 2] = val;
      maskImgData.data[i * 4 + 3] = 255;
    }
    maskCtx.putImageData(maskImgData, 0, 0);

    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width  = canvas.width;
    scaledCanvas.height = canvas.height;
    const scaledCtx = scaledCanvas.getContext('2d');
    scaledCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    const scaledMask = scaledCtx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = scaledMask.data[i];
    }
    ctx.putImageData(imageData, 0, 0);
    return new Promise(res => canvas.toBlob(res, 'image/png'));
  }

  /* ══════════════════════════════
     blobToImage helper
  ══════════════════════════════ */
  function blobToImage(blob) {
    return new Promise((res, rej) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload  = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Image load failed')); };
      img.src = url;
    });
  }

  /* ══════════════════════════════
     Drag & Drop — supports multiple files
  ══════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    const area  = document.getElementById('uploadAreaBg');
    const input = document.getElementById('uploadBg');

    if (!area) return;

    // Enable multiple file selection
    if (input) input.multiple = true;

    area.addEventListener('dragover', e => {
      e.preventDefault();
      area.classList.add('drag-over');
    });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) window.handleBgFiles(files);
    });
  });

})();
