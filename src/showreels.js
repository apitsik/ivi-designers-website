import { splitWords, observeReveal } from './reveal.js';

const MOBILE = window.matchMedia('(max-width: 720px)');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

const SMOOTHING = 0.3;
const CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)');

export function initShowreels(section) {
  section?.querySelectorAll('.showreel__img').forEach((img) => {
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener('load', () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(done), { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });
  if (!section) return;

  const grid = section.querySelector('.showreels__grid');
  const items = [...section.querySelectorAll('[data-speed]')].map((el) => ({
    el,
    speed: parseFloat(el.dataset.speed) || 0,
    current: 0,
    target: 0,
  }));

  if (CAN_HOVER.matches && !REDUCED.matches) {
    section.querySelectorAll('.showreel[data-preview]').forEach(initPreview);
  }

  const head = section.querySelector('.showreels__head');
  const title = section.querySelector('[data-words]');
  if (title) {
    splitWords(title);
    observeReveal(title.closest('.showreels__head') || title, title);
  }

  let raf = 0;
  let lastTime = 0;

  const measure = () => {
    const top = section.getBoundingClientRect().top;
    const enter = clamp(1 - top / window.innerHeight, 0, 1);
    section.style.setProperty('--enter', enter.toFixed(4));
    document.documentElement.style.setProperty('--hero-fade', enter.toFixed(4));

    if (head) {
      const stuck = MOBILE.matches || REDUCED.matches ? 0 : clamp(-section.querySelector('.showreels__panel').getBoundingClientRect().top / (window.innerHeight * 0.8), 0, 1);
      head.style.setProperty('--title-fade', (stuck * stuck * (3 - 2 * stuck)).toFixed(4));
    }

    if (REDUCED.matches) {
      items.forEach((it) => {
        it.target = it.current = 0;
        it.el.style.transform = '';
      });
      return;
    }

    const gridTop = grid.getBoundingClientRect().top;
    const mid = window.innerHeight / 2;
    items.forEach((it) => {
      const center = gridTop + it.el.offsetTop + it.el.offsetHeight / 2;
      it.target = (mid - center) * it.speed;
    });
  };

  const tick = (now) => {
    raf = 0;
    const dt = lastTime ? Math.min((now - lastTime) / 16.67, 3) : 1;
    lastTime = now;
    const k = 1 - Math.pow(1 - SMOOTHING, dt);

    let moving = false;
    items.forEach((it) => {
      const diff = it.target - it.current;
      if (Math.abs(diff) < 0.05) {
        it.current = it.target;
      } else {
        it.current += diff * k;
        moving = true;
      }
      it.el.style.transform = `translate3d(0, ${it.current.toFixed(2)}px, 0)`;
    });

    if (moving) raf = requestAnimationFrame(tick);
    else lastTime = 0;
  };

  const onScroll = () => {
    measure();
    if (!raf) raf = requestAnimationFrame(tick);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  MOBILE.addEventListener('change', onScroll);
  onScroll();
}

function initPreview(card) {
  const video = document.createElement('video');
  video.className = 'showreel__preview';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;
  video.addEventListener('error', () => video.remove());
  card.append(video);

  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    video.preload = 'auto';
    video.src = new URL(card.dataset.preview, document.baseURI).href;
    video.load();
  };

  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        load();
        io.disconnect();
      }
    },
    { rootMargin: '600px 0px' }
  );
  io.observe(card);

  const start = () => {
    load();
    video.currentTime = 0;
    const p = video.play();
    if (p) p.then(() => video.classList.add('is-playing')).catch(() => {});
  };

  const stop = () => {
    video.classList.remove('is-playing');
    setTimeout(() => {
      if (!video.classList.contains('is-playing')) video.pause();
    }, 360);
  };

  card.addEventListener('pointerenter', start);
  card.addEventListener('pointerleave', stop);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
