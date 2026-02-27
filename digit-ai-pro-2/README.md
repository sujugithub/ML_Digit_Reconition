# DIGIT·AI PRO — Apple-Level Handwriting Recognition

A professional, modern digit recognition website built to Apple design standards.
Real CNN trained on MNIST · Runs entirely in the browser · No server needed.

---

## 🚀 Quick Start

### Open in VS Code
```
File → Open Folder → select digit-ai-pro/
```

### Run with Live Server
1. Install **Live Server** extension
2. Right-click `index.html` → **Open with Live Server**

> A local server is required because the MNIST data fetches from a CDN.

### Or use Python
```bash
python3 -m http.server 5500
# visit http://localhost:5500
```

---

## 📁 Project Structure

```
digit-ai-pro/
│
├── index.html                    ← Semantic HTML, clean structure
│
├── css/
│   ├── reset.css                 ← Minimal modern reset
│   ├── tokens.css                ← ALL design variables (colours, spacing, fonts)
│   ├── layout.css                ← Page grid, topbar, network panel
│   ├── components.css            ← Every UI component styled
│   └── animations.css            ← All keyframes + page-load stagger
│
└── js/
    ├── core/
    │   ├── model.js              ← 🔑 Real MNIST CNN (TensorFlow.js)
    │   └── preprocessor.js       ← Canvas → 28×28 MNIST format
    │
    ├── visual/
    │   └── networkRenderer.js    ← Neural network animation
    │                                Blue = positive weights
    │                                Red  = negative weights
    │
    ├── ui/
    │   ├── theme.js              ← Dark/light mode + localStorage
    │   ├── canvas.js             ← Drawing input
    │   └── resultsUI.js          ← Results display (display-only)
    │
    └── app.js                    ← Orchestrator — wires everything
```

---

## 🎨 Changing the Theme

All design tokens are in `css/tokens.css`.

```css
/* Change accent colour */
--accent: #00f0ff;       /* cyan (dark mode) */
--accent: #0099cc;       /* blue (light mode) */

/* Change fonts */
--font-display: 'Bebas Neue', sans-serif;
--font-body:    'Outfit', sans-serif;
--font-mono:    'DM Mono', monospace;

/* Change spacing (8px grid) */
--sp-4: 16px;   /* base unit */
```

---

## 🧠 CNN Architecture

Matches the **784 → 16 → 16 → 10** visualization:

```
Input: (28, 28, 1)
  │
Conv2D(16 filters, 3×3, relu, same)
MaxPooling2D(2×2)
  │
Conv2D(16 filters, 3×3, relu, same)
MaxPooling2D(2×2)
  │
Flatten → Dense(16, relu) → Dropout(0.2)
  │
Dense(10, softmax)   ← probability per digit
```

---

## ⌨️ Keyboard Shortcuts

| Key      | Action                  |
|----------|-------------------------|
| `Enter`  | Predict                 |
| `Escape` | Clear canvas            |
| `N`      | Toggle network panel    |

---

## 🔧 Customizing the Model

Edit `js/core/model.js`:

```js
// Change epochs (more = more accurate, slower first train)
const EPOCHS = 10;

// Change layer sizes
m.add(tf.layers.dense({ units: 64, activation: 'relu' }));
```

---

## ✏️ Tips for Best Accuracy

- Draw digits **large and centered**
- Use **thick strokes** (slide PEN up)
- Write simply — MNIST is printed, not cursive
- The model saves nothing — retrain on refresh
