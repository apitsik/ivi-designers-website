// Footer: физика логотипов на Matter.js. Когда светлая плашка футера
// попадает в зону видимости, сверху по одному осыпаются логотипы из
// /images/footer/, падают под гравитацией, сталкиваются и оседают на дно
// плашки с отскоком. Стенки — дно и левый/правый край плашки. Любой
// логотип можно схватить мышью или пальцем, потащить и подбросить
// (MouseConstraint). Рисуем сами на канвасе (картинки под углом тела),
// чтобы было чётко на ретине. Колесо мыши и вертикальный свайп отданы
// странице: стандартные слушатели Matter.Mouse на них сняты.
// @gdeprostotamangelovsto

import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Query, Events, Sleeping } = Matter;

const IMAGES = Array.from({ length: 11 }, (_, i) => `/images/footer/footer-image-${i + 1}.png`);

const COUNT = 16; // сколько логотипов выпадает
const DROP_EVERY = 55; // мс между выпадениями — сыплются кучно, как из коробки
const LOGO_SIZE = 120; // размер в макете 1392
const WALL = 400; // толщина невидимых стенок
const INSET = 16; // внутренний отступ границ от края плашки

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initFooter(footer) {
  if (!footer) return;
  const block = footer.querySelector('.footer__block');
  const canvas = footer.querySelector('.footer__physics');
  if (!block || !canvas) return;

  const ctx = canvas.getContext('2d');
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let size = LOGO_SIZE;
  let radius = 0; // скругление плашки
  let walls = [];
  let ceiling = null; // невидимый потолок — после приземления
  let ceilingOn = false;
  let bodies = []; // { body, img }
  let dropTimer = 0;
  let dropped = false;
  let running = false;
  let rafId = 0;
  let lastTime = 0;

  // ----- картинки -----

  const images = IMAGES.map((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    return img;
  });

  // ----- размеры и стенки -----

  const resize = () => {
    const rect = block.getBoundingClientRect();
    width = Math.round(rect.width);
    height = Math.round(rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    size = Math.max(64, Math.min(LOGO_SIZE, (width / 1392) * LOGO_SIZE));
    radius = parseFloat(getComputedStyle(block).borderBottomLeftRadius) || 0;
    mouse.pixelRatio = dpr;

    walls.forEach((w) => Composite.remove(engine.world, w));
    // Границы — прямоугольник со скруглениями, вписанный в плашку
    // с отступом INSET: логотипы не касаются края и не вылетают наружу
    const r = Math.max(0, radius - INSET);
    walls = [
      // дно
      Bodies.rectangle(width / 2, height - INSET + WALL / 2, width + WALL * 2, WALL, { isStatic: true }),
      // левая и правая стенки, высокие — чтобы подброшенное не улетело вбок
      Bodies.rectangle(INSET - WALL / 2, height / 2 - 2000, WALL, height + 6000, { isStatic: true }),
      Bodies.rectangle(width - INSET + WALL / 2, height / 2 - 2000, WALL, height + 6000, { isStatic: true }),
      // скругления: логотипы ложатся и отскакивают по дуге,
      // а не прячутся в срезанный угол
      ...cornerArc(INSET, height - INSET, r, 1, 1),
      ...cornerArc(width - INSET, height - INSET, r, -1, 1),
      ...cornerArc(INSET, INSET, r, 1, -1),
      ...cornerArc(width - INSET, INSET, r, -1, -1),
    ];
    // Потолок ставится, когда все логотипы уже внутри (см. frame):
    // до этого они падают сверху сквозь верхний край
    if (ceilingOn) walls.push(makeCeiling());
    Composite.add(engine.world, walls);

    // Тела, оказавшиеся за новыми стенками, возвращаем внутрь
    bodies.forEach(({ body }) => {
      const x = Math.min(Math.max(body.position.x, INSET + size / 2), width - INSET - size / 2);
      const y = ceilingOn
        ? Math.min(Math.max(body.position.y, INSET + size / 2), height - INSET - size / 2)
        : Math.min(body.position.y, height - INSET - size / 2);
      if (x !== body.position.x || y !== body.position.y) {
        Body.setPosition(body, { x, y });
        Sleeping.set(body, false);
      }
    });
  };

  const makeCeiling = () => {
    ceiling = Bodies.rectangle(width / 2, INSET - WALL / 2, width + WALL * 2, WALL, { isStatic: true });
    return ceiling;
  };

  // ----- мышь и тач -----

  const mouse = Mouse.create(canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, damping: 0.05, render: { visible: false } },
  });
  Composite.add(engine.world, mouseConstraint);

  // Колесо — странице (Lenis), стандартный тач — тоже: иначе плашка
  // перехватывает прокрутку. Тач вешаем сами и только по попаданию в тело.
  canvas.removeEventListener('wheel', mouse.mousewheel);
  canvas.removeEventListener('mousewheel', mouse.mousewheel);
  canvas.removeEventListener('DOMMouseScroll', mouse.mousewheel);
  canvas.removeEventListener('touchstart', mouse.mousedown);
  canvas.removeEventListener('touchmove', mouse.mousemove);
  canvas.removeEventListener('touchend', mouse.mouseup);

  let touchDrag = false;
  canvas.addEventListener(
    'touchstart',
    (e) => {
      const pos = Mouse._getRelativeMousePosition(e, canvas, mouse.pixelRatio);
      const hit = Query.point(bodies.map((b) => b.body), pos);
      if (!hit.length) return;
      touchDrag = true;
      wake();
      mouse.mousedown(e);
    },
    { passive: false },
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (touchDrag) mouse.mousemove(e);
    },
    { passive: false },
  );
  const touchEnd = (e) => {
    if (!touchDrag) return;
    touchDrag = false;
    mouse.mouseup(e);
  };
  canvas.addEventListener('touchend', touchEnd, { passive: false });
  canvas.addEventListener('touchcancel', touchEnd, { passive: false });

  // Курсор: «рука» над логотипом, «кулак» во время перетаскивания
  canvas.addEventListener('mousemove', () => {
    if (mouseConstraint.body) return;
    const hit = Query.point(bodies.map((b) => b.body), mouse.position);
    canvas.classList.toggle('is-hover', hit.length > 0);
  });
  canvas.addEventListener('mouseleave', () => canvas.classList.remove('is-hover'));
  Events.on(mouseConstraint, 'startdrag', () => {
    canvas.classList.add('is-drag');
    wake();
  });
  Events.on(mouseConstraint, 'enddrag', () => canvas.classList.remove('is-drag'));

  // ----- выпадение -----

  const spawnOne = (i) => {
    const img = images[i % images.length];
    // Сбрасываем кучно из середины верхнего края с разбросом по ширине
    const spread = Math.min(width - size - INSET * 2, width * 0.7);
    const x = width / 2 + (Math.random() * 2 - 1) * (spread / 2);
    const y = -size * (0.8 + Math.random() * 1.2);
    const body = Bodies.rectangle(x, y, size, size, {
      chamfer: { radius: size * 0.22 },
      restitution: 0.42,
      friction: 0.5,
      frictionAir: 0.012,
      density: 0.0022,
      angle: (Math.random() * 2 - 1) * Math.PI,
    });
    Body.setAngularVelocity(body, (Math.random() * 2 - 1) * 0.18);
    // Разлетаются от точки сброса: вбок случайно, вниз с начальной скоростью
    Body.setVelocity(body, { x: (Math.random() * 2 - 1) * 5, y: 4 + Math.random() * 5 });
    bodies.push({ body, img });
    Composite.add(engine.world, body);
  };

  const drop = () => {
    if (dropped) return;
    dropped = true;
    // Порядок картинок перетасован, чтобы соседи не повторялись
    const order = shuffle(images.map((_, i) => i));
    const count = logoCount();
    let n = 0;
    const tick = () => {
      spawnOne(order[n % order.length]);
      n++;
      if (n < count) dropTimer = setTimeout(tick, DROP_EVERY);
    };
    tick();
  };

  // Без анимаций: логотипы сразу лежат на дне
  const dropInstant = () => {
    if (dropped) return;
    dropped = true;
    const order = shuffle(images.map((_, i) => i));
    const count = logoCount();
    for (let i = 0; i < count; i++) spawnOne(order[i % order.length]);
    for (let i = 0; i < 240; i++) Engine.update(engine, 1000 / 60);
    ceilingOn = true;
    Composite.add(engine.world, makeCeiling());
    walls.push(ceiling);
    draw();
  };

  // На узкой плашке логотипов меньше, чтобы не громоздились в кучу
  const logoCount = () => Math.max(6, Math.min(COUNT, Math.round((width / size) * 1.4)));

  const wake = () => bodies.forEach(({ body }) => Sleeping.set(body, false));

  // ----- рендер -----

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const { body, img } of bodies) {
      if (!img.complete || !img.naturalWidth) continue;
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  };

  const frame = (time) => {
    if (!running) return;
    const delta = lastTime ? Math.min(time - lastTime, 1000 / 30) : 1000 / 60;
    lastTime = time;
    Engine.update(engine, delta);
    if (dropped && !ceilingOn && bodies.length && bodies.every(({ body }) => body.position.y > INSET + size * 0.6)) {
      ceilingOn = true;
      Composite.add(engine.world, makeCeiling());
      walls.push(ceiling);
    }
    // Страховка: тело, продавленное сквозь стенку, возвращаем внутрь
    for (const { body } of bodies) {
      const { x, y } = body.position;
      const cx = Math.min(Math.max(x, INSET + size / 2), width - INSET - size / 2);
      const cy = ceilingOn
        ? Math.min(Math.max(y, INSET + size / 2), height - INSET - size / 2)
        : Math.min(y, height - INSET - size / 2);
      if (cx !== x || cy !== y) {
        Body.setPosition(body, { x: cx, y: cy });
        Body.setVelocity(body, { x: 0, y: 0 });
      }
    }
    draw();
    rafId = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running) return;
    running = true;
    lastTime = 0;
    rafId = requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(rafId);
  };

  // ----- запуск по появлению -----

  resize();

  // Сброс стартует, когда виден низ плашки — чтобы падение было на глазах,
  // а не за кадром; симуляция крутится только пока футер на экране
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          stop();
          return;
        }
        start();
        const r = entry.boundingClientRect;
        const vh = window.innerHeight;
        if (r.bottom <= vh + 40 || entry.intersectionRatio >= 0.6) {
          if (REDUCED.matches) dropInstant();
          else drop();
        }
      });
    },
    { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
  );
  io.observe(block);

  // Смена размера плашки: пересобираем стенки, тела остаются
  let resizeTimer = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      wake();
      draw();
    }, 120);
  });
  ro.observe(block);
}

// Дуга скругления угла из тонких статичных плашек по касательной.
// (cx, cy) — угол плашки, dirX = 1 для левого / −1 для правого,
// dirY = 1 для нижнего / −1 для верхнего.
function cornerArc(cx, cy, r, dirX, dirY) {
  if (r < 24) return [];
  const parts = [];
  const steps = 7;
  const centerX = cx + dirX * r;
  const centerY = cy - dirY * r;
  for (let i = 0; i < steps; i++) {
    // Четверть окружности от горизонтального края к вертикальному
    const a = (dirY * Math.PI) / 2 + (dirX * dirY * (i + 0.5) * (Math.PI / 2)) / steps;
    const x = centerX + Math.cos(a) * r;
    const y = centerY + Math.sin(a) * r;
    const len = (Math.PI / 2) * r / steps + 6;
    parts.push(Bodies.rectangle(x, y, len, 10, { isStatic: true, angle: a + Math.PI / 2 }));
  }
  return parts;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
