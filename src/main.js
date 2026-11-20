let booting = null;
const boot = () => {
  booting ||= import('./app.js').then(() => window.dispatchEvent(new Event('app-ready')));
  return booting;
};

if (window.PRELOADER === 'stroke') {
  window.addEventListener('preloader-covered', boot, { once: true });
  window.addEventListener('preloader-done', boot, { once: true });
  setTimeout(boot, 6000);
  if (window.__preloaderState) boot();
} else {
  boot();
}
