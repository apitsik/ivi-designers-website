// Инерционный скролл на Lenis. Lenis крутит обычный window-скролл,
// поэтому scroll-события, sticky и IntersectionObserver работают как раньше —
// просто scrollY меняется плавно. Остальные модули берут инстанс отсюда,
// чтобы останавливать скролл под попапом и ехать по якорям.

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

export let lenis = null;

export function initSmoothScroll() {
  if (REDUCED.matches) return null;

  lenis = new Lenis({
    duration: 1.2,
    smoothWheel: true,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  // Якоря из навигации едут плавно через Lenis
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
