'use strict';
(function() {
let deferredPrompt = null;
const DISMISS_KEY = 'imgswift-install-dismissed';
window.addEventListener('beforeinstallprompt', e => {
e.preventDefault();
deferredPrompt = e;
if (localStorage.getItem(DISMISS_KEY)) return;
setTimeout(() => {
const banner = document.getElementById('installBanner');
if (banner) banner.classList.add('show');
}, 3000);
});
window.addEventListener('appinstalled', () => {
_hideBanner();
deferredPrompt = null;
});
window.installApp = async function() {
if (!deferredPrompt) return;
deferredPrompt.prompt();
const { outcome } = await deferredPrompt.userChoice;
if (outcome === 'accepted') _hideBanner();
deferredPrompt = null;
};
window.dismissInstall = function() {
_hideBanner();
localStorage.setItem(DISMISS_KEY, '1');
};
function _hideBanner() {
const banner = document.getElementById('installBanner');
if (!banner) return;
banner.style.transform = 'translateX(-50%) translateY(100px)';
banner.style.opacity = '0';
setTimeout(() => banner.classList.remove('show'), 350);
}
const _origSetLang = window.setLang;
window.setLang = function(lang, el) {
if (_origSetLang) _origSetLang(lang, el);
const strong = document.querySelector('#installBanner .install-text strong');
const small = document.querySelector('#installBanner .install-text small');
const btn = document.getElementById('btnInstall');
if (!strong) return;
if (lang === 'ar') {
strong.textContent = 'ثبّت ImgSwift';
small.textContent = 'أضفه للشاشة الرئيسية — يعمل بدون إنترنت';
if (btn) btn.textContent = 'تثبيت';
} else {
strong.textContent = 'Install ImgSwift';
small.textContent = 'Add to home screen — works offline';
if (btn) btn.textContent = 'Install';
}
};
})();
if ('serviceWorker' in navigator) {
window.addEventListener('load', () => {
navigator.serviceWorker.register('/sw.js')
.then(() => {})
.catch(() => {});
});
}
if ('serviceWorker' in navigator) {
navigator.serviceWorker.addEventListener('message', e => {
if (e.data && e.data.type === 'SW_UPDATED') {
setTimeout(() => {
if (typeof showToast === 'function') {
showToast('✨ Updated to latest version', 'success');
}
}, 1000);
}
});
}