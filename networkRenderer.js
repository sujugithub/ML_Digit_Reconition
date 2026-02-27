/**
 * js/visual/networkRenderer.js
 * TRUE 784 → 16 → 16 → 10 architecture.
 *
 * Input layer shown as a live 14×14 pixel preview of your drawing.
 * All 16 hidden nodes and all 10 output nodes drawn as glass spheres.
 *
 * Connection colours:
 *   BLUE  = positive weight
 *   RED   = negative weight
 *   Thickness = activation strength
 */

const NetworkRenderer = (() => {

  const H1  = 16;
  const H2  = 16;
  const OUT = 10;

  const R_HIDDEN  = 5;
  const R_OUTPUT  = 7;
  const PIX_COLS  = 14;
  const PIX_ROWS  = 14;
  const ANIM_DUR  = 280;
  const LAYER_GAP = 70;

  let _canvas = null;
  let _ctx    = null;
  let _raf    = null;
  let _h1Nodes  = [];
  let _h2Nodes  = [];
  let _outNodes = [];
  let _pixels   = [];

  function init(canvasId) {
    _canvas = document.getElementById(canvasId);
    _ctx    = _canvas.getContext('2d');
    _layout();
    _draw();
    new ResizeObserver(() => { _layout(); _draw(); })
      .observe(_canvas.parentElement);
  }

  function _layout() {
    const P = _canvas.parentElement;
    const W = P.clientWidth  || 260;
    const H = P.clientHeight || 500;
    _canvas.width  = W;
    _canvas.height = H;

    const cx = (i) => W * (i + 1) / 5;

    // pixel grid
    const cellW  = Math.min((W / 5) * 0.85 / PIX_COLS, H * 0.75 / PIX_ROWS, 9);
    const cellH  = cellW;
    const gridW  = cellW * PIX_COLS;
    const gridH  = cellH * PIX_ROWS;
    const gx0    = cx(0) - gridW / 2;
    const gy0    = H / 2 - gridH / 2;

    _pixels = [];
    for (let r = 0; r < PIX_ROWS; r++) {
      for (let c = 0; c < PIX_COLS; c++) {
        _pixels.push({
          x: gx0 + c * cellW + cellW / 2,
          y: gy0 + r * cellH + cellH / 2,
          w: cellW - 1,
          h: cellH - 1,
          val: 0,
        });
      }
    }

    _h1Nodes  = _makeNodes(H1,  cx(1), H);
    _h2Nodes  = _makeNodes(H2,  cx(2), H);
    _outNodes = _makeNodes(OUT, cx(3), H);
  }

  function _makeNodes(count, lx, H) {
    const gap = H / (count + 1);
    return Array.from({ length: count }, (_, i) => ({
      x: lx, y: gap * (i + 1), act: 0, target: 0, idx: i,
    }));
  }

  function _draw() {
    const W = _canvas.width, H = _canvas.height;
    _ctx.clearRect(0, 0, W, H);
    _drawEdges();
    _drawInputGrid();
    _drawNodes(_h1Nodes,  R_HIDDEN, false);
    _drawNodes(_h2Nodes,  R_HIDDEN, false);
    _drawNodes(_outNodes, R_OUTPUT, true);
    _drawLabels(W, H);
  }

  function _drawEdges() {
    // Input → H1: one line from grid centre per h1 node
    const midX = _pixels.length ? _pixels[Math.floor(_pixels.length / 2)].x : 0;
    const midY = _canvas.height / 2;
    _h1Nodes.forEach((hn, hi) => {
      if (hn.act < 0.04) {
        _faintLine(midX, midY, hn.x, hn.y);
        return;
      }
      _edge(midX, midY, hn.x, hn.y, hn.act, hi * 7);
    });

    // H1 → H2
    _h1Nodes.forEach((fn, fi) => {
      _h2Nodes.forEach((tn, ti) => {
        const s = (fn.act + tn.act) / 2;
        if (s < 0.03) { _faintLine(fn.x, fn.y, tn.x, tn.y); return; }
        _edge(fn.x, fn.y, tn.x, tn.y, s, fi * 100 + ti);
      });
    });

    // H2 → Output
    _h2Nodes.forEach((fn, fi) => {
      _outNodes.forEach((tn, ti) => {
        const s = (fn.act + tn.act) / 2;
        if (s < 0.03) { _faintLine(fn.x, fn.y, tn.x, tn.y); return; }
        _edge(fn.x, fn.y, tn.x, tn.y, s, fi * 100 + ti + 500);
      });
    });
  }

  function _faintLine(x1, y1, x2, y2) {
    _ctx.beginPath(); _ctx.moveTo(x1, y1); _ctx.lineTo(x2, y2);
    _ctx.strokeStyle = 'rgba(255,255,255,0.015)';
    _ctx.lineWidth = 0.25; _ctx.stroke();
  }

  function _edge(x1, y1, x2, y2, strength, seed) {
    const isPos = (seed * 2654435761 >>> 0) % 3 !== 0;
    const alpha = 0.04 + strength * 0.6;
    _ctx.beginPath(); _ctx.moveTo(x1, y1); _ctx.lineTo(x2, y2);
    _ctx.strokeStyle = isPos
      ? `rgba(0,200,255,${alpha})`
      : `rgba(255,60,90,${alpha})`;
    _ctx.lineWidth = 0.3 + strength * 1.5;
    _ctx.stroke();
  }

  function _drawInputGrid() {
    _pixels.forEach(p => {
      _ctx.fillStyle = p.val > 0.05
        ? `rgba(0,240,255,${0.1 + p.val * 0.9})`
        : 'rgba(255,255,255,0.03)';
      _ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
    });
    if (!_pixels.length) return;
    const f = _pixels[0], l = _pixels[_pixels.length - 1];
    const pad = 3;
    _ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    _ctx.lineWidth = 1;
    _ctx.strokeRect(
      f.x - f.w / 2 - pad, f.y - f.h / 2 - pad,
      (l.x - f.x) + f.w + pad * 2,
      (l.y - f.y) + f.h + pad * 2
    );
  }

  function _drawNodes(nodes, r, isOutput) {
    nodes.forEach(n => _sphere(n.x, n.y, r, n.act, isOutput ? n.idx : null));
  }

  function _sphere(x, y, r, act, label) {
    if (act > 0.1) {
      const hr = r * (2.5 + act * 4);
      const g  = _ctx.createRadialGradient(x, y, 0, x, y, hr);
      g.addColorStop(0,   `rgba(0,240,255,${act * 0.3})`);
      g.addColorStop(0.5, `rgba(0,240,255,${act * 0.06})`);
      g.addColorStop(1,   'transparent');
      _ctx.beginPath(); _ctx.arc(x, y, hr, 0, Math.PI * 2);
      _ctx.fillStyle = g; _ctx.fill();
    }

    const bg = _ctx.createRadialGradient(x - r*.3, y - r*.35, 0, x, y, r);
    if (act > 0.55) {
      bg.addColorStop(0,  'rgba(200,255,255,.95)');
      bg.addColorStop(.5, 'rgba(0,240,255,.85)');
      bg.addColorStop(1,  'rgba(0,120,190,.7)');
    } else if (act > 0.18) {
      bg.addColorStop(0, `rgba(50,130,200,${.35 + act * .45})`);
      bg.addColorStop(1, 'rgba(15,45,100,.5)');
    } else {
      bg.addColorStop(0, 'rgba(22,34,60,.65)');
      bg.addColorStop(1, 'rgba(8,12,28,.55)');
    }
    _ctx.beginPath(); _ctx.arc(x, y, r, 0, Math.PI * 2);
    _ctx.fillStyle = bg; _ctx.fill();

    _ctx.beginPath(); _ctx.arc(x, y, r, 0, Math.PI * 2);
    _ctx.strokeStyle = act > 0.2 ? `rgba(0,240,255,${act*.8})` : 'rgba(255,255,255,.06)';
    _ctx.lineWidth = 0.8; _ctx.stroke();

    _ctx.beginPath();
    _ctx.arc(x - r*.32, y - r*.36, r*.26, 0, Math.PI * 2);
    _ctx.fillStyle = `rgba(255,255,255,${.03 + act * .14})`; _ctx.fill();

    if (label !== null) {
      _ctx.fillStyle    = act > 0.35 ? 'rgba(0,240,255,.95)' : 'rgba(255,255,255,.2)';
      _ctx.font         = `bold ${act > 0.35 ? 9 : 7}px "DM Mono",monospace`;
      _ctx.textAlign    = 'center';
      _ctx.textBaseline = 'middle';
      _ctx.fillText(String(label), x, y);
    }
  }

  function _drawLabels(W, H) {
    const cols   = [W/5*1, W/5*2, W/5*3, W/5*4];
    const labels = ['INPUT\n784', 'HIDDEN\n16', 'HIDDEN\n16', 'OUTPUT\n10'];
    _ctx.fillStyle    = 'rgba(255,255,255,.11)';
    _ctx.font         = 'bold 6px "DM Mono",monospace';
    _ctx.textAlign    = 'center';
    _ctx.textBaseline = 'bottom';
    labels.forEach((lbl, i) => {
      lbl.split('\n').forEach((line, li, arr) => {
        _ctx.fillText(line, cols[i], H - 4 - (arr.length - 1 - li) * 10);
      });
    });
  }

  /**
   * Animate with real activation data.
   * @param {{ inputPixels, h1Acts, h2Acts, outActs }} data
   * @param {Function} onDone
   */
  function animate({ inputPixels, h1Acts, h2Acts, outActs }, onDone) {
    if (_raf) cancelAnimationFrame(_raf);

    if (inputPixels) _pixels.forEach((p, i) => { p.val = inputPixels[i] ?? 0; });

    const layers = [
      { nodes: _h1Nodes,  targets: h1Acts  || [] },
      { nodes: _h2Nodes,  targets: h2Acts  || [] },
      { nodes: _outNodes, targets: outActs || [] },
    ];

    let li = 0;
    function nextLayer() {
      if (li >= layers.length) { if (onDone) onDone(); return; }
      const { nodes, targets } = layers[li];
      nodes.forEach((n, i) => { n.target = Math.min(targets[i] ?? 0, 1); });
      const start = performance.now();
      function step(now) {
        const t    = Math.min((now - start) / ANIM_DUR, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        nodes.forEach(n => { n.act += (n.target - n.act) * ease; });
        _draw();
        if (t < 1) { _raf = requestAnimationFrame(step); }
        else { li++; setTimeout(nextLayer, LAYER_GAP); }
      }
      _raf = requestAnimationFrame(step);
    }
    nextLayer();
  }

  function reset() {
    if (_raf) cancelAnimationFrame(_raf);
    [..._h1Nodes, ..._h2Nodes, ..._outNodes].forEach(n => { n.act = 0; n.target = 0; });
    _pixels.forEach(p => { p.val = 0; });
    _draw();
  }

  return { init, animate, reset };
})();
