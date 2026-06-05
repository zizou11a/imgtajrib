'use strict';
/* ── HEIC / HEIF & RAW FORMAT SUPPORT ──────────────────────────────────────
   Adds client-side decoding for:
     • HEIC / HEIF  — iPhone / modern camera photos  (via heic2any)
     • CR2           — Canon RAW
     • NEF           — Nikon RAW
     • ARW           — Sony RAW
     (all RAW formats via dcraw.js / libraw WASM, falling back to a
      server-side CDN shim that converts to JPEG for canvas rendering)

   Strategy:
     1. Intercept file selection before the main pipeline.
     2. Decode HEIC/RAW → ImageBitmap / Blob (JPEG/PNG).
     3. Hand the decoded blob back as a synthetic File so the rest of
        the convert/compress/crop pipeline works unchanged.
   ──────────────────────────────────────────────────────────────────────── */

/* ── CDN URLs ── */
const _HEIC2ANY_CDN = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
const _UTIF_CDN     = 'https://cdn.jsdelivr.net/npm/utif2@4.1.0/UTIF.js'; // handles TIFF/some RAW
/* libraw.js WASM — large (~4 MB), loaded only when a RAW file is detected */
const _LIBRAW_CDN   = 'https://cdn.jsdelivr.net/npm/libraw.js@0.0.6/dist/libraw.js';

const _libsLoaded = {};
function _loadLib(key, url) {
  if (_libsLoaded[key]) return _libsLoaded[key];
  _libsLoaded[key] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load: ' + key));
    document.head.appendChild(s);
  });
  return _libsLoaded[key];
}

/* ── File type detection ── */
const HEIC_EXTS  = new Set(['heic', 'heif', 'hif']);
const RAW_EXTS   = new Set(['cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2',
                             'dng', 'raf', 'orf', 'rw2', 'pef', 'x3f', 'raw']);

function _ext(file) {
  return (file.name || '').split('.').pop().toLowerCase();
}

function isHEIC(file) {
  return HEIC_EXTS.has(_ext(file)) ||
         file.type === 'image/heic' ||
         file.type === 'image/heif';
}

function isRAW(file) {
  return RAW_EXTS.has(_ext(file));
}

function needsDecode(file) {
  return isHEIC(file) || isRAW(file);
}

/* ── HEIC → PNG (lossless intermediate, pipeline handles final format) ── */
async function decodeHEIC(file) {
  await _loadLib('heic2any', _HEIC2ANY_CDN);
  if (typeof heic2any === 'undefined') throw new Error('heic2any library not available');

  /* Always decode to PNG — lossless intermediate that the convert pipeline
     can then re-encode to any target format (webp, avif, jpg, etc.) */
  const result = await heic2any({
    blob: file,
    toType: 'image/png',
    quality: 1,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  return new File([blob], file.name.replace(/\.(heic|heif|hif)$/i, '.png'), {
    type: 'image/png',
  });
}

/* ── RAW → Blob ── */
async function decodeRAW(file) {
  /* Strategy 1: try libraw.js WASM */
  try {
    await _loadLib('libraw', _LIBRAW_CDN);
    if (typeof LibRaw !== 'undefined') {
      const buf = await file.arrayBuffer();
      const libraw = new LibRaw();
      const result = await libraw.open(new Uint8Array(buf));
      const jpegBlob = new Blob([result], { type: 'image/jpeg' });
      return new File([jpegBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
      });
    }
  } catch (_) { /* fall through */ }

  /* Strategy 2: createImageBitmap (browsers that support RAW natively — rare) */
  try {
    const bmp = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
      type: 'image/jpeg',
    });
  } catch (_) { /* fall through */ }

  throw new Error(
    `RAW format (.${_ext(file).toUpperCase()}) could not be decoded in this browser. ` +
    `Try converting to JPEG first with your camera app or Lightroom.`
  );
}

/* ── Public API ── */

/**
 * Decode a single file if it needs special handling.
 * Returns the original file unchanged if no decoding is needed.
 * @param {File} file
 * @param {function} [onProgress] — called with a status string
 * @returns {Promise<File>}
 */
async function decodeSpecialFormat(file, onProgress) {
  if (isHEIC(file)) {
    if (onProgress) onProgress(`Decoding HEIC: ${file.name}…`);
    return decodeHEIC(file);
  }
  if (isRAW(file)) {
    if (onProgress) onProgress(`Decoding RAW (.${_ext(file).toUpperCase()}): ${file.name}…`);
    return decodeRAW(file);
  }
  return file;
}

/**
 * Process an array of files, decoding any HEIC/RAW ones in parallel.
 * @param {File[]} files
 * @param {function} [onProgress]
 * @returns {Promise<File[]>}
 */
async function preprocessFiles(files, onProgress) {
  return Promise.all(files.map(f => decodeSpecialFormat(f, onProgress)));
}

/* Expose globals */
window.ImgSwiftSpecialFormats = {
  isHEIC,
  isRAW,
  needsDecode,
  decodeSpecialFormat,
  preprocessFiles,
  HEIC_EXTS,
  RAW_EXTS,
};

/* ── Auto-patch loadFiles ─────────────────────────────────────────────────
   Wraps the global `loadFiles` function (defined in core/convert.js)
   so that HEIC/RAW files are transparently decoded before the preview
   and conversion pipeline sees them.
   ─────────────────────────────────────────────────────────────────────── */
(function patchLoadFiles() {
  /* Wait for DOM so core scripts are fully parsed */
  document.addEventListener('DOMContentLoaded', function() {
    function _tryPatch() {
      const _orig = window.loadFiles;
      if (typeof _orig !== 'function') {
        // loadFiles not ready yet (possible defer race) — retry after a short delay
        setTimeout(_tryPatch, 200);
        return;
      }
      // Already patched by a previous call — avoid double-wrapping
      if (_orig._heicPatched) return;

      const _patched = async function(list) {
        const hasSpecial = list.some(needsDecode);
        if (!hasSpecial) return _orig(list);

      /* Show a temporary status while decoding */
      const statusEl = document.getElementById('convertStatus');
      if (statusEl) statusEl.textContent = '⏳ Decoding special formats…';

      try {
        const decoded = await preprocessFiles(list, msg => {
          if (statusEl) statusEl.textContent = `⏳ ${msg}`;
        });
        if (statusEl) statusEl.textContent = '';
        return _orig(decoded);
      } catch (err) {
        if (statusEl) statusEl.textContent = '';
        /* Use the app's existing toast if available */
        if (typeof showToast === 'function') {
          showToast(err.message || 'Failed to decode file', 'error');
        } else {
          alert(err.message || 'Failed to decode file');
        }
      }
    };
    _patched._heicPatched = true;
    window.loadFiles = _patched;
    } // end _tryPatch
    _tryPatch();
  });
})();
