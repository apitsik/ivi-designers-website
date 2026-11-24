import { splitWords, observeReveal } from './reveal.js';
import { lenis } from './smooth-scroll.js';

const IMAGES = [
  'vacancies-image-1.jpg',
  'vacancies-image-2.jpg',
  'vacancies-image-3.jpg',
  'vacancies-image-4.jpg',
  'vacancies-image-5.jpg',
  'vacancies-image-6.jpg',
  'vacancies-image-7.jpg',
  'vacancies-image-8.jpg',
  'vacancies-image-9.jpg',
  'vacancies-image-9-1.jpg',
  'vacancies-image-10.jpg',
  'vacancies-image-11.jpg',
  'vacancies-image-12.jpg',
  'vacancies-image-13.jpg',
  'vacancies-image-14.jpg',
  'vacancies-image-15.jpg',
  'vacancies-image-16.jpg',
  'vacancies-image-17.jpg',
  'vacancies-image-18.jpg',
  'vacancies-image-19.jpg',
  'vacancies-image-20.jpg',
].map((name) => `images/vacancies/${name}`);

const TRAIL_SPACING = 70;
const MAX_SHOTS = 7;
const ROTATE_MAX = 12;
const SIZE_JITTER = 0.1;
const DRIFT = 18;
const MIN_AGE_OPACITY = 0.22;
const POP_MS = 520;
const HOLD_MS = 200;
const EXIT_MS = 320;
const EVICT_MS = 160;

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initVacancies(section) {
  if (!section) return;

  initReveal(section);
  initTrail(section);
  initScrollPic(section);
}

const PIC_COUNT = 6;

function initScrollPic(section) {
  const pic = section.querySelector('.vacancies__pic');
  if (!pic) return;
  const names = shuffle(IMAGES.slice()).slice(0, PIC_COUNT);
  const imgs = names.map((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    pic.appendChild(img);
    return img;
  });
  const compact = window.matchMedia('(max-width: 1024px), (max-width: 1400px) and (hover: none) and (pointer: coarse)');
  const STEP_MS = 2200;
  let current = -1;
  let timer = 0;
  let visible = false;
  const show = (idx) => {
    imgs.forEach((im, i) => im.classList.toggle('is-on', i === idx));
    current = idx;
  };
  const tick = () => {
    show((current + 1) % imgs.length);
  };
  const sync = () => {
    clearInterval(timer);
    timer = 0;
    if (!compact.matches) return;
    if (current < 0) show(0);
    if (visible && !REDUCED.matches) timer = setInterval(tick, STEP_MS);
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(section);
  compact.addEventListener('change', sync);
}

function initReveal(section) {
  const title = section.querySelector('[data-words]');
  const subtitle = section.querySelector('.vacancies__subtitle');
  const buttons = [...section.querySelectorAll('.vacancies__button')];
  let i = 0;
  if (title) i = splitWords(title);
  if (subtitle) subtitle.style.setProperty('--word-index', i++);
  buttons.forEach((b) => b.style.setProperty('--word-index', i));
  observeReveal(section);
}

function initTrail(section) {
  const layer = section.querySelector('.vacancies__trail');
  if (!layer || REDUCED.matches) return;

  let queue = [];
  const nextSrc = () => {
    if (!queue.length) queue = shuffle(IMAGES.slice());
    return queue.pop();
  };

  const preload = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      IMAGES.forEach((src) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
      });
      preload.disconnect();
    },
    { rootMargin: '50% 0px' },
  );
  preload.observe(section);

  const shots = [];
  let last = null;
  const POP_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  const EXIT_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

  const spawn = (x, y, dirX, dirY) => {
    const shot = document.createElement('div');
    shot.className = 'vacancies__shot';
    const rot = (Math.random() * 2 - 1) * ROTATE_MAX;
    const scale = 1 + (Math.random() * 2 - 1) * SIZE_JITTER;
    shot.style.setProperty('--size-scale', scale.toFixed(3));
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = nextSrc();
    shot.append(img);
    layer.append(shot);

    const half = shot.offsetWidth * 0.64 + DRIFT;
    const top = Math.min(Math.max(y, half), Math.max(half, layer.clientHeight - half));
    shot.style.left = `${x}px`;
    shot.style.top = `${top}px`;

    const dx = dirX * DRIFT;
    const dy = dirY * DRIFT;
    const at = (tx, ty, s) => `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${s})`;

    const entry = { el: shot, rot, dx, dy, hiding: false, timer: 0, anim: null };
    shots.push(entry);

    entry.anim = shot.animate(
      [
        { opacity: 0, transform: at(-dx, -dy, 0.5), offset: 0 },
        { opacity: 1, transform: at(dx * 0.35, dy * 0.35, 1.05), offset: 0.62 },
        { opacity: 1, transform: at(dx, dy, 1), offset: 1 },
      ],
      { duration: POP_MS, easing: POP_EASE, fill: 'forwards' },
    );

    entry.timer = setTimeout(() => hide(entry, EXIT_MS), POP_MS + HOLD_MS);

    const alive = shots.filter((s) => !s.hiding);
    for (let i = 0; i < alive.length - MAX_SHOTS; i++) hide(alive[i], EVICT_MS);
    fadeByAge();
  };

  const fadeByAge = () => {
    const alive = shots.filter((s) => !s.hiding);
    const n = alive.length;
    alive.forEach((s, i) => {
      const t = n > 1 ? (n - 1 - i) / Math.max(MAX_SHOTS - 1, 1) : 0;
      s.el.firstChild.style.opacity = (1 - Math.min(1, t) * (1 - MIN_AGE_OPACITY)).toFixed(3);
    });
  };

  const hide = (entry, duration) => {
    if (entry.hiding) return;
    entry.hiding = true;
    clearTimeout(entry.timer);
    const cs = getComputedStyle(entry.el);
    const from = { opacity: cs.opacity, transform: cs.transform === 'none' ? '' : cs.transform };
    entry.anim?.cancel();
    const to = `translate(${entry.dx.toFixed(1)}px, ${(entry.dy + 14).toFixed(1)}px) rotate(${entry.rot.toFixed(2)}deg) scale(0.85)`;
    const anim = entry.el.animate(
      [
        { opacity: from.opacity, transform: from.transform || `rotate(${entry.rot}deg)` },
        { opacity: 0, transform: to },
      ],
      { duration, easing: EXIT_EASE, fill: 'forwards' },
    );
    anim.onfinish = () => {
      entry.el.remove();
      const i = shots.indexOf(entry);
      if (i !== -1) shots.splice(i, 1);
    };
  };

  section.addEventListener('pointermove', (e) => {
    if (document.body.classList.contains('video-modal-open')) return;
    const rect = section.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!last) {
      last = { x, y };
      return;
    }
    let dx = x - last.x;
    let dy = y - last.y;
    let dist = Math.hypot(dx, dy);
    if (dist < TRAIL_SPACING) return;
    const ux = dx / dist;
    const uy = dy / dist;
    let n = 0;
    while (dist >= TRAIL_SPACING && n < 12) {
      last = { x: last.x + ux * TRAIL_SPACING, y: last.y + uy * TRAIL_SPACING };
      spawn(last.x, last.y, ux, uy);
      dist -= TRAIL_SPACING;
      n++;
    }
    if (n >= 12) last = { x, y };
  });

  const reset = () => {
    last = null;
  };
  section.addEventListener('pointerleave', reset);
  section.addEventListener('pointercancel', reset);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
