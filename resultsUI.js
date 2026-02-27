/**
 * js/ui/resultsUI.js
 * ──────────────────────────────────────
 * All DOM updates for results + training panels.
 * Never does any calculation — display only.
 */

const ResultsUI = (() => {

  /* ── Build digit bars once ──────────── */
  function buildBars() {
    const container = document.getElementById('probBars');
    if (!container) return;

    const title = document.createElement('div');
    title.className = 'prob-bars__title';
    title.textContent = 'All digits  0 – 9';
    container.appendChild(title);

    for (let d = 0; d < 10; d++) {
      const row = document.createElement('div');
      row.className = 'prob-row';
      row.innerHTML = `
        <span class="prob-row__digit" id="barNum${d}">${d}</span>
        <div  class="prob-row__track">
          <div class="prob-row__fill" id="barFill${d}"></div>
        </div>
        <span class="prob-row__pct" id="barPct${d}">—</span>
      `;
      container.appendChild(row);
    }
  }

  /* ── States ─────────────────────────── */

  function reset() {
    const card = document.getElementById('resultCard');
    card?.classList.remove('is-revealed');

    _setText('resultDigit', '—');
    _setText('resultConf',  'awaiting input');
    _setStyle('resultConf', 'color', 'var(--accent)');

    document.getElementById('resultScan')?.classList.remove('is-active');
    _clearBars();
  }

  function showThinking() {
    document.getElementById('resultCard')?.classList.remove('is-revealed');
    document.getElementById('resultScan')?.classList.add('is-active');

    const d = document.getElementById('resultDigit');
    if (d) d.innerHTML = '<span class="is-thinking">···</span>';

    const c = document.getElementById('resultConf');
    if (c) { c.innerHTML = '<span class="is-thinking">Running inference…</span>'; c.style.color = 'var(--accent)'; }

    _clearBars();
  }

  /**
   * Show final results.
   * @param {{ digit, probs, top5 }} result
   */
  function showResults(result) {
    const { probs, top5 } = result;
    const winner = top5[0];

    document.getElementById('resultScan')?.classList.remove('is-active');
    document.getElementById('resultCard')?.classList.add('is-revealed');

    _setText('resultDigit', String(winner.digit));

    const confEl = document.getElementById('resultConf');
    if (confEl) {
      confEl.textContent = `${winner.pct}% confidence`;
      confEl.style.color = winner.pct >= 90 ? 'var(--col-green)'
                         : winner.pct >= 60 ? 'var(--accent)'
                         :                    'var(--col-amber)';
    }

    probs.forEach((p, d) => {
      const pct    = Math.round(p * 100);
      const isWin  = d === winner.digit;
      const fill   = document.getElementById(`barFill${d}`);
      const num    = document.getElementById(`barNum${d}`);
      const pctEl  = document.getElementById(`barPct${d}`);

      if (fill) fill.className  = `prob-row__fill${isWin ? ' is-winner' : ''}`;
      if (num)  num.className   = `prob-row__digit${isWin ? ' is-winner' : ''}`;
      if (pctEl) pctEl.className = `prob-row__pct${isWin ? ' is-winner' : ''}`;

      setTimeout(() => {
        if (fill)  fill.style.width  = pct + '%';
        if (pctEl) pctEl.textContent = pct + '%';
      }, 50 + d * 40);
    });
  }

  /* ── Training feedback ──────────────── */

  function setStatus(dotClass, text) {
    const dot  = document.getElementById('statusDot');
    const txt  = document.getElementById('statusText');
    if (dot) dot.className = `status-dot${dotClass ? ' is-' + dotClass : ''}`;
    if (txt) txt.textContent = text;
  }

  function setProgress(pct, epoch, total, acc, loss) {
    const fill = document.getElementById('progressFill');
    const bar  = document.getElementById('progressBar');
    const pEl  = document.getElementById('progressPct');

    if (fill) fill.style.width = pct + '%';
    if (bar)  bar.setAttribute('aria-valuenow', pct);
    if (pEl)  pEl.textContent  = pct + '%';

    _setText('epochStat', `Epoch ${epoch} / ${total}`);
    _setText('accStat',   acc  !== null ? `Acc ${(acc * 100).toFixed(1)}%` : 'Acc —');
    _setText('lossStat',  loss !== null ? `Loss ${loss.toFixed(3)}`        : 'Loss —');
  }

  function showError(msg) {
    const conf = document.getElementById('resultConf');
    if (conf) { conf.textContent = msg; conf.style.color = 'var(--col-rose)'; }
  }

  /* ── Helpers ─────────────────────────── */

  function _clearBars() {
    for (let d = 0; d < 10; d++) {
      const fill  = document.getElementById(`barFill${d}`);
      const num   = document.getElementById(`barNum${d}`);
      const pctEl = document.getElementById(`barPct${d}`);
      if (fill)  { fill.className = 'prob-row__fill'; fill.style.width = '0%'; }
      if (num)   num.className = 'prob-row__digit';
      if (pctEl) { pctEl.className = 'prob-row__pct'; pctEl.textContent = '—'; }
    }
  }

  function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function _setStyle(id, prop, val) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = val;
  }

  return { buildBars, reset, showThinking, showResults, setStatus, setProgress, showError };

})();
