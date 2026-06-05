'use strict';
/* ══════════════════════════════════════════
   ImgSwift — Interactive Crop Tool
   Supports: free drag, aspect-ratio presets,
   pixel inputs, touch & mouse
══════════════════════════════════════════ */

(function () {

  /* ── State ── */
  let _img      = null;   // original Image object
  let _fileName = 'cropped';
  let _fileType = 'image/jpeg';

  // crop rect in IMAGE pixels
  let cx = 0, cy = 0, cw = 100, ch = 100;

  // display scale: canvas CSS px / image px
  let _scale = 1;

  // aspect lock
  let _aspect = null; // null = free, number = w/h

  // drag state
  let _drag = null; // { type:'create'|'move'|'resize', handle, startX,startY, origCx,origCy,origCw,origCh }

  /* ── DOM refs (lazy) ── */
  function canvas()  { return document.getElementById('cropCanvas');  }
  function overlay() { return document.getElementById('cropOverlay'); }
  function wrap()    { return document.getElementById('cropCanvasWrap'); }

  /* ══════════════════════════════
     Public: handleCropFile
  ══════════════════════════════ */
  window.handleCropFile = function (file) {
    if (!file) return;
    _fileName = file.name.replace(/\.[^.]+$/, '');
    _fileType = file.type || 'image/jpeg';

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      _img = img;
      initCropUI();
    };
    img.src = url;

    // show upload area feedback
    const area = document.getElementById('uploadAreaCrop');
    if (area) { area.querySelector('strong').textContent = file.name; }
  };

  /* ══════════════════════════════
     Init / reset
  ══════════════════════════════ */
  function initCropUI() {
    document.getElementById('cropControlsWrap').style.display = '';

    const c  = canvas();
    const ov = overlay();

    // Fit canvas to container (max 700px wide)
    const maxW = Math.min(wrap().parentElement.clientWidth || 600, 700);
    _scale = Math.min(1, maxW / _img.naturalWidth);

    c.width  = Math.round(_img.naturalWidth  * _scale);
    c.height = Math.round(_img.naturalHeight * _scale);
    ov.width  = c.width;
    ov.height = c.height;
    ov.style.width  = c.width  + 'px';
    ov.style.height = c.height + 'px';

    // Draw image on canvas
    const ctx = c.getContext('2d');
    ctx.drawImage(_img, 0, 0, c.width, c.height);

    // Default crop = full image
    cx = 0; cy = 0;
    cw = _img.naturalWidth;
    ch = _img.naturalHeight;
    syncInputs();
    drawOverlay();
    attachEvents();
  }

  window.resetCrop = function () {
    _img = null;
    document.getElementById('cropControlsWrap').style.display = 'none';
    const area = document.getElementById('uploadAreaCrop');
    if (area) {
      area.querySelector('strong').textContent = 'Click or drag an image here';
    }
    document.getElementById('uploadCrop').value = '';
    // clear preset highlight
    document.querySelectorAll('[id^=cropPreset]').forEach(b => b.classList.remove('active'));
  };

  /* ══════════════════════════════
     Presets
  ══════════════════════════════ */
  window.setCropPreset = function (preset) {
    // highlight
    document.querySelectorAll('[id^=cropPreset]').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('cropPreset' + preset.replace(':','x'));
    if (btn) btn.classList.add('active');

    if (preset === 'free') {
      _aspect = null;
    } else {
      const parts = preset.split(':');
      _aspect = parseFloat(parts[0]) / parseFloat(parts[1]);
      // Re-apply aspect to current crop width
      ch = Math.round(cw / _aspect);
      if (cy + ch > _img.naturalHeight) {
        ch = _img.naturalHeight - cy;
        cw = Math.round(ch * _aspect);
      }
      syncInputs();
      drawOverlay();
    }
  };

  /* ══════════════════════════════
     Pixel inputs → update rect
  ══════════════════════════════ */
  window.updateCropFromInputs = function () {
    if (!_img) return;
    cx = clamp(parseInt(document.getElementById('cropX').value)||0, 0, _img.naturalWidth  - 1);
    cy = clamp(parseInt(document.getElementById('cropY').value)||0, 0, _img.naturalHeight - 1);
    cw = clamp(parseInt(document.getElementById('cropW').value)||1, 1, _img.naturalWidth  - cx);
    ch = clamp(parseInt(document.getElementById('cropH').value)||1, 1, _img.naturalHeight - cy);
    drawOverlay();
  };

  function syncInputs() {
    document.getElementById('cropX').value = Math.round(cx);
    document.getElementById('cropY').value = Math.round(cy);
    document.getElementById('cropW').value = Math.round(cw);
    document.getElementById('cropH').value = Math.round(ch);
  }

  /* ══════════════════════════════
     Draw overlay
  ══════════════════════════════ */
  function drawOverlay() {
    const ov  = overlay();
    const ctx = ov.getContext('2d');
    const W = ov.width, H = ov.height;

    ctx.clearRect(0, 0, W, H);

    // dimmed outside
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);

    // clear inside crop rect
    const rx = cx * _scale, ry = cy * _scale;
    const rw = cw * _scale, rh = ch * _scale;
    ctx.clearRect(rx, ry, rw, rh);

    // border
    ctx.strokeStyle = '#4f8ef7';
    ctx.lineWidth   = 2;
    ctx.strokeRect(rx, ry, rw, rh);

    // rule-of-thirds grid
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 1;
    for (let i = 1; i < 3; i++) {
      const x = rx + rw * i / 3, y = ry + rh * i / 3;
      ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + rh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + rw, y); ctx.stroke();
    }

    // corner handles
    const hs = 10;
    ctx.fillStyle = '#4f8ef7';
    const corners = [
      [rx,      ry     ],
      [rx+rw,   ry     ],
      [rx,      ry+rh  ],
      [rx+rw,   ry+rh  ],
    ];
    corners.forEach(([hx, hy]) => {
      ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
    });

    // edge handles
    const edges = [
      [rx + rw/2, ry       ],
      [rx + rw/2, ry + rh  ],
      [rx,        ry + rh/2],
      [rx + rw,   ry + rh/2],
    ];
    edges.forEach(([hx, hy]) => {
      ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
    });

    // size label
    ctx.fillStyle = '#4f8ef7';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${Math.round(cw)} × ${Math.round(ch)}`, rx + 6, ry + 16);
  }

  /* ══════════════════════════════
     Hit-test: what did user click?
  ══════════════════════════════ */
  function hitTest(mx, my) {
    // mx,my in CANVAS display px
    const rx = cx * _scale, ry = cy * _scale;
    const rw = cw * _scale, rh = ch * _scale;
    const hs = 12;

    // corners
    const corners = [
      { name:'nw', x: rx,      y: ry      },
      { name:'ne', x: rx+rw,   y: ry      },
      { name:'sw', x: rx,      y: ry+rh   },
      { name:'se', x: rx+rw,   y: ry+rh   },
    ];
    for (const c of corners) {
      if (Math.abs(mx - c.x) < hs && Math.abs(my - c.y) < hs) return { type:'resize', handle: c.name };
    }

    // edges
    const edges = [
      { name:'n',  x: rx+rw/2, y: ry      },
      { name:'s',  x: rx+rw/2, y: ry+rh   },
      { name:'w',  x: rx,      y: ry+rh/2 },
      { name:'e',  x: rx+rw,   y: ry+rh/2 },
    ];
    for (const e of edges) {
      if (Math.abs(mx - e.x) < hs && Math.abs(my - e.y) < hs) return { type:'resize', handle: e.name };
    }

    // inside
    if (mx > rx && mx < rx+rw && my > ry && my < ry+rh) return { type:'move' };

    // outside = create new
    return { type:'create' };
  }

  /* ══════════════════════════════
     Cursor
  ══════════════════════════════ */
  function cursorFor(hit) {
    if (!hit) return 'crosshair';
    const map = { move:'move', nw:'nw-resize', ne:'ne-resize', sw:'sw-resize', se:'se-resize', n:'n-resize', s:'s-resize', w:'w-resize', e:'e-resize', create:'crosshair' };
    return map[hit.handle || hit.type] || 'crosshair';
  }

  /* ══════════════════════════════
     Events
  ══════════════════════════════ */
  function attachEvents() {
    const ov = overlay();
    // remove old listeners by replacing element
    const fresh = ov.cloneNode(true);
    ov.parentNode.replaceChild(fresh, ov);
    const o = overlay();

    o.addEventListener('mousedown',  onDown);
    o.addEventListener('mousemove',  onHover);
    o.addEventListener('mouseup',    onUp);
    o.addEventListener('mouseleave', onUp);
    o.addEventListener('touchstart', onTouchStart, { passive: false });
    o.addEventListener('touchmove',  onTouchMove,  { passive: false });
    o.addEventListener('touchend',   onUp);
  }

  function getPos(e) {
    const r = overlay().getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onHover(e) {
    if (_drag) return;
    const { x, y } = getPos(e);
    overlay().style.cursor = cursorFor(hitTest(x, y));
  }

  function onDown(e) {
    e.preventDefault();
    const { x, y } = getPos(e);
    const hit = hitTest(x, y);
    _drag = { ...hit, startX: x, startY: y, origCx: cx, origCy: cy, origCw: cw, origCh: ch };
    overlay().style.cursor = cursorFor(hit);
  }

  function onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    onDown({ preventDefault:()=>{}, clientX: t.clientX, clientY: t.clientY });
  }

  function onTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    onMove({ clientX: t.clientX, clientY: t.clientY });
  }

  function onUp() { _drag = null; }

  function onMove(e) {
    if (!_drag || !_img) return;
    const { x, y } = getPos(e);
    const dx = (x - _drag.startX) / _scale;
    const dy = (y - _drag.startY) / _scale;
    const IW = _img.naturalWidth, IH = _img.naturalHeight;

    if (_drag.type === 'move') {
      cx = clamp(_drag.origCx + dx, 0, IW - cw);
      cy = clamp(_drag.origCy + dy, 0, IH - ch);

    } else if (_drag.type === 'create') {
      const ix = _drag.startX / _scale, iy = _drag.startY / _scale;
      let nx = ix, ny = iy, nw = dx, nh = dy;
      if (nw < 0) { nx = ix + nw; nw = -nw; }
      if (nh < 0) { ny = iy + nh; nh = -nh; }
      if (_aspect) nh = nw / _aspect;
      cx = clamp(nx, 0, IW); cy = clamp(ny, 0, IH);
      cw = clamp(nw, 1, IW - cx); ch = clamp(nh, 1, IH - cy);

    } else if (_drag.type === 'resize') {
      let { origCx:nx, origCy:ny, origCw:nw, origCh:nh } = _drag;
      const h = _drag.handle;

      if (h.includes('e')) { nw = Math.max(1, _drag.origCw + dx); }
      if (h.includes('s')) { nh = Math.max(1, _drag.origCh + dy); }
      if (h.includes('w')) { const diff = Math.min(dx, _drag.origCw - 1); nx = _drag.origCx + diff; nw = _drag.origCw - diff; }
      if (h.includes('n')) { const diff = Math.min(dy, _drag.origCh - 1); ny = _drag.origCy + diff; nh = _drag.origCh - diff; }

      if (_aspect) {
        if (h === 'n' || h === 's') nw = nh * _aspect;
        else nh = nw / _aspect;
      }

      cx = clamp(nx, 0, IW);
      cy = clamp(ny, 0, IH);
      cw = clamp(nw, 1, IW - cx);
      ch = clamp(nh, 1, IH - cy);
    }

    syncInputs();
    drawOverlay();
  }

  overlay().addEventListener && overlay().addEventListener('mousemove', onMove);

  // re-attach move on document to handle drag outside
  document.addEventListener('mousemove', function(e) {
    if (_drag) onMove(e);
  });

  /* ══════════════════════════════
     Apply Crop & Download
  ══════════════════════════════ */
  window.applyCrop = function () {
    if (!_img) return;
    const out = document.createElement('canvas');
    out.width  = Math.round(cw);
    out.height = Math.round(ch);
    const ctx = out.getContext('2d');
    ctx.drawImage(_img, Math.round(cx), Math.round(cy), Math.round(cw), Math.round(ch), 0, 0, out.width, out.height);

    const ext   = _fileType === 'image/png' ? 'png' : _fileType === 'image/webp' ? 'webp' : 'jpg';
    const qual  = _fileType === 'image/png' ? undefined : 0.92;
    out.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = _fileName + '_cropped.' + ext;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, _fileType, qual);
  };

  /* ══════════════════════════════
     Helpers
  ══════════════════════════════ */
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /* ══════════════════════════════
     Drag & Drop on upload area
  ══════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    const area = document.getElementById('uploadAreaCrop');
    if (!area) return;
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) window.handleCropFile(file);
    });
  });

})();
