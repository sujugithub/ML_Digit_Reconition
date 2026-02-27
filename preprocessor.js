/**
 * js/core/preprocessor.js
 * ──────────────────────────────────────
 * Canvas → 28×28 MNIST-ready image.
 *
 * Pipeline:
 *   1. Scan for drawn pixels
 *   2. Crop to tight bounding box
 *   3. Add 22% padding
 *   4. Resize + center onto 28×28 black canvas
 */

const Preprocessor = (() => {

  /**
   * @param {HTMLCanvasElement} src  Any size drawing canvas
   * @returns {HTMLCanvasElement}    28×28 ready for model
   */
  function prepare(src) {
    const ctx  = src.getContext('2d');
    const W    = src.width, H = src.height;
    const pix  = ctx.getImageData(0, 0, W, H).data;

    // Bounding box
    let x0 = W, y0 = H, x1 = 0, y1 = 0, found = false;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (pix[(y * W + x) * 4] > 20) {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y);
          x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          found = true;
        }
      }
    }

    const out = _blank28();
    if (!found) return out;

    const bw  = x1 - x0, bh = y1 - y0;
    const pad = Math.max(bw, bh) * 0.22;
    const sx  = Math.max(0, x0 - pad);
    const sy  = Math.max(0, y0 - pad);
    const sw  = Math.min(W - sx, bw + pad * 2);
    const sh  = Math.min(H - sy, bh + pad * 2);

    const sc    = Math.min(20 / sw, 20 / sh);
    const dw    = sw * sc, dh = sh * sc;
    const dx    = (28 - dw) / 2, dy = (28 - dh) / 2;

    out.getContext('2d').drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
    return out;
  }

  /** True if nothing has been drawn */
  function isEmpty(canvas) {
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 20) return false;
    return true;
  }

  function _blank28() {
    const c = document.createElement('canvas');
    c.width = c.height = 28;
    c.getContext('2d').fillStyle = '#000';
    c.getContext('2d').fillRect(0, 0, 28, 28);
    return c;
  }

  return { prepare, isEmpty };

})();
