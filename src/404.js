const SRC = (n) => `stickers-404/404-sticker-${n}.png`;
const RATIO = { 1: 263 / 496, 2: 350 / 496, 3: 286 / 496 };
const PAD = 496 / 480;
const BASE_W = 240;

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const root = document.querySelector('.nf');
const home = document.querySelector('.nf__home');
if (home) home.href = document.baseURI;
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
const k = 1;

const items = [];
const stepX = BASE_W * 0.66 * k;
const stepY = BASE_W * 0.5 * k;
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
const covered = (px, py) =>
  items.some((it) => {
    const w = it.w * 0.84;
    const h = it.w * RATIO[it.n] * 0.7;
    const a = (-it.rot * Math.PI) / 180;
    const dx = px - it.x;
    const dy = py - it.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(lx) < w / 2 && Math.abs(ly) < h / 2;
  });
for (let pass = 0; pass < 40; pass += 1) {
  let hole = null;
  for (let y = 0; y <= H && !hole; y += 36) {
    for (let x = 0; x <= W && !hole; x += 36) {
      if (!covered(x, y)) hole = { x, y };
    }
  }
  if (!hole) break;
  items.push({
    n: Math.floor(Math.random() * 3) + 1,
    x: hole.x + rand(-20, 20),
    y: hole.y + rand(-14, 14),
    w: BASE_W,
    rot: (Math.random() < 0.5 ? -1 : 1) * rand(6, 34),
  });
}
shuffle(items);

const HK = 1;
const hero = [
  { n: 1, x: W / 2 - 215 * HK, y: H / 2 + 24 * HK, w: BASE_W * HK, rot: -22 },
  { n: 3, x: W / 2 + 10 * HK, y: H / 2 - 64 * HK, w: BASE_W * HK, rot: -3 },
  { n: 2, x: W / 2 + 150 * HK, y: H / 2 + 34 * HK, w: BASE_W, rot: 5 },
];
const all = items.concat(hero);

const stick = (el, rot, x, y) => {
  const ang = Math.random() * Math.PI * 2;
  const dist = rand(14, 34);
  const ox = Math.cos(ang) * dist;
  const oy = Math.sin(ang) * dist;
  const spin = rand(-9, 9);
  const big = rand(1.08, 1.2);
  const T = (tx, ty, r, sc) => `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${r}deg) scale(${sc})`;
  el.animate(
    [
      { transform: T(ox, oy, rot + spin, big), opacity: 0, offset: 0 },
      { transform: T(ox * 0.3, oy * 0.3, rot + spin * 0.3, 1 + (big - 1) * 0.4), opacity: 1, offset: 0.35 },
      { transform: T(0, 0, rot, 0.97), opacity: 1, offset: 0.75 },
      { transform: T(0, 0, rot, 1), opacity: 1, offset: 1 },
    ],
    { duration: rand(340, 460), easing: EASE_OUT, fill: 'both' },
  );
};

const make = (s) => {
  const el = document.createElement('div');
  el.className = 'nf__sticker';
  el.style.width = `${s.w * PAD}px`;
  el.style.height = `${s.w * PAD * RATIO[s.n]}px`;
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
  const span = 1800;
  all.forEach((s, i) => {
    const el = make(s);
    if (reduce.matches) return;
    const isHero = i >= items.length;
    const delay = isHero ? span + 100 + (i - items.length) * 240 : Math.random() * span;
    setTimeout(() => stick(el, s.rot, s.x, s.y), delay);
  });
};

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
