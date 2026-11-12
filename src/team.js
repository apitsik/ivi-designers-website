// Team: сцена (100vh) залипает на экране, пока секция прокручивается, и за
// это время рассказывает про команды — сначала папками, потом общим фото.
// Раскадровка в Figma: Team step 1 – step 16 (node 34:445 … 217:1385),
// ховер папки — node 215:733, попап — node 215:1195.
//
// Порядок по скроллу:
//   1. Папки по очереди выезжают снизу и собираются в стопку с наклоном.
//   2. Пауза: стопку можно разглядеть, навести и открыть.
//   3. Заголовок уходит в блюр, первая папка едет на место, остальные вниз.
//   4. К папке по одному подъезжают стикеры.
//   5. Папка со стикерами уходит вверх (стикеры быстрее — параллакс),
//      снизу приходит следующая. И так три раза.
//   6. Пока третья папка доезжает вверх, надзаголовок меняется на
//      «А ещё у нас есть», снизу выходят три фото, затем по очереди
//      приклеиваются четыре жёлтых стикера.
//   7. Дальше всё уходит вверх параллаксом.
//
// Координаты берутся прямо из макета (кадр 1440 × 832) и лежат в data-*
// в index.html. Кадр вписан в экран, его масштаб — в --u, поэтому внутри
// всё считается в пикселях макета. На каждый кадр модуль пишет в CSS
// --x / --y / --rot / --o, а переходы и изинги делает CSS.

import { splitWords, observeReveal } from './reveal.js';
import { lenis } from './smooth-scroll.js';

// Кадр макета и размер папки в нём
const DESIGN_W = 1440;
const DESIGN_H = 832;
const FOLDER_H = 446;

// Сколько экранов скролла занимает секция сверх самой сцены
const STEPS = 8;

// Фазы по общему прогрессу секции (0 — сцена прилипла, 1 — отлипает)
const STACK_END = 0.12; // стопка собралась
const PREVIEW_END = 0.24; // конец паузы-превью
const SPAN = 0.17; // отрезок на одну папку

// Доли внутри отрезка одной папки. Складываются в непрерывный рассказ:
// папка приезжает (0 → 0.30), по одному подъезжают три стикера
// (0.34 → 0.72), всё стоит на месте (0.72 → 0.80), уходит вверх (0.80 → 1).
// Между концом последнего стикера и началом ухода обязателен зазор —
// иначе стикер не успевает встать, а папка уже едет.
const ARRIVE = 0.3;
const LEAVE = 0.2;
const STICKER_START = 0.34;
const STICKER_GAP = 0.1;
const STICKER_LEN = 0.18;

// Следующая папка трогается с места ровно тогда, когда предыдущая
// начинает уходить вверх: пустоты на экране не возникает, но пока папка
// стоит в центре, следующей ещё не видно (в макете это шаг 11).
const OVERLAP = 0.2;

// Стикеры уходят вверх быстрее папки — за счёт этого получается параллакс
const PARALLAX = 1.16;

// Общая для всех папок позиция «на экране» и точка ухода вверх
const REST = { x: 390, y: 248, rot: 0 };
const EXIT_Y = -560;

// Откуда стикер выезжает: ниже своего места на столько пикселей макета
const STICKER_RISE = 620;

// Запас за краем сцены в пикселях макета: на него папка уезжает сверх
// самого края, чтобы не выглядывала тень
const MARGIN = 60;

// ----- четвёртый экран, «А ещё у нас есть» -----

// Начинается, когда третья папка почти уехала за верх экрана
const OTHERS_START = PREVIEW_END + 3 * SPAN - 0.02;
// Надзаголовок меняется на этом отрезке
const SWAP_FROM = OTHERS_START - 0.01;
const SWAP_TO = OTHERS_START + 0.05;
// Фото выходят снизу по очереди
const PHOTO_START = OTHERS_START;
const PHOTO_GAP = 0.025;
const PHOTO_LEN = 0.085;
const PHOTO_RISE = 520;
// Затем по очереди приклеиваются стикеры
const NOTE_START = 0.865;
const NOTE_GAP = 0.016;
const NOTE_LEN = 0.04;
// На сколько стикер отогнут от стены, пока не приклеился
const NOTE_TILT = 78;
// Дальше всё уходит вверх параллаксом
const OTHERS_OUT = 0.965;
const OTHERS_OUT_DIST = 420;

export function initTeam(section, modal) {
  if (!section) return;

  const scene = section.querySelector('.team__scene');
  const stage = section.querySelector('.team__stage');
  const title = section.querySelector('[data-words]');
  const kickerMain = section.querySelector('.team__kicker--main');
  const kickerOthers = section.querySelector('.team__kicker--others');
  const folders = [...section.querySelectorAll('.team-folder')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (title) {
    splitWords(title);
    observeReveal(scene, section);
  }

  section.style.setProperty('--steps', STEPS);

  // ----- раскладка -----

  // Размер и горизонтальная позиция — из data-* макета; вертикальную
  // двигает скролл, поэтому её держим отдельно
  const layout = (node) => {
    const d = node.dataset;
    node.style.width = `${parseFloat(d.w)}px`;
    node.style.height = `${parseFloat(d.h)}px`;
    node.style.setProperty('--x', `${parseFloat(d.x)}px`);
    return { node, y: parseFloat(d.y), order: parseInt(d.order, 10) || 1 };
  };

  const items = folders.map((el, i) => {
    const d = el.dataset;
    const stickers = [...section.querySelectorAll(`.team__sticker[data-folder="${i}"]`)]
      .map((node) => {
        const item = layout(node);
        node.firstElementChild?.style.setProperty('--rot', `${node.dataset.rot || 0}deg`);
        return item;
      })
      .sort((a, b) => a.order - b.order);

    return {
      el,
      stickers,
      enter: { x: num(d.stackX), y: num(d.enterY), rot: num(d.enterRot) },
      stack: { x: num(d.stackX), y: num(d.stackY), rot: num(d.stackRot) },
      park: { x: num(d.parkX), y: num(d.parkY), rot: 0 },
      start: PREVIEW_END + i * SPAN,
    };
  });

  // Фото и стикеры четвёртого экрана
  const photos = [...section.querySelectorAll('.team-photo')]
    .map((node) => {
      const item = layout(node);
      item.frame = node.querySelector('.team-photo__frame');
      item.frame.style.setProperty('--rot', `${node.dataset.rot || 0}deg`);
      return item;
    })
    .sort((a, b) => a.order - b.order);

  const notes = [...section.querySelectorAll('.team-note')]
    .map((node) => {
      const item = layout(node);
      item.stick = node.querySelector('.team-note__stick');
      item.paper = node.querySelector('.team-note__paper');
      item.stick.style.setProperty('--rot', `${node.dataset.rot || 0}deg`);
      return item;
    })
    .sort((a, b) => a.order - b.order);

  // Масштаб кадра: сцена может быть и уже, и шире 1440.
  //
  // Кадр 1440 × 832 вписан в экран по ширине, поэтому над ним и под ним
  // обычно остаются поля — и папка, уехавшая за край кадра, в этих полях
  // всё ещё видна. Высоту полей (в единицах макета) держим в outset и
  // прибавляем ко всем позициям за кадром: так припаркованной снизу папки
  // не видно, пока текущая стоит в центре, на любом экране.
  let outset = MARGIN;

  const resize = () => {
    if (!scene) return;
    const u = scene.clientWidth / DESIGN_W;
    scene.style.setProperty('--u', u);
    const band = stage ? (stage.clientHeight - scene.clientHeight) / 2 : 0;
    outset = MARGIN + (u > 0 ? Math.max(0, band / u) : 0);
  };

  // ----- попап и интерактив -----

  const detail = modal ? initDetail(modal) : null;

  items.forEach(({ el }) => {
    el.addEventListener('click', () => detail?.open(el));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        detail?.open(el);
      }
    });
  });

  initNotes(notes, reduced);
  initPhotos(photos, stage, reduced);

  // ----- бережный режим -----

  // Ничего не ездит: сцена не залипает (это делает CSS), папки стоят
  // обычным списком, стикеры скрыты. Попап при этом работает.
  if (reduced) {
    items.forEach(({ el }) => {
      el.classList.add('is-live');
      el.style.setProperty('--rot', '0deg');
    });
    [...photos, ...notes].forEach(({ node, y }) => {
      node.classList.add('is-live');
      node.style.setProperty('--y', `${y}px`);
      node.style.setProperty('--o', 1);
    });
    resize();
    window.addEventListener('resize', resize);
    return;
  }

  // ----- скролл -----

  let ticking = false;

  const measure = () => {
    ticking = false;
    const rect = section.getBoundingClientRect();
    // Путь от момента, когда сцена прилипла к верху экрана, до конца секции
    const travel = rect.height - window.innerHeight;
    const p = travel > 0 ? clamp(-rect.top / travel, 0, 1) : 0;

    // Заголовок: чёткий до конца паузы, в блюр — пока первая папка едет
    const fade = ease(range(p, PREVIEW_END, PREVIEW_END + ARRIVE * SPAN));
    title?.style.setProperty('--fade', fade.toFixed(4));

    // Надзаголовок меняется на четвёртом экране
    const swap = ease(range(p, SWAP_FROM, SWAP_TO));
    scene?.style.setProperty('--swap', swap.toFixed(4));
    kickerMain?.setAttribute('aria-hidden', swap > 0.5 ? 'true' : 'false');
    kickerOthers?.setAttribute('aria-hidden', swap > 0.5 ? 'false' : 'true');

    items.forEach((item, i) => placeFolder(item, i, p));
    placeOthers(p);
  };

  const placeFolder = (item, i, p) => {
    const { el, stack, start, stickers } = item;
    // Всё, что за кадром, отодвигаем на величину полей (см. resize)
    const enter = { ...item.enter, y: item.enter.y + outset };
    const park = { ...item.park, y: item.park.y + outset };
    const exit = { x: REST.x, y: EXIT_Y - outset, rot: 0 };
    // Первая папка выходит прямо из стопки, остальные стартуют с нахлёстом
    const arriveFrom = i === 0 ? start : start - OVERLAP * SPAN;
    const arriveTo = start + ARRIVE * SPAN;
    const leaveFrom = start + (1 - LEAVE) * SPAN;
    const leaveTo = start + SPAN;

    let pos;

    if (p < STACK_END) {
      // выезжают по очереди снизу и собираются в стопку
      pos = mix(enter, stack, ease(range(p, i * 0.035, STACK_END)));
    } else if (p < PREVIEW_END) {
      // пауза: стопку можно разглядеть и открыть
      pos = stack;
    } else if (p < arriveFrom) {
      // своей очереди ещё нет: опускаемся из стопки вниз и ждём
      pos = mix(stack, park, ease(range(p, PREVIEW_END, PREVIEW_END + ARRIVE * SPAN)));
    } else if (p < arriveTo) {
      // едем на своё место: первая — прямо из стопки, остальные — снизу
      pos = mix(i === 0 ? stack : park, REST, ease(range(p, arriveFrom, arriveTo)));
    } else if (p > leaveFrom) {
      // уходим вверх — третья папка тоже, за ней начинается четвёртый экран
      pos = mix(REST, exit, ease(range(p, leaveFrom, leaveTo)));
    } else {
      pos = REST;
    }

    el.style.setProperty('--x', `${pos.x.toFixed(2)}px`);
    el.style.setProperty('--y', `${pos.y.toFixed(2)}px`);
    el.style.setProperty('--rot', `${pos.rot.toFixed(2)}deg`);

    // Навести и открыть папку можно на всём её пути, а не только в
    // финальной точке: ховер и клик живут, пока папку видно на экране.
    // Поля над кадром и под ним тоже видимая часть экрана — поэтому
    // считаем с их учётом (band), иначе папка «оживала» бы с опозданием.
    const band = outset - MARGIN;
    const onScreen = pos.y + FOLDER_H > -band && pos.y < DESIGN_H + band;
    el.classList.toggle('is-live', onScreen);
    el.tabIndex = onScreen ? 0 : -1;

    // Стикеры: подъезжают по одному после того, как папка встала на место
    const out = ease(range(p, leaveFrom, leaveTo));
    stickers.forEach(({ node, y }, k) => {
      const from = start + (STICKER_START + k * STICKER_GAP) * SPAN;
      const t = ease(range(p, from, from + STICKER_LEN * SPAN));
      const shift = out * (exit.y - REST.y) * PARALLAX;
      node.style.setProperty('--y', `${(y + (1 - t) * (STICKER_RISE + outset) + shift).toFixed(2)}px`);
      node.style.setProperty('--o', Math.min(clamp(t * 3, 0, 1), 1 - clamp((out - 0.55) / 0.45, 0, 1)).toFixed(3));
    });
  };

  // Четвёртый экран: фото выезжают снизу, стикеры приклеиваются, потом
  // всё уходит вверх с разной скоростью
  const placeOthers = (p) => {
    const out = ease(range(p, OTHERS_OUT, 1));

    photos.forEach(({ node, y, frame }, k) => {
      const from = PHOTO_START + k * PHOTO_GAP;
      const t = ease(range(p, from, from + PHOTO_LEN));
      const shift = out * OTHERS_OUT_DIST * (0.85 + k * 0.2);
      node.style.setProperty('--y', `${(y + (1 - t) * (PHOTO_RISE + outset) - shift).toFixed(2)}px`);
      node.style.setProperty('--o', clamp(t * 2.5, 0, 1).toFixed(3));
      node.classList.toggle('is-live', t > 0.5);
      if (t < 0.5) {
        frame.style.setProperty('--dx', '0px');
        frame.style.setProperty('--dy', '0px');
      }
    });

    notes.forEach(({ node, y, stick }, k) => {
      const from = NOTE_START + k * NOTE_GAP;
      const t = easeBack(range(p, from, from + NOTE_LEN));
      // Стикеры уходят чуть быстрее фото — так получается параллакс
      const shift = out * OTHERS_OUT_DIST * (1.45 + k * 0.16);
      node.style.setProperty('--y', `${(y - shift).toFixed(2)}px`);
      node.style.setProperty('--o', clamp(t * 2.5, 0, 1).toFixed(3));
      // Приклеивание: бумага прижимается к стене вокруг верхнего ребра
      stick.style.setProperty('--stick-rx', `${(-(1 - t) * NOTE_TILT).toFixed(2)}deg`);
      node.classList.toggle('is-live', t > 0.8);
      node.tabIndex = t > 0.8 ? 0 : -1;
    });
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(measure);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    resize();
    onScroll();
  });
  resize();
  measure();
}

// ---------- стикеры: ховер и клик ----------

// Клейкий слой только сверху, нижние уголки свободны. Курсор ближе к
// нижнему левому углу — загибается он, ближе к правому — правый. По клику
// стикер отлипает и через три секунды приклеивается обратно.
const PEEL_BACK = 3000; // сколько стикер лежит внизу, прежде чем вернуться
const STICK_BACK = 820; // сколько длится возврат с пружиной
const SLICES = 12; // на сколько полос режем лист
const GLUE = 0.2; // верхняя доля на клею — она не гнётся

// Режем лист на горизонтальные полосы, вложенные друг в друга: поворот
// каждой складывается с поворотом всех, что выше, и изгиб получается
// дугой, а не переломом. Доля полосы (--w) растёт от клейкой зоны к низу,
// а сумма долей равна единице — значит общий угол не зависит от их числа.
//
// Режем в натуральных пикселях картинки и целыми числами: если резать в
// уже уменьшенных, каждая полоса пересчитает изображение со своим дробным
// сдвигом и на стыках появятся светлые нити. Готовый лист уменьшаем целиком.
function buildSlices(node, paper) {
  const img = paper.querySelector('img');
  if (!img) return false;

  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  const boxW = parseFloat(node.style.width) || node.offsetWidth;
  if (!natW || !natH || !boxW) return false;

  const src = img.currentSrc || img.src;
  const scale = document.createElement('span');
  scale.className = 'team-note__scale';
  scale.style.width = `${natW}px`;
  scale.style.height = `${natH}px`;
  scale.style.setProperty('--paper-scale', (boxW / natW).toFixed(5));

  const step = Math.round(natH / SLICES);
  const weights = [];
  for (let i = 0; i < SLICES; i += 1) {
    weights.push(Math.max(0, (i + 1) / SLICES - GLUE) / (1 - GLUE));
  }
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  let host = scale;
  for (let i = 0; i < SLICES; i += 1) {
    const slice = document.createElement('span');
    slice.className = 'team-note__slice';
    slice.style.top = `${i === 0 ? 0 : step}px`;
    // последняя полоса добирает остаток, остальные заходят друг на друга
    const last = i === SLICES - 1;
    slice.style.height = `${last ? natH - step * i : step + 2}px`;
    slice.style.width = `${natW}px`;
    slice.style.backgroundImage = `url("${src}")`;
    slice.style.backgroundSize = `${natW}px ${natH}px`;
    slice.style.backgroundPosition = `0 ${-i * step}px`;
    slice.style.setProperty('--w', (weights[i] / total).toFixed(4));
    host.appendChild(slice);
    host = slice;
  }

  paper.appendChild(scale);
  img.remove();
  return true;
}

// Картинка может быть ещё не загружена — тогда ждём и режем после
function sliceWhenReady(node, paper, done) {
  const img = paper.querySelector('img');
  if (!img) return;
  if (img.complete && img.naturalWidth) {
    done(buildSlices(node, paper));
  } else {
    img.addEventListener('load', () => done(buildSlices(node, paper)), { once: true });
  }
}

function initNotes(notes, reduced) {
  if (reduced) return;

  notes.forEach(({ node, paper, stick }, k) => {
    sliceWhenReady(node, paper, (ok) => {
      if (!ok) return;
      const shadow = document.createElement('span');
      shadow.className = 'team-note__shadow';
      node.insertBefore(shadow, stick);
    });
    // падают с разным наклоном, чтобы не выглядело под копирку
    node.style.setProperty('--fall-spin', `${(k % 2 ? 1 : -1) * (9 + k * 5)}deg`);

    let away = 0;
    let back = 0;

    const relax = () => {
      node.style.setProperty('--lift', '0');
      node.style.setProperty('--side', '0');
    };

    node.addEventListener('pointermove', (e) => {
      if (node.classList.contains('is-falling') || node.classList.contains('is-sticking')) return;
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      // ниже клейкой полосы бумага свободна: чем ниже курсор, тем сильнее
      // отгибается край, а левее или правее — тот уголок и заворачивается
      node.style.setProperty('--lift', clamp((py - GLUE) / (1 - GLUE), 0, 1).toFixed(3));
      node.style.setProperty('--side', clamp((px - 0.5) * 2, -1, 1).toFixed(3));
    });

    node.addEventListener('pointerleave', relax);

    node.addEventListener('click', () => {
      if (node.classList.contains('is-falling')) return;
      relax();
      clearTimeout(away);
      clearTimeout(back);
      node.classList.remove('is-sticking');
      node.classList.add('is-falling');
      away = setTimeout(() => {
        node.classList.remove('is-falling');
        node.classList.add('is-sticking');
        back = setTimeout(() => node.classList.remove('is-sticking'), STICK_BACK);
      }, PEEL_BACK);
    });
  });
}

// ---------- фото: отходят от курсора ----------

// Считаем на всю сцену разом: фото реагирует, когда курсор подошёл близко,
// а не только когда он прямо на нём.
const PHOTO_REACH = 260; // радиус в пикселях экрана
const PHOTO_PUSH = 26; // на сколько отодвигается

function initPhotos(photos, stage, reduced) {
  if (reduced || !stage || !photos.length) return;

  let point = null;
  let ticking = false;

  const apply = () => {
    ticking = false;
    photos.forEach(({ node, frame }) => {
      if (!point || !node.classList.contains('is-live')) {
        frame.style.setProperty('--dx', '0px');
        frame.style.setProperty('--dy', '0px');
        return;
      }
      const r = node.getBoundingClientRect();
      const dx = point.x - (r.left + r.width / 2);
      const dy = point.y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const near = clamp(1 - dist / PHOTO_REACH, 0, 1);
      if (!near) {
        frame.style.setProperty('--dx', '0px');
        frame.style.setProperty('--dy', '0px');
        return;
      }
      const k = (near * PHOTO_PUSH) / (dist || 1);
      frame.style.setProperty('--dx', `${(-dx * k).toFixed(2)}px`);
      frame.style.setProperty('--dy', `${(-dy * k).toFixed(2)}px`);
    });
  };

  const onMove = (e) => {
    point = { x: e.clientX, y: e.clientY };
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(apply);
    }
  };

  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerleave', () => {
    point = null;
    apply();
  });
}

// ---------- попап команды ----------

// Оверлей и появление диалога — общие с попапами шоурилов и статей
// (.video-modal, src/showreels.css). Внутри — горизонтальный слайдер
// карточек: содержимое лежит в <template> внутри самой папки, поэтому
// текст и картинки правятся в index.html рядом с командой.
function initDetail(modal) {
  const dialog = modal.querySelector('.video-modal__dialog');
  const name = modal.querySelector('.team-modal__name');
  const viewport = modal.querySelector('.team-modal__viewport');
  const track = modal.querySelector('.team-modal__track');
  const closeBtn = modal.querySelector('.video-modal__close');
  const arrows = [...modal.querySelectorAll('.team-modal__arrow')];

  let opener = null;
  let hideTimer = 0;
  let index = 0;

  const maxShift = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

  const shiftFor = (i) => {
    const cards = [...track.children];
    let x = 0;
    for (let k = 0; k < i && k < cards.length; k += 1) x += cards[k].offsetWidth + 24;
    return Math.min(x, maxShift());
  };

  const go = (i) => {
    index = clamp(i, 0, Math.max(0, track.children.length - 1));
    const shift = shiftFor(index);
    track.style.setProperty('--shift', `${-shift}px`);
    arrows.forEach((a) => {
      const dir = Number(a.dataset.dir);
      a.disabled = dir < 0 ? shift <= 0 : shift >= maxShift() - 1;
    });
  };

  const open = (folder) => {
    if (!folder.classList.contains('is-live')) return;
    const tpl = folder.querySelector('.team-folder__detail');
    if (!tpl) return;

    opener = folder;
    clearTimeout(hideTimer);
    folder.classList.add('is-open');

    name.textContent = folder.dataset.detailName || '';
    track.replaceChildren(tpl.content.cloneNode(true));
    // Карточка, картинки для которой ещё не положили в public/images/team,
    // просто не показывается — в слайдере не будет пустых мест
    track.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => {
        img.closest('.team-modal__card')?.remove();
        go(index);
      }, { once: true });
    });
    track.style.setProperty('--shift', '0px');
    index = 0;

    // Папка успевает заметно раскрыться — листы рвутся наружу, передний
    // сгиб отваливается сильнее, — и только потом сверху приходит попап
    setTimeout(() => {
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('video-modal-open');
      lenis?.stop();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        modal.classList.add('video-modal--open');
        go(0);
      }));
      closeBtn?.focus({ preventScroll: true });
    }, 420);
  };

  const close = () => {
    if (modal.hidden) return;
    modal.classList.remove('video-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('video-modal-open');
    lenis?.start();
    hideTimer = setTimeout(() => {
      modal.hidden = true;
      track.replaceChildren();
    }, 350);
    if (opener) {
      // Листы уезжают обратно в папку — то же движение в обратную сторону
      opener.classList.remove('is-open');
      opener.focus?.({ preventScroll: true });
      opener = null;
    }
  };

  // Ближайшая карточка к произвольному сдвигу — куда слайдер доводится
  // после того, как его отпустили
  const nearest = (shift) => {
    let best = 0;
    let bestGap = Infinity;
    for (let k = 0; k < track.children.length; k += 1) {
      const gap = Math.abs(shiftFor(k) - shift);
      if (gap < bestGap) {
        bestGap = gap;
        best = k;
      }
    }
    return best;
  };

  // Слайдер можно просто тянуть — мышью или пальцем
  let dragging = false;
  let startX = 0;
  let startShift = 0;

  viewport.addEventListener('pointerdown', (e) => {
    if (track.children.length < 2) return;
    dragging = true;
    startX = e.clientX;
    startShift = shiftFor(index);
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const shift = clamp(startShift - (e.clientX - startX), 0, maxShift());
    track.style.setProperty('--shift', `${-shift}px`);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    go(nearest(clamp(startShift - (e.clientX - startX), 0, maxShift())));
  };

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('dragstart', (e) => e.preventDefault());

  arrows.forEach((a) => a.addEventListener('click', () => go(index + Number(a.dataset.dir))));
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  });
  window.addEventListener('resize', () => {
    if (!modal.hidden) go(index);
  });

  return { open, close };
}

// ---------- мелочи ----------

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Доля пути между двумя точками прогресса, 0…1
function range(p, from, to) {
  if (to <= from) return p >= to ? 1 : 0;
  return clamp((p - from) / (to - from), 0, 1);
}

function mix(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    rot: a.rot + (b.rot - a.rot) * t,
  };
}

// Мягкое торможение в конце пути
function ease(t) {
  return 1 - Math.pow(1 - t, 3);
}

// То же, но с перелётом: лист касается стены, слегка отыгрывает назад
// и только потом прилипает
function easeBack(t) {
  const c = 1.7;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
