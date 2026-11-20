import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

export let lenis = null;

export function initSmoothScroll() {
  if (REDUCED.matches) return null;

  lenis = new Lenis({
    duration: 1.2,
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.085,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0 });
    });
  });

  return lenis;
}
