/**
 * js/core/model.js
 * ─────────────────────────────────────────────
 * Real CNN trained on MNIST.
 *
 * Architecture (784 → 16 → 16 → 10):
 *   Input:    28×28×1
 *   Conv2D(16, 3×3, relu) + MaxPool(2×2)
 *   Conv2D(16, 3×3, relu) + MaxPool(2×2)
 *   Flatten → Dense(16, relu) → Dense(10, softmax)
 *
 * This matches the architecture shown in the network viz.
 *
 * Usage:
 *   await MnistModel.train(callbacks)
 *   const result = MnistModel.predict(canvas28)
 *   const acts   = MnistModel.getActivations(canvas28)
 */

const MnistModel = (() => {

  /* ── Config ───────────────────────────────── */
  const IMG_SIZE    = 784;
  const NUM_CLASSES = 10;
  const NUM_TRAIN   = 55000;  // ← full MNIST training set (was 5500)
  const NUM_TEST    = 5000;   // ← full test slice (was 1000)
  const EPOCHS      = 10;     // ← more epochs = higher accuracy (was 5)
  const BATCH_SIZE  = 128;    // ← larger batch = faster GPU utilisation

  const IMAGES_URL = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png';
  const LABELS_URL = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8';

  /* ── State ────────────────────────────────── */
  let _model    = null;
  let _trained  = false;
  let _training = false;

  /* ── Public API ──────────────────────────── */

  /**
   * Train the CNN on MNIST.
   * @param {Object} cbs  Callbacks:
   *   onDataProgress(msg, pct)
   *   onEpoch(epoch, total, acc, loss, valAcc)
   *   onDone(finalAcc)
   *   onError(err)
   */
  async function train(cbs = {}) {
    if (_training) return;
    _training = true;

    try {
      const data = await _loadData(cbs.onDataProgress || (() => {}));
      _model = _buildModel();

      const xs  = tf.tensor4d(data.trainX, [NUM_TRAIN, 28, 28, 1]);
      const ys  = tf.tensor2d(data.trainY, [NUM_TRAIN, NUM_CLASSES]);
      const txs = tf.tensor4d(data.testX,  [NUM_TEST,  28, 28, 1]);
      const tys = tf.tensor2d(data.testY,  [NUM_TEST,  NUM_CLASSES]);

      await _model.fit(xs, ys, {
        epochs:         EPOCHS,
        batchSize:      BATCH_SIZE,
        validationData: [txs, tys],
        shuffle:        true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (cbs.onEpoch) cbs.onEpoch(
              epoch + 1, EPOCHS,
              logs.acc      ?? 0,
              logs.loss     ?? 0,
              logs.val_acc  ?? 0,
            );
          },
        },
      });

      [xs, ys, txs, tys].forEach(t => t.dispose());

      // Quick final eval
      const evalXs = tf.tensor4d(data.testX.slice(0, 500 * IMG_SIZE), [500, 28, 28, 1]);
      const evalYs = tf.tensor2d(data.testY.slice(0, 500 * NUM_CLASSES), [500, NUM_CLASSES]);
      const [, accTensor] = _model.evaluate(evalXs, evalYs);
      const finalAcc = accTensor.dataSync()[0];
      [evalXs, evalYs, accTensor].forEach(t => t.dispose());

      _trained  = true;
      _training = false;
      if (cbs.onDone) cbs.onDone(finalAcc);

    } catch (err) {
      _training = false;
      if (cbs.onError) cbs.onError(err);
      else console.error('Training error:', err);
    }
  }

  /**
   * Predict digit from a 28×28 canvas element.
   * @returns {{ digit, probs, top5 }}
   */
  function predict(canvas28) {
    if (!_trained) throw new Error('Model not trained.');

    return tf.tidy(() => {
      const t     = _toTensor(canvas28);
      const probs = _model.predict(t).dataSync();
      const arr   = Array.from(probs);

      const top5 = arr
        .map((p, i) => ({ digit: i, prob: p, pct: Math.round(p * 100) }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 5);

      return { digit: top5[0].digit, probs: arr, top5 };
    });
  }

  /**
   * Get intermediate layer activations for viz.
   * Returns array of compact float[] per layer.
   */
  function getActivations(canvas28) {
    if (!_model) return [];

    return tf.tidy(() => {
      const t = _toTensor(canvas28);

      // Pick visualizable layers
      const vizLayers = _model.layers.filter(l =>
        l.name.includes('conv2d') || l.name.includes('dense')
      );
      if (!vizLayers.length) return [];

      const actModel = tf.model({
        inputs:  _model.input,
        outputs: vizLayers.map(l => l.output),
      });

      const outs = actModel.predict(t);
      const arr  = Array.isArray(outs) ? outs : [outs];

      return arr.map(tensor => _compactActivation(tensor));
    });
  }

  /* Is the model trained? */
  function isReady() { return _trained; }

  /* ── Private ─────────────────────────────── */

  function _buildModel() {
    const m = tf.sequential();

    // Conv Block 1  → 16 filters
    m.add(tf.layers.conv2d({
      inputShape: [28, 28, 1],
      kernelSize: 3, filters: 16,
      activation: 'relu', padding: 'same',
    }));
    m.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    // Conv Block 2  → 16 filters
    m.add(tf.layers.conv2d({
      kernelSize: 3, filters: 16,
      activation: 'relu', padding: 'same',
    }));
    m.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    // Dense Head  → matches 784→16→16→10 display
    m.add(tf.layers.flatten());
    m.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    m.add(tf.layers.dropout({ rate: 0.2 }));
    m.add(tf.layers.dense({ units: 10, activation: 'softmax' }));

    m.compile({
      optimizer: tf.train.adam(0.001),
      loss:      'categoricalCrossentropy',
      metrics:   ['accuracy'],
    });
    return m;
  }

  async function _loadData(onProgress) {
    onProgress('Fetching MNIST images…', 10);
    const [imgRes, lblRes] = await Promise.all([
      fetch(IMAGES_URL),
      fetch(LABELS_URL),
    ]);

    onProgress('Decoding image sprite…', 35);
    const imgBlob   = await imgRes.blob();
    const bitmap    = await createImageBitmap(imgBlob);
    const tmp       = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
    tmp.getContext('2d').drawImage(bitmap, 0, 0);
    const pix       = tmp.getContext('2d').getImageData(0, 0, bitmap.width, bitmap.height).data;
    const nImages   = bitmap.width * bitmap.height / IMG_SIZE;
    const imgData   = new Float32Array(nImages * IMG_SIZE);
    for (let i = 0; i < imgData.length; i++) imgData[i] = pix[i * 4] / 255;

    onProgress('Decoding labels…', 60);
    const lblBuf = await lblRes.arrayBuffer();
    const labels = new Uint8Array(lblBuf);

    onProgress('Splitting dataset…', 80);
    return {
      trainX: imgData.slice(0, NUM_TRAIN * IMG_SIZE),
      trainY: labels.slice(0, NUM_TRAIN * NUM_CLASSES),
      testX:  imgData.slice(NUM_TRAIN * IMG_SIZE, (NUM_TRAIN + NUM_TEST) * IMG_SIZE),
      testY:  labels.slice(NUM_TRAIN * NUM_CLASSES, (NUM_TRAIN + NUM_TEST) * NUM_CLASSES),
    };
  }

  function _toTensor(canvas28) {
    return tf.browser.fromPixels(canvas28, 1)
      .toFloat().div(255).reshape([1, 28, 28, 1]);
  }

  /**
   * Compress a layer's activation tensor to a flat vector
   * of up to 16 values, normalised 0–1.
   */
  function _compactActivation(tensor) {
    const data  = tensor.dataSync();
    const shape = tensor.shape;

    let summary;
    if (shape.length === 4) {
      const [, H, W, F] = shape;
      const n   = Math.min(F, 16);   // up to 16 — matches hidden layer size
      summary   = Array.from({ length: n }, (_, f) => {
        let sum = 0;
        for (let h = 0; h < H; h++)
          for (let w = 0; w < W; w++)
            sum += data[h * W * F + w * F + f];
        return sum / (H * W);
      });
    } else {
      summary = Array.from(data.slice(0, 16));
    }

    const max = Math.max(...summary, 0.0001);
    return summary.map(v => v / max);
  }

  return { train, predict, getActivations, isReady };

})();
