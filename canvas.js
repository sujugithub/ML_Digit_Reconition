/**
 * js/ui/canvas.js
 * ──────────────────────────────────────
 * Handles all drawing input on the canvas.
 * Smooth quadratic interpolation for strokes.
 *
 * Public:
 *   CanvasManager.clear()
 *   CanvasManager.hasDrawn   (bool)
 *   CanvasManager.getCanvas() → HTMLCanvasElement
 */

const CanvasManager = (() => {

  let _canvas   = null;
  let _ctx      = null;
  let _drawing  = false;
  let _hasDrawn = false;
  let _lx       = 0, _ly = 0;

  function init(canvasId) {
    _canvas = document.getElementById(canvasId);
    _ctx    = _canvas.getContext('2d');
    _initCtx();
    _bind();
  }

  function _initCtx() {
    _ctx.fillStyle   = '#020408';
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    _ctx.strokeStyle = '#ffffff';
    _ctx.lineCap     = 'round';
    _ctx.lineJoin    = 'round';
    _ctx.shadowColor = 'rgba(255,255,255,0.28)';
    _ctx.shadowBlur  = 2;
  }

  function _brushSize() {
    return parseInt(document.getElementById('brushSize')?.value ?? '20', 10);
  }

  function _getPos(e) {
    const r = _canvas.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return [s.clientX - r.left, s.clientY - r.top];
  }

  function _bind() {
    _canvas.addEventListener('mousedown',  _start);
    _canvas.addEventListener('mousemove',  _move);
    _canvas.addEventListener('mouseup',    _end);
    _canvas.addEventListener('mouseleave', _end);
    _canvas.addEventListener('touchstart', e => { e.preventDefault(); _start(e); }, { passive: false });
    _canvas.addEventListener('touchmove',  e => { e.preventDefault(); _move(e);  }, { passive: false });
    _canvas.addEventListener('touchend',   _end);
  }

  function _start(e) {
    _drawing  = true;
    _hasDrawn = true;
    [_lx, _ly] = _getPos(e);

    // Draw dot for single tap/click
    const s = _brushSize();
    _ctx.beginPath();
    _ctx.arc(_lx, _ly, s / 2, 0, Math.PI * 2);
    _ctx.fillStyle = '#ffffff'; _ctx.fill();

    document.getElementById('canvasRing')?.classList.add('is-drawing');
    document.getElementById('canvasOverlay')?.classList.add('is-hidden');
  }

  function _move(e) {
    if (!_drawing) return;
    const [x, y] = _getPos(e);
    _ctx.lineWidth = _brushSize();
    _ctx.beginPath();
    _ctx.moveTo(_lx, _ly);
    const mx = (_lx + x) / 2, my = (_ly + y) / 2;
    _ctx.quadraticCurveTo(_lx, _ly, mx, my);
    _ctx.lineTo(x, y);
    _ctx.stroke();
    [_lx, _ly] = [x, y];
  }

  function _end() {
    _drawing = false;
    document.getElementById('canvasRing')?.classList.remove('is-drawing');
  }

  function clear() {
    _ctx.fillStyle = '#020408';
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    _hasDrawn = false;
    document.getElementById('canvasOverlay')?.classList.remove('is-hidden');
  }

  return {
    init,
    clear,
    get hasDrawn() { return _hasDrawn; },
    getCanvas() { return _canvas; },
  };

})();
