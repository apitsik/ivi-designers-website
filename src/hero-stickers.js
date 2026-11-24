const SET = [
  { n: 1, w: 193, h: 145, r: 0 },
  { n: 2, w: 196, h: 137, r: 0 },
  { n: 3, w: 300, h: 107, r: 0 },
  { n: 4, w: 172, h: 134, r: 0 },
  { n: 5, w: 207, h: 143, r: 0 },
  { n: 6, w: 149, h: 170, r: 0 },
  { n: 7, w: 193, h: 193, r: 0 },
  { n: 8, w: 139, h: 218, r: 0 },
  { n: 9, w: 185, h: 109, r: 0 },
  { n: 10, w: 178, h: 174, r: 0 },
  { n: 11, w: 240, h: 150, r: 0 },
  { n: 12, w: 159, h: 219, r: 0 },
  { n: 13, w: 220, h: 189, r: 0 },
  { n: 14, w: 310, h: 174, r: 0 },
  { n: 15, w: 200, h: 200, r: 0 },
  { n: 16, w: 200, h: 153, r: 0 },
  { n: 17, w: 92, h: 120, r: 0 },
  { n: 18, w: 175, h: 63, r: 0 },
  { n: 19, w: 198, h: 172, r: 0 },
  { n: 20, w: 98, h: 157, r: 0 },
  { n: 21, w: 200, h: 165, r: 0 },
  { n: 22, w: 253, h: 164, r: 0 },
];

const SRC = (n) => `stickers/heroAreaSticker-${n}-v2.png`;

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN = 'cubic-bezier(0.55, 0, 1, 0.45)';

export function initHeroStickers(hero) {
  if (!hero) return;
  const hint = hero.querySelector('.hero__hint');
  const layer = document.createElement('div');
  layer.className = 'hero__stickers';
  layer.setAttribute('aria-hidden', 'true');
  hero.appendChild(layer);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const images = new Map();
  const warmStickers = () =>
    images.forEach((img, n) => {
      if (!img.src) img.src = SRC(n);
    });
  SET.forEach(({ n }) => images.set(n, new Image()));
  setTimeout(warmStickers, 2500);
  hero.addEventListener('pointerenter', warmStickers, { once: true });

  let next = 0;
  let peeling = false;

  const scale = () => Math.min(1, Math.max(0.55, window.innerWidth / 1440));
  const current = () => SET[next % SET.length];
  let nextJitter = (Math.random() * 2 - 1) * TILT_JITTER;
  const rotAt = (x, y) => tiltAt(hero, x, y, nextJitter);

  const cursor = initCursor(hero, images, (x, y) => rotAt(x, y));

  const setState = (hasStickers) => {
    hero.classList.toggle('hero--has-stickers', hasStickers);
    hint?.setAttribute('aria-pressed', String(hasStickers));
    cursor.setPreview(hasStickers ? { ...current(), k: scale() } : null);
  };

  const addSticker = (x, y) => {
    const s = current();
    const rot = rotAt(x, y);
    const k = scale();
    next += 1;
    nextJitter = (Math.random() * 2 - 1) * TILT_JITTER;

    const el = document.createElement('div');
    el.className = 'hero__sticker';
    el.style.width = `${s.w * k}px`;
    el.style.height = `${s.h * k}px`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--rot', `${rot}deg`);
    el.dataset.rot = String(rot);

    const img = document.createElement('img');
    img.src = SRC(s.n);
    img.alt = '';
    img.draggable = false;
    el.appendChild(img);

    const gloss = document.createElement('img');
    gloss.className = 'hero__sticker-gloss';
    gloss.src = SRC(s.n);
    gloss.alt = '';
    gloss.draggable = false;
    el.appendChild(gloss);

    layer.appendChild(el);
    if (!reduce.matches) animateStick(el, rot, x, y);
    setState(true);
  };

  const SWING = 7;
  const animateStick = (el, rot, x, y) => {
    const rect = hero.getBoundingClientRect();
    const cx = window.innerWidth / 2 - rect.left;
    const cy = window.innerHeight / 2 - rect.top;
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
    const tiltX = (uy * 34).toFixed(1);
    const tiltY = (-ux * 34).toFixed(1);

    const k = window.matchMedia('(max-width: 720px)').matches ? 0.4 : 1;
    const D = (y, b, o) => `drop-shadow(0 ${(y * k).toFixed(1)}px ${(b * k).toFixed(1)}px rgba(0,0,0,${o}))`;
    const T = (tx, ty, r, sc, rx, ry) =>
      `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${r}deg) scale(${sc}) rotateX(${rx}deg) rotateY(${ry}deg)`;

    el.animate(
      [
        { transform: T(ox - ux * 24, oy - uy * 24, rot - SWING, 1.12, tiltX, tiltY), filter: D(32, 28, 0.5), opacity: 0, offset: 0 },
        { transform: T(ox * 0.55 - ux * 12, oy * 0.55 - uy * 12, rot - SWING * 0.55, 1.08, tiltX * 0.65, tiltY * 0.65), filter: D(22, 22, 0.45), opacity: 1, offset: 0.25 },
        { transform: T(0, 0, rot, 0.97, 0, 0), filter: D(4, 6, 0.35), opacity: 1, offset: 0.62 },
        { transform: T(0, 0, rot, 1.015, -tiltX * 0.08, -tiltY * 0.08), filter: D(8, 14, 0.35), opacity: 1, offset: 0.82 },
        { transform: T(0, 0, rot, 1, 0, 0), filter: D(10, 18, 0.35), opacity: 1, offset: 1 },
      ],
      { duration: 640, easing: EASE_OUT, fill: 'both' },
    );
    el.querySelector('.hero__sticker-gloss')?.animate(
      [
        { maskPosition: '120% 0', webkitMaskPosition: '120% 0', opacity: 0 },
        { opacity: 0.7, offset: 0.4 },
        { maskPosition: '-20% 0', webkitMaskPosition: '-20% 0', opacity: 0 },
      ],
      { duration: 700, delay: 120, easing: 'ease-out', fill: 'both' },
    );
  };

  const peelStickers = () => {
    const items = [...layer.children];
    if (!items.length || peeling) return;
    peeling = true;
    next = 0;
    nextJitter = (Math.random() * 2 - 1) * TILT_JITTER;
    setState(false);

    if (reduce.matches) {
      layer.replaceChildren();
      peeling = false;
      return;
    }

    const cx = hero.clientWidth / 2;
    const cy = hero.clientHeight / 2;
    const peels = items.map((el, i) => buildPeel(el, cx, cy, i));
    const t0 = performance.now();
    const total = PEEL_MS + PEEL_SPREAD;

    const tick = (now) => {
      const elapsed = now - t0;
      peels.forEach((p) => updatePeel(p, (elapsed - p.delay) / PEEL_MS));
      if (elapsed < total) requestAnimationFrame(tick);
      else {
        layer.replaceChildren();
        peeling = false;
      }
    };
    requestAnimationFrame(tick);
  };

  hero.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.hero__hint, .hero-notes, a, button')) return;
    const rect = hero.getBoundingClientRect();
    addSticker(e.clientX - rect.left, e.clientY - rect.top);
  });

  hint?.addEventListener('click', (e) => {
    e.preventDefault();
    peelStickers();
  });
}

const TILT = 55;
const TILT_JITTER = 20;
function tiltAt(hero, x, y, jitter) {
  const cx = hero.clientWidth / 2;
  const base = ((x - cx) / cx) * TILT;
  return Math.max(-TILT, Math.min(TILT, base + jitter));
}

function initCursor(hero, images, rotAt) {
  const api = { setPreview() {} };
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const tip = document.createElement('div');
    tip.className = 'hero__touch-hint';
    tip.setAttribute('aria-hidden', 'true');
    hero.appendChild(tip);
    return api;
  }

  const cur = document.createElement('div');
  cur.className = 'hero__cursor';
  cur.setAttribute('aria-hidden', 'true');
  const flower = document.createElement('div');
  flower.className = 'hero__cursor-flower';
  const preview = document.createElement('canvas');
  preview.className = 'hero__cursor-preview';
  cur.append(flower, preview);
  hero.appendChild(cur);

  let tx = 0, ty = 0, x = 0, y = 0, visible = false, raf = 0;

  const tick = () => {
    x += (tx - x) * 0.35;
    y += (ty - y) * 0.35;
    cur.style.transform = `translate(${x}px, ${y}px)`;
    if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(tick);
    else raf = 0;
  };

  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    tx = e.clientX - rect.left;
    ty = e.clientY - rect.top;
    if (!visible) {
      x = tx; y = ty; visible = true;
      hero.classList.add('hero--cursor');
    }
    const overControl = !!e.target.closest('.hero__hint, .hero-notes, a, button');
    cur.classList.toggle('hero__cursor--hidden', overControl);
    cur.style.setProperty('--rot', `${rotAt(tx, ty)}deg`);
    if (!raf) raf = requestAnimationFrame(tick);
  });

  hero.addEventListener('pointerleave', () => {
    visible = false;
    hero.classList.remove('hero--cursor');
  });

  hero.addEventListener('pointerdown', () => cur.classList.add('hero__cursor--press'));
  window.addEventListener('pointerup', () => cur.classList.remove('hero__cursor--press'));

  api.setPreview = (s) => {
    if (!s) {
      cur.classList.remove('hero__cursor--preview');
      return;
    }
    const img = images.get(s.n);
    const draw = () => drawSilhouette(preview, img, s.w * s.k, s.h * s.k);
    if (img.complete && img.naturalWidth) draw();
    else img.addEventListener('load', draw, { once: true });
    cur.style.setProperty('--rot', `${rotAt(tx, ty)}deg`);
    cur.classList.add('hero__cursor--preview');
  };

  return api;
}

function drawSilhouette(canvas, img, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pad = 6;
  const W = Math.ceil((w + pad * 2) * dpr);
  const H = Math.ceil((h + pad * 2) * dpr);
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${w + pad * 2}px`;
  canvas.style.height = `${h + pad * 2}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const mask = document.createElement('canvas');
  mask.width = W;
  mask.height = H;
  const m = mask.getContext('2d');
  m.scale(dpr, dpr);
  m.drawImage(img, pad, pad, w, h);
  m.globalCompositeOperation = 'source-in';
  m.fillStyle = '#fff';
  m.fillRect(0, 0, W, H);

  const ring = document.createElement('canvas');
  ring.width = W;
  ring.height = H;
  const r = ring.getContext('2d');
  const t = 2.2;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    r.drawImage(mask, Math.cos(a) * t * dpr, Math.sin(a) * t * dpr);
  }
  r.globalCompositeOperation = 'destination-out';
  r.drawImage(mask, 0, 0);

  r.globalCompositeOperation = 'destination-in';
  const period = 11;
  r.save();
  r.scale(dpr, dpr);
  r.fillStyle = '#000';
  r.translate(0, 0);
  r.rotate(Math.PI / 4);
  const span = (w + h) * 2;
  for (let p = -span; p < span; p += period) {
    r.fillRect(p, -span, period * 0.6, span * 2);
  }
  r.restore();

  r.globalCompositeOperation = 'source-in';
  r.fillStyle = 'rgba(255, 255, 255, 0.85)';
  r.fillRect(0, 0, W, H);

  m.globalCompositeOperation = 'source-in';
  m.fillStyle = 'rgba(255, 255, 255, 0.14)';
  m.fillRect(0, 0, W, H);

  ctx.drawImage(mask, 0, 0, W / dpr, H / dpr);
  ctx.drawImage(ring, 0, 0, W / dpr, H / dpr);
}

const PEEL_MS = 900;
const PEEL_SPREAD = 120;
const STRIPS = 8;
const CURL_DEG = 11;

function buildPeel(el, cx, cy, i) {
  const rot = Number(el.dataset.rot || 0);
  const x = parseFloat(el.style.left);
  const y = parseFloat(el.style.top);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const src = el.querySelector('img')?.src || '';

  el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  el.replaceChildren();
  el.classList.add('hero__sticker--peel');
  el.style.zIndex = String(100 + i);
  const sw = w / STRIPS;
  const strips = [];
  for (let k = 0; k < STRIPS; k++) {
    const st = document.createElement('div');
    st.className = 'hero__strip';
    st.style.width = `${sw + 1.2}px`;
    st.style.height = `${h}px`;
    st.style.backgroundImage = `url("${src}")`;
    st.style.backgroundSize = `${w}px ${h}px`;
    st.style.backgroundPosition = `${-k * sw}px 0`;
    st.style.transform = `translate3d(${(k * sw).toFixed(2)}px, 0, 0) rotateY(0deg)`;
    el.appendChild(st);
    strips.push(st);
  }

  const drop = Math.max(360, window.innerHeight * 0.9) + Math.random() * 240;
  const fromRight = x > cx ? Math.random() < 0.7 : Math.random() < 0.3;
  const curlSign = Math.random() < 0.5 ? 1 : -1;
  return {
    el,
    strips,
    rot,
    w,
    h,
    sw,
    dx: (Math.random() - 0.5) * 260 + (x > cx ? 60 : -60),
    dy: drop,
    flipX: (Math.random() < 0.5 ? 1 : -1) * (140 + Math.random() * 70),
    flipY: (Math.random() - 0.5) * 60,
    spin: (Math.random() - 0.5) * 70,
    fromRight,
    curlSign,
    delay: Math.random() * PEEL_SPREAD,
    done: false,
  };
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t) => t * t * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function updatePeel(p, t) {
  if (t < 0 || p.done) return;
  if (t >= 1) {
    p.done = true;
    p.el.style.opacity = '0';
    return;
  }

  const curlPhase = clamp01(t / 0.4);
  const front = curlPhase * 1.5;
  const relax = clamp01((t - 0.55) / 0.4);
  const fly = easeIn(clamp01((t - 0.15) / 0.85));
  const flyS = easeInOut(clamp01((t - 0.15) / 0.85));

  const n = p.strips.length;
  let px = 0;
  let pz = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const idx = p.fromRight ? n - 1 - k : k;
    const reach = clamp01((front - idx / n) * 2.2);
    const a = p.curlSign * CURL_DEG * reach * (1 - relax) * Math.sin(Math.PI * clamp01(t / 0.9));
    const rad = (acc * Math.PI) / 180;
    const st = p.strips[k];
    st.style.transform = `translate3d(${px.toFixed(2)}px, 0, ${pz.toFixed(2)}px) rotateY(${acc.toFixed(2)}deg)`;
    acc += a;
    px += p.sw * Math.cos(rad);
    pz -= p.sw * Math.sin(rad);
  }

  const lift = Math.sin(Math.PI * clamp01(t / 0.6)) * 28;
  const scale = 1 - flyS * 0.15;
  const tx = p.dx * fly;
  const ty = p.dy * fly - lift;
  const rx = p.flipX * flyS - lift * 0.6;
  const ry = p.flipY * flyS;
  const rz = p.rot + p.spin * flyS;
  const opacity = 1 - easeIn(clamp01((t - 0.55) / 0.45));
  p.el.style.transform = `translate(-50%, -50%) translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${rz.toFixed(1)}deg) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
  p.el.style.opacity = opacity.toFixed(3);
}
