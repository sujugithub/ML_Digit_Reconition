/**
 * js/ui/theme.js
 * ──────────────────────────────────────
 * Dark / Light mode management.
 *
 * Features:
 *   - Detects OS preference on first visit
 *   - Saves choice to localStorage
 *   - Smooth CSS transitions (handled by tokens.css)
 *   - Updates aria-label on toggle button
 */

const ThemeManager = (() => {

  const STORAGE_KEY = 'digit-ai:theme';
  const ATTR        = 'data-theme';

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const pref  = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    _apply(saved || pref);

    document.getElementById('themeToggle')
      ?.addEventListener('click', toggle);

    // Sync if OS changes
    window.matchMedia('(prefers-color-scheme: light)')
      .addEventListener('change', e => {
        if (!localStorage.getItem(STORAGE_KEY)) _apply(e.matches ? 'light' : 'dark');
      });
  }

  function toggle() {
    const current = document.documentElement.getAttribute(ATTR) || 'dark';
    const next    = current === 'dark' ? 'light' : 'dark';
    _apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  function _apply(theme) {
    document.documentElement.setAttribute(ATTR, theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }

  return { init, toggle };

})();
