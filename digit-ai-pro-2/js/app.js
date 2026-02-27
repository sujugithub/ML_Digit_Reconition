/**
 * js/app.js — Main Orchestrator
 * ──────────────────────────────────────────────
 * Boots all modules and wires events together.
 * This is the ONLY file that knows about all others.
 *
 * Boot order:
 *   ThemeManager → CanvasManager → ResultsUI
 *   → NetworkRenderer → bind events → ready
 *
 * Predict flow:
 *   click → showThinking → preprocess
 *   → model.predict → model.getActivations
 *   → animateNetwork → showResults
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Boot ──────────────────────────────── */

  ThemeManager.init();
  CanvasManager.init('drawCanvas');
  ResultsUI.buildBars();
  ResultsUI.reset();
  ResultsUI.setStatus('', 'Not trained');

  // Init network after layout is painted
  requestAnimationFrame(() => {
    NetworkRenderer.init('netCanvas');
  });

  // Wait for TF.js
  tf.ready().then(() => {
    ResultsUI.setStatus('', 'Ready to train');
  }).catch(err => {
    ResultsUI.setStatus('rose', 'TF.js failed');
    console.error(err);
  });

  /* ── Network panel toggle ──────────────── */

  const networkPanel  = document.getElementById('networkPanel');
  const networkToggle = document.getElementById('networkToggle');

  function openNetwork() {
    networkPanel.classList.add('is-open');
    document.body.classList.add('network-open');
    networkToggle.setAttribute('aria-expanded', 'true');
    // Re-layout network canvas after panel animates in
    setTimeout(() => NetworkRenderer.init('netCanvas'), 300);
  }

  function closeNetwork() {
    networkPanel.classList.remove('is-open');
    document.body.classList.remove('network-open');
    networkToggle.setAttribute('aria-expanded', 'false');
  }

  // Start open
  openNetwork();

  networkToggle.addEventListener('click', () => {
    const isOpen = networkPanel.classList.contains('is-open');
    isOpen ? closeNetwork() : openNetwork();
  });

  /* ── Train ─────────────────────────────── */

  const trainBtn = document.getElementById('trainBtn');

  trainBtn.addEventListener('click', async () => {
    trainBtn.disabled = true;
    trainBtn.textContent = '⏳ Training…';
    ResultsUI.setProgress(0, 0, 5, null, null);

    await MnistModel.train({
      onDataProgress: (msg, pct) => {
        ResultsUI.setStatus('amber', msg);
        ResultsUI.setProgress(Math.round(pct * 0.5), 0, 5, null, null);
      },
      onEpoch: (ep, total, acc, loss, valAcc) => {
        const pct = 50 + Math.round((ep / total) * 50);
        ResultsUI.setStatus('amber', `Epoch ${ep}/${total} — ${(valAcc * 100).toFixed(1)}%`);
        ResultsUI.setProgress(pct, ep, total, acc, loss);
      },
      onDone: (finalAcc) => {
        const ap = Math.round(finalAcc * 100);
        ResultsUI.setStatus('green', `Ready · ${ap}% accuracy`);
        ResultsUI.setProgress(100, 5, 5, finalAcc, null);
        trainBtn.textContent = `✓ Trained  (${ap}%)`;
        trainBtn.disabled    = false;
        document.getElementById('predictBtn').disabled = false;
      },
      onError: (err) => {
        ResultsUI.setStatus('rose', 'Training failed');
        trainBtn.textContent = '⚠ Retry';
        trainBtn.disabled    = false;
        console.error(err);
      },
    });
  });

  /* ── Predict ───────────────────────────── */

  document.getElementById('predictBtn')
    .addEventListener('click', runPredict);

  async function runPredict() {
    if (!MnistModel.isReady()) {
      ResultsUI.showError('Train the model first ↙');
      return;
    }
    if (!CanvasManager.hasDrawn || Preprocessor.isEmpty(CanvasManager.getCanvas())) {
      ResultsUI.showError('Draw a digit first ←');
      return;
    }

    // 1. Thinking state
    ResultsUI.showThinking();
    NetworkRenderer.reset();
    ResultsUI.setStatus('cyan', 'Running inference…');

    await _sleep(180);

    // 2. Preprocess
    const canvas28 = Preprocessor.prepare(CanvasManager.getCanvas());

    // 3. Predict + activations
    let result, activations;
    try {
      result      = MnistModel.predict(canvas28);
      activations = MnistModel.getActivations(canvas28);
    } catch (err) {
      ResultsUI.setStatus('rose', 'Prediction error');
      ResultsUI.showError('Error: ' + err.message);
      return;
    }

    // 4. Build activation sets for renderer
    // 4. Build activation data for renderer
    const renderData = _buildRenderData(canvas28, activations, result.probs);

    // 5. Animate then reveal results
    NetworkRenderer.animate(renderData, () => {
      setTimeout(() => {
        ResultsUI.showResults(result);
        ResultsUI.setStatus('green',
          `Predicted: ${result.digit}  (${result.top5[0].pct}%)`);
      }, 150);
    });
  }

  /* ── Clear / Reset ─────────────────────── */

  document.getElementById('clearBtn')
    .addEventListener('click', _reset);

  document.getElementById('resetBtn')
    .addEventListener('click', _reset);

  function _reset() {
    CanvasManager.clear();
    NetworkRenderer.reset();
    ResultsUI.reset();
    if (MnistModel.isReady()) ResultsUI.setStatus('green', 'Model ready');
  }

  /* ── Keyboard shortcuts ─────────────────── */

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter')               runPredict();
    if (e.key === 'Escape' || e.key === 'Delete') _reset();
    if (e.key === 'n')                   networkToggle.click();
  });

  /* ── Helpers ──────────────────────────── */

  /**
   * Build the data object for NetworkRenderer.animate().
   *
   * inputPixels: 196 floats (14×14 sample of the 28×28 canvas)
   * h1Acts / h2Acts: 16 floats each from real model activations
   * outActs: 10 softmax probabilities
   */
  function _buildRenderData(canvas28, activations, probs) {
    // ── Input pixel grid ──────────────────────────────────────
    // Sample the 28×28 canvas down to 14×14 by averaging 2×2 blocks
    const pctx  = canvas28.getContext('2d');
    const imgD  = pctx.getImageData(0, 0, 28, 28).data;
    const px14  = [];
    for (let r = 0; r < 14; r++) {
      for (let c = 0; c < 14; c++) {
        const sr = r * 2, sc = c * 2;
        const avg = (
          imgD[((sr)   * 28 + sc)     * 4] +
          imgD[((sr)   * 28 + sc + 1) * 4] +
          imgD[((sr+1) * 28 + sc)     * 4] +
          imgD[((sr+1) * 28 + sc + 1) * 4]
        ) / (4 * 255);
        px14.push(avg);
      }
    }

    // ── Hidden activations ────────────────────────────────────
    // activations[] comes from model.getActivations() — one array per layer
    const h1Raw = activations[0] || [];
    const h2Raw = activations[1] || [];

    // Pad/trim to exactly 16 values
    const pad16 = (arr) => Array.from({ length: 16 }, (_, i) => arr[i] ?? 0);

    return {
      inputPixels: px14,
      h1Acts:      pad16(h1Raw),
      h2Acts:      pad16(h2Raw),
      outActs:     probs.slice(0, 10),
    };
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

});
