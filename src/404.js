// Страница 404: экран заклеивается стикерами. Раскладка — рваная сетка с
// шагом ~ в половину стикера, поэтому они перекрывают друг друга; повороты
// и размеры случайные. Три «главных» стикера (смайл, 404, «страница не
// найдена») клеятся последними и ложатся поверх по центру.
// Наклеивание — то же, что в хиро (src/hero-stickers.js): стикер подъезжает
// от центра экрана по дуге, висит над плоскостью и прижимается, по нему
// пробегает блик.

const SRC = (n) => `stickers-404/404-sticker-${n}.png`;
// Пропорции файлов 754 × (388 | 524 | 424); ширина в макете 1440 — около 240
const RATIO = { 1: 388 / 754, 2: 524 / 754, 3: 424 / 754 };
const BASE_W = 240;

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SWING = 7;

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const root = document.querySelector('.nf');
const layer = document.querySelector('.nf__stickers');

const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const W = window.innerWidth;
const H = window.innerHeight;
const k = Math.min(1.15, Math.max(0.5, W / 1440));

// ----- раскладка -----
const items = [];
const stepX = BASE_W * 0.58 * k;
const stepY = BASE_W * 0.44 * k;
const cols = Math.ceil(W / stepX) + 1;
const rows = Math.ceil(H / stepY) + 1;
let kind = 0;
for (let r = 0; r < rows; r += 1) {
  for (let c = 0; c < cols; c += 1) {
    kind = (kind + 1 + (Math.random() < 0.35 ? 1 : 0)) % 3;
    const n = kind + 1;
    const rot = (Math.random() < 0.5 ? -1 : 1) * rand(6, 34);
    items.push({
      n,
      x: (c - 0.25) * stepX + rand(-0.35, 0.35) * stepX + (r % 2 ? stepX / 2 : 0),
      y: (r - 0.25) * stepY + rand(-0.3, 0.3) * stepY,
      w: BASE_W * k * rand(0.82, 1.14),
      rot,
    });
  }
}
shuffle(items);

// Главная тройка по центру, поверх всех
const HK = Math.min(1.2, k * 1.12);
const hero = [
  { n: 1, x: W / 2 - 215 * HK, y: H / 2 + 24 * HK, w: BASE_W * HK, rot: -22 },
  { n: 3, x: W / 2 + 10 * HK, y: H / 2 - 64 * HK, w: BASE_W * HK, rot: -3 },
  { n: 2, x: W / 2 + 150 * HK, y: H / 2 + 34 * HK, w: BASE_W * HK * 1.04, rot: 5 },
];
const all = items.concat(hero);

// ----- наклеивание -----
const T = (tx, ty, r, sc, rx, ry) =>
  `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${r}deg) scale(${sc}) rotateX(${rx}deg) rotateY(${ry}deg)`;

const stick = (el, rot, x, y) => {
  const cx = W / 2;
  const cy = H / 2;
  const a = (-SWING * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const sx = cx + dx * Math.cos(a) - dy * Math.sin(a);
  const sy = cy + dx * Math.sin(a) + dy * Math.cos(a);
  const ox = sx - x;
  const oy = sy - y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const tiltX = uy * 34;
  const tiltY = -ux * 34;
  el.animate(
    [
      { transform: T(ox - ux * 24, oy - uy * 24, rot - SWING, 1.12, tiltX, tiltY), filter: 'drop-shadow(0 32px 28px rgba(0,0,0,0.5))', opacity: 0, offset: 0 },
      { transform: T(ox * 0.55 - ux * 12, oy * 0.55 - uy * 12, rot - SWING * 0.55, 1.08, tiltX * 0.65, tiltY * 0.65), filter: 'drop-shadow(0 22px 22px rgba(0,0,0,0.45))', opacity: 1, offset: 0.25 },
      { transform: T(0, 0, rot, 0.97, 0, 0), filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))', opacity: 1, offset: 0.62 },
      { transform: T(0, 0, rot, 1.015, -tiltX * 0.08, -tiltY * 0.08), filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.4))', opacity: 1, offset: 0.82 },
      { transform: T(0, 0, rot, 1, 0, 0), filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.45))', opacity: 1, offset: 1 },
    ],
    { duration: 640, easing: EASE_OUT, fill: 'both' },
  );
  el.querySelector('.nf__sticker-gloss')?.animate(
    [
      { maskPosition: '120% 0', webkitMaskPosition: '120% 0', opacity: 0 },
      { opacity: 0.7, offset: 0.4 },
      { maskPosition: '-20% 0', webkitMaskPosition: '-20% 0', opacity: 0 },
    ],
    { duration: 700, delay: 120, easing: 'ease-out', fill: 'both' },
  );
};

const make = (s) => {
  const el = document.createElement('div');
  el.className = 'nf__sticker';
  el.style.width = `${s.w}px`;
  el.style.height = `${s.w * RATIO[s.n]}px`;
  el.style.left = `${s.x}px`;
  el.style.top = `${s.y}px`;
  el.style.setProperty('--rot', `${s.rot}deg`);
  const img = document.createElement('img');
  img.src = SRC(s.n);
  img.alt = '';
  img.draggable = false;
  const gloss = document.createElement('img');
  gloss.className = 'nf__sticker-gloss';
  gloss.src = SRC(s.n);
  gloss.alt = '';
  gloss.draggable = false;
  el.append(img, gloss);
  layer.appendChild(el);
  return el;
};

const run = () => {
  const total = all.length;
  // Весь набор клеится примерно за 3,2 с; тройка — чуть медленнее, по одной
  const gap = Math.min(70, 2600 / Math.max(1, items.length));
  all.forEach((s, i) => {
    const el = make(s);
    if (reduce.matches) return;
    const isHero = i >= items.length;
    const delay = isHero ? items.length * gap + 250 + (i - items.length) * 380 : i * gap;
    setTimeout(() => stick(el, s.rot, s.x, s.y), delay);
  });
  const end = reduce.matches ? 0 : items.length * gap + 250 + 3 * 380 + 700;
  setTimeout(() => root.classList.add('is-done'), end);
  return total;
};

// Ждём картинки, чтобы стикеры не появлялись пустыми
const preload = [1, 2, 3].map(
  (n) =>
    new Promise((res) => {
      const im = new Image();
      im.onload = im.onerror = res;
      im.src = SRC(n);
      im.decode?.().then(res, res);
    }),
);
Promise.race([Promise.all(preload), new Promise((r) => setTimeout(r, 1500))]).then(run);
