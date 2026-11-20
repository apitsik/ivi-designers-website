// Страница 404: экран заклеивается стикерами. Раскладка — рваная сетка с
// шагом ~ в половину стикера, поэтому они перекрывают друг друга; повороты
// и размеры случайные. Три «главных» стикера (смайл, 404, «страница не
// найдена») клеятся последними и ложатся поверх по центру.
// Наклеивание — упрощённая версия хиро (src/hero-stickers.js), без бликов.

const SRC = (n) => `stickers-404/404-sticker-${n}.png`;
// Пропорции файлов 754 × (388 | 524 | 424); ширина в макете 1440 — около 240
const RATIO = { 1: 388 / 754, 2: 524 / 754, 3: 424 / 754 };
const BASE_W = 240;

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

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
// Размер стикеров не зависит от ширины экрана: везде ~240
const k = 1;

// ----- раскладка -----
const items = [];
const stepX = BASE_W * 0.58 * k;
const stepY = BASE_W * 0.44 * k;
const cols = Math.ceil(W / stepX) + 2;
const rows = Math.ceil(H / stepY) + 2;
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
      w: BASE_W,
      rot,
    });
  }
}
shuffle(items);

// Главная тройка по центру, поверх всех
const HK = 1;
const hero = [
  { n: 1, x: W / 2 - 215 * HK, y: H / 2 + 24 * HK, w: BASE_W * HK, rot: -22 },
  { n: 3, x: W / 2 + 10 * HK, y: H / 2 - 64 * HK, w: BASE_W * HK, rot: -3 },
  { n: 2, x: W / 2 + 150 * HK, y: H / 2 + 34 * HK, w: BASE_W, rot: 5 },
];
const all = items.concat(hero);

// ----- наклеивание -----
// Легко для браузера: только transform и opacity, без фильтров, 3D и бликов.
// Стикер подъезжает от центра экрана чуть крупнее и повёрнутым, и прижимается.
const stick = (el, rot, x, y) => {
  const dx = x - W / 2;
  const dy = y - H / 2;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dx / len) * 22;
  const oy = (-dy / len) * 22;
  const T = (tx, ty, r, sc) => `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${r}deg) scale(${sc})`;
  const anim = el.animate(
    [
      { transform: T(ox, oy, rot - 6, 1.14), opacity: 0, offset: 0 },
      { transform: T(ox * 0.3, oy * 0.3, rot - 2, 1.06), opacity: 1, offset: 0.35 },
      { transform: T(0, 0, rot, 0.97), opacity: 1, offset: 0.75 },
      { transform: T(0, 0, rot, 1), opacity: 1, offset: 1 },
    ],
    { duration: 420, easing: EASE_OUT, fill: 'both' },
  );
  // После посадки слой снимаем с видеокарты
  anim.onfinish = () => {
    el.style.willChange = 'auto';
  };
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
  el.append(img);
  layer.appendChild(el);
  return el;
};

const run = () => {
  // Весь набор клеится примерно за 2 с; главная тройка — последней, чуть медленнее
  const gap = Math.min(36, 1800 / Math.max(1, items.length));
  all.forEach((s, i) => {
    const el = make(s);
    if (reduce.matches) return;
    el.style.willChange = 'transform, opacity';
    const isHero = i >= items.length;
    const delay = isHero ? items.length * gap + 150 + (i - items.length) * 260 : i * gap;
    setTimeout(() => stick(el, s.rot, s.x, s.y), delay);
  });
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
