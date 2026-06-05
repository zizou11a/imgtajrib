'use strict';
(function initAmoledTheme() {
const STORE_KEY = 'imgswift-theme';
const THEMES = ['dark', 'amoled', 'light'];
const ICONS = { dark: '🌙', amoled: '⚫', light: '☀️' };
const LABELS = { dark: 'Dark mode', amoled: 'AMOLED mode', light: 'Light mode' };
function applyTheme(theme) {
const html = document.documentElement;
html.removeAttribute('data-theme');
if (theme === 'light') html.setAttribute('data-theme', 'light');
if (theme === 'amoled') html.setAttribute('data-theme', 'amoled');
Store.set(STORE_KEY, theme);
_updateBtn(theme);
}
function _updateBtn(theme) {
const btn = document.getElementById('themeToggle');
if (!btn) return;
btn.textContent = ICONS[theme] || '🌙';
btn.title = LABELS[theme] || '';
btn.setAttribute('aria-label', LABELS[theme] || 'Toggle theme');
}
function nextTheme() {
const current = Store.get(STORE_KEY) || 'dark';
const idx = THEMES.indexOf(current);
return THEMES[(idx + 1) % THEMES.length];
}
window.toggleTheme = function () {
applyTheme(nextTheme());
};
(function restoreTheme() {
const saved = Store.get(STORE_KEY);
if (saved === 'amoled') {
document.documentElement.setAttribute('data-theme', 'amoled');
}
})();
document.addEventListener('DOMContentLoaded', () => {
const saved = Store.get(STORE_KEY) || 'dark';
_updateBtn(saved);
});
})();