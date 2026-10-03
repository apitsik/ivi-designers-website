// «Вайб» в хиро: тап по области клеит следующий стикер из набора в точку тапа,
// подсказка перекатывается в «удалить вайб». Клик по ней — стикеры отклеиваются
// и улетают. Курсор над хиро — пунктирный цветок с плюсом, а когда стикеры уже
// клеят — пунктирный силуэт следующего стикера (heroAreaSticker-N [beforeAdd]).

// Размеры в макете при ширине 1440 и повороты из Figma (Hero (add sticker 4)).
// В Figma 15 стикеров; «Иви кайф» (клавиша) в Assets пока нет — добавить heroAreaSticker-15.png.
const SET = [
  { n: 1, w: 193, h: 144, r: -16.3 },
  { n: 2, w: 196, h: 137, r: 23.9 },
  { n: 3, w: 185, h: 153, r: 17.9 },
  { n: 4, w: 178, h: 174, r: -16.2 },
  { n: 5, w: 150, h: 149, r: -22.5 },
  { n: 6, w: 98, h: 157, r: -24.1 },
  { n: 7, w: 172, h: 134, r: 0 },
  { n: 8, w: 234, h: 115, r: 12.4 }, // Йогуртовый день
  { n: 9, w: 132, h: 207, r: 11 },
  { n: 10, w: 92, h: 120, r: 0 },
  { n: 11, w: 183, h: 174, r: 11.2 },
  { n: 12, w: 115, h: 115, r: 0 },
  { n: 13, w: 209, h: 186, r: 0 },
  { n: 14, w: 175, h: 63, r: 0 },
];

const SRC = (n) => `/stickers/heroAreaSticker-${n}.png`;

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
  const images = new Map(); // n → HTMLImageElement (прогретые)
  SET.forEach(({ n }) => {
    const img = new Image();
    img.src = SRC(n);
    images.set(n, img);
  });

  let next = 0; // индекс следующего стикера из набора
  let peeling = false;

  const scale = () => Math.min(1, Math.max(0.55, window.innerWidth / 1440));
  const current = () => SET[next % SET.length];
  // Случайная добавка к наклону следующего стикера фиксируется заранее,
  // сам наклон зависит от позиции курсора — его видно в курсоре.
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

    // Блик — копия стикера, высветленная и обрезанная градиентной маской-полосой.
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

  // Наклеивание. Опорная точка — центр экрана: стикер «подъезжает» из центра
  // наружу по дуге (поворот вокруг центра viewport на SWING градусов), при этом
  // висит над плоскостью, наклонённый к центру, и прижимается, выравниваясь.
  // Одновременно по нему пробегает блик.
  const SWING = 7; // градусов дуги вокруг центра экрана
  const animateStick = (el, rot, x, y) => {
    const rect = hero.getBoundingClientRect();
    // Центр viewport в координатах хиро.
    const cx = window.innerWidth / 2 - rect.left;
    const cy = window.innerHeight / 2 - rect.top;
    // Стартовая точка — та же, но повёрнутая вокруг центра экрана на -SWING.
    const a = (-SWING * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    const sx = cx + dx * Math.cos(a) - dy * Math.sin(a);
    const sy = cy + dx * Math.sin(a) + dy * Math.cos(a);
    const ox = sx - x; // смещение старта относительно финальной позиции
    const oy = sy - y;
    // Направление от центра экрана к стикеру — вдоль него стикер «садится».
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // Наклон в перспективе: ближний к центру край приподнят.
    const tiltX = (uy * 34).toFixed(1); // rotateX от вертикальной составляющей
    const tiltY = (-ux * 34).toFixed(1); // rotateY от горизонтальной

    const T = (tx, ty, r, sc, rx, ry) =>
      `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${r}deg) scale(${sc}) rotateX(${rx}deg) rotateY(${ry}deg)`;

    el.animate(
      [
        { transform: T(ox - ux * 24, oy - uy * 24, rot - SWING, 1.12, tiltX, tiltY), filter: 'drop-shadow(0 32px 28px rgba(0,0,0,0.5))', opacity: 0, offset: 0 },
        { transform: T(ox * 0.55 - ux * 12, oy * 0.55 - uy * 12, rot - SWING * 0.55, 1.08, tiltX * 0.65, tiltY * 0.65), filter: 'drop-shadow(0 22px 22px rgba(0,0,0,0.45))', opacity: 1, offset: 0.25 },
        { transform: T(0, 0, rot, 0.97, 0, 0), filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))', opacity: 1, offset: 0.62 },
        { transform: T(0, 0, rot, 1.015, -tiltX * 0.08, -tiltY * 0.08), filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.35))', opacity: 1, offset: 0.82 },
        { transform: T(0, 0, rot, 1, 0, 0), filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))', opacity: 1, offset: 1 },
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

  // Отклеивание: каждый стикер по очереди приподнимается за угол
  // (перспектива, тень растёт), отрывается и улетает от центра, крутясь.
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
    const stagger = 70;
    const order = [...items].reverse(); // последний приклеенный отрывается первым

    order.forEach((el, i) => {
      const rot = Number(el.dataset.rot || 0);
      const x = parseFloat(el.style.left);
      const y = parseFloat(el.style.top);
      const ang = Math.atan2(y - cy, x - cx) + (Math.random() - 0.5) * 0.6;
      const dist = Math.max(window.innerWidth, window.innerHeight) * 1.1;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const spin = (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 240);
      const base = `translate(-50%, -50%)`;
      el.style.zIndex = String(100 + i);
      const a = el.animate(
        [
          { transform: `${base} rotate(${rot}deg) rotateX(0deg) rotateY(0deg) scale(1)`, filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))', opacity: 1, offset: 0 },
          { transform: `${base} translateY(-10px) rotate(${rot}deg) rotateX(-42deg) rotateY(18deg) scale(1.06)`, filter: 'drop-shadow(0 36px 30px rgba(0,0,0,0.55))', opacity: 1, offset: 0.38, easing: EASE_IN },
          { transform: `${base} translate(${dx * 0.12}px, ${dy * 0.12 - 40}px) rotate(${rot + spin * 0.15}deg) rotateX(-20deg) scale(1.04)`, opacity: 1, offset: 0.5, easing: 'linear' },
          { transform: `${base} translate(${dx}px, ${dy}px) rotate(${rot + spin}deg) rotateX(0deg) scale(0.7)`, filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))', opacity: 0, offset: 1 },
        ],
        { duration: 1400, delay: i * stagger, easing: 'ease-in', fill: 'forwards' },
      );
      a.onfinish = () => el.remove();
    });

    setTimeout(() => {
      layer.replaceChildren();
      peeling = false;
    }, 1400 + order.length * stagger + 60);
  };

  hero.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    // Клики по подсказке и по ссылкам не считаем тапом по области.
    if (e.target.closest('.hero__hint, a, button')) return;
    const rect = hero.getBoundingClientRect();
    addSticker(e.clientX - rect.left, e.clientY - rect.top);
  });

  hint?.addEventListener('click', (e) => {
    e.preventDefault();
    peelStickers();
  });
}

// Наклон стикера — от его положения относительно центра хиро (якорная точка):
// слева от центра наклон влево, справа — вправо, пропорционально удалению,
// до ±TILT. Плюс небольшой случайный разброс, чтобы не было строгой закономерности.
const TILT = 55;
const TILT_JITTER = 20;
function tiltAt(hero, x, y, jitter) {
  const cx = hero.clientWidth / 2;
  const base = ((x - cx) / cx) * TILT;
  return Math.max(-TILT, Math.min(TILT, base + jitter));
}

// Свой курсор: элемент едет за указателем с небольшой инерцией.
// Пока стикеров нет — цветок с плюсом; потом — пунктирный силуэт следующего стикера.
// На тач-устройствах (нет hover) не показываем.
function initCursor(hero, images, rotAt) {
  const api = { setPreview() {} };
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return api;

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
    // Над подсказкой и ссылками — обычный курсор.
    const overControl = !!e.target.closest('.hero__hint, a, button');
    cur.classList.toggle('hero__cursor--hidden', overControl);
    // Курсор (и цветок, и силуэт) поворачивается так же, как повернётся стикер в этой точке.
    cur.style.setProperty('--rot', `${rotAt(tx, ty)}deg`);
    if (!raf) raf = requestAnimationFrame(tick);
  });

  hero.addEventListener('pointerleave', () => {
    visible = false;
    hero.classList.remove('hero--cursor');
  });

  hero.addEventListener('pointerdown', () => cur.classList.add('hero__cursor--press'));
  window.addEventListener('pointerup', () => cur.classList.remove('hero__cursor--press'));

  // Силуэт: берём альфу стикера, заливаем серым и обводим пунктиром.
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

// Рисует пунктирный силуэт картинки (по альфа-каналу) на canvas.
function drawSilhouette(canvas, img, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pad = 6; // запас под обводку
  const W = Math.ceil((w + pad * 2) * dpr);
  const H = Math.ceil((h + pad * 2) * dpr);
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${w + pad * 2}px`;
  canvas.style.height = `${h + pad * 2}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 1. Маска формы (альфа стикера), слегка сглаженная.
  const mask = document.createElement('canvas');
  mask.width = W;
  mask.height = H;
  const m = mask.getContext('2d');
  m.scale(dpr, dpr);
  m.drawImage(img, pad, pad, w, h);
  m.globalCompositeOperation = 'source-in';
  m.fillStyle = '#fff';
  m.fillRect(0, 0, W, H);

  // 2. Кольцо: расширенная форма минус сама форма.
  const ring = document.createElement('canvas');
  ring.width = W;
  ring.height = H;
  const r = ring.getContext('2d');
  const t = 2.2; // толщина обводки, css px
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    r.drawImage(mask, Math.cos(a) * t * dpr, Math.sin(a) * t * dpr);
  }
  r.globalCompositeOperation = 'destination-out';
  r.drawImage(mask, 0, 0);

  // 3. Пунктир: кольцо × диагональные полосы.
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

  // Красим пунктир в белый.
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = 'rgba(255, 255, 255, 0.85)';
  r.fillRect(0, 0, W, H);

  // Красим заливку в полупрозрачный серый.
  m.globalCompositeOperation = 'source-in';
  m.fillStyle = 'rgba(255, 255, 255, 0.14)';
  m.fillRect(0, 0, W, H);

  // 4. Сборка.
  ctx.drawImage(mask, 0, 0, W / dpr, H / dpr);
  ctx.drawImage(ring, 0, 0, W / dpr, H / dpr);
}
