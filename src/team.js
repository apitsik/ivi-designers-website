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
const STACK_END = 0.1; // стопка собралась
const PREVIEW_END = 0.16; // конец паузы-превью
const SPAN = 0.17; // отрезок на одну папку

// Доли внутри отрезка одной папки. Складываются в непрерывный рассказ:
// папка приезжает (0 → 0.30), по одному подъезжают три стикера
// (0.34 → 0.72), всё стоит на месте (0.72 → 0.80), уходит вверх (0.80 → 1).
// Между концом последнего стикера и началом ухода обязателен зазор —
// иначе стикер не успевает встать, а папка уже едет.
const ARRIVE = 0.3;
const LEAVE = 0.26;
const STICKER_START = 0.34;
const STICKER_GAP = 0.1;
const STICKER_LEN = 0.18;

// Следующая папка трогается с места ровно тогда, когда предыдущая
// начинает уходить вверх: пустоты на экране не возникает, но пока папка
// стоит в центре, следующей ещё не видно (в макете это шаг 11).
// Поэтому OVERLAP всегда равен LEAVE — разъезжаться им нельзя.
const OVERLAP = LEAVE;

// Стикеры уходят вверх быстрее папки — за счёт этого получается параллакс
const PARALLAX = 1.16;

// Общая для всех папок позиция «на экране» и точка ухода вверх
const REST = { x: 390, y: 248, rot: 0 };
const EXIT_Y = -520;

// Откуда стикер выезжает: ниже своего места на столько пикселей макета
const STICKER_RISE = 620;

// Телефон и планшет (вертикальный): кадр шире экрана, а папки, стикеры и
// заголовок ставятся не по кадру 1440 × 832, а по отдельным макетам
// («Resizes» в Figma: team-mobile-step1…9 и Team (step 1…3)). Координаты
// ниже — пиксели макета (ширина 392 у телефона и 832 у планшета), считаются
// от центра экрана по высоте, поэтому композиция подстраивается под
// высоту окна браузера.
const COMPACT = window.matchMedia('(max-width: 720px), (max-width: 1024px) and (orientation: portrait)');
const FOLDER_W = 660;
const SCALE_PHONE = 0.446; // масштаб папки в макете телефона (294 / 660)
const SCALE_TABLET = 0.918; // и планшета (606 / 660)

// bbox — габарит повёрнутой папки из Figma: [x, y, поворот°]; у папки без
// поворота это просто левый верхний угол
const PHONE = {
  width: 392,
  height: 662,
  scale: SCALE_PHONE,
  title: 128, // верх заголовка
  folders: [
    // enter — шаг 1 (папки въезжают с поворотом), stack — шаг 2 (собрались)
    { enter: [37, 210, 8.1], stack: [43, 220, 3.7], park: null, rest: [49, 159] },
    { enter: [17, 348, -8.9], stack: [21, 308, -6], park: [40, 497, -5.7], rest: [49, 227] },
    { enter: [41, 530, 14.8], stack: [54, 414, 4.8], park: [58, 567, 2.4], rest: [49, 229] },
  ],
  // стикеры: центр в макете [x, y] и масштаб (boost) относительно папки
  stickers: [
    [[48, 247], [319, 360.5], [135.5, 403]],
    [[33, 272.5], [363.5, 426.5], [133.5, 474.5], null],
    [[362.5, 369, 0.77], [81, 433.5, 0.77], [96, 168, 0.77]],
  ],
};

const TABLET = {
  width: 832,
  height: 1440,
  scale: SCALE_TABLET,
  title: 236,
  folders: [
    { stack: [106, 476, 3.7], park: null, rest: [113, 488] },
    { stack: [8, 687, -6], park: [94, 1165, -5.7], rest: [113, 488] },
    { stack: [82, 992, 4.8], park: [131, 1250, 2.4], rest: [113, 488] },
  ],
  stickers: [
    // шаг 3 макета: центры bbox
    [[111.5, 670], [668, 902], [291.5, 990]],
    null, // стикеры 2-й и 3-й папок: как на телефоне, увеличенные (см. layoutCompact)
    null,
  ],
};

// Фото и стикеры четвёртого экрана: доли ширины и высоты экрана
// (левый верхний угол) и крупность относительно кадра
const COMPACT_OTHERS_BOOST = { phone: 1.5, tablet: 1.2 };
const MOBILE_PHOTOS = [
  [0.05, 0.3],
  [0.45, 0.4],
  [0.12, 0.62],
];
const MOBILE_NOTES = [
  [0.58, 0.29],
  [0.04, 0.52],
  [0.62, 0.7],
  [0.3, 0.84],
];

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
// Фото и стикеры чередуются: фото, стикер, фото, стикер…
const SLOT = 0.024;
const PHOTO_GAP = SLOT * 2;
const PHOTO_LEN = 0.085;
const PHOTO_RISE = 520;
// Затем по очереди приклеиваются стикеры
const NOTE_START = OTHERS_START + SLOT;
const NOTE_GAP = SLOT * 2;
const NOTE_LEN = 0.04;
// На сколько стикер отогнут от стены, пока не приклеился
const NOTE_TILT = 78;
// Дальше всё уходит вверх параллаксом
const OTHERS_OUT = OTHERS_START + 0.25; // последний стикер встаёт к ~0.88, уход начинается сразу за ним
const OTHERS_OUT_DIST = 980; // к концу сцены фото и стикеры должны полностью уйти за верхний край

export function initTeam(section, modal) {
  if (!section) return;

  const scene = section.querySelector('.team__scene');
  const stage = section.querySelector('.team__stage');
  const title = section.querySelector('[data-words]');
  const titleOthers = section.querySelector('.team__title--others');
  const folders = [...section.querySelectorAll('.team-folder')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (title) {
    splitWords(title);
    observeReveal(scene, section);
  }
  if (titleOthers) splitWords(titleOthers);

  section.style.setProperty('--steps', STEPS);

  // ----- раскладка -----

  // Размер и горизонтальная позиция — из data-* макета; вертикальную
  // двигает скролл, поэтому её держим отдельно
  const layout = (node) => {
    const d = node.dataset;
    node.style.width = `${parseFloat(d.w)}px`;
    node.style.height = `${parseFloat(d.h)}px`;
    node.style.setProperty('--x', `${parseFloat(d.x)}px`);
    return {
      node,
      x: parseFloat(d.x),
      x0: parseFloat(d.x),
      y: parseFloat(d.y),
      y0: parseFloat(d.y),
      w: parseFloat(d.w),
      order: parseInt(d.order, 10) || 1,
    };
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

    const base = {
      enter: { x: num(d.stackX), y: num(d.enterY), rot: num(d.enterRot) },
      stack: { x: num(d.stackX), y: num(d.stackY), rot: num(d.stackRot) },
      park: { x: num(d.parkX), y: num(d.parkY), rot: 0 },
    };
    return {
      el,
      stickers,
      base,
      // текущая раскладка (считает resize: на десктопе — из base с полями,
      // на телефоне и планшете — из макетов выше)
      cfg: null,
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
    layoutCompact(u);
  };

  // Раскладка по макетам телефона и планшета; на десктопе — исходная.
  // Всё считаем от центра сцены на экране: сцена стоит по центру и ширины,
  // и высоты, поэтому макетные координаты переводятся так:
  //   px = центр экрана + (координата макета − центр макета) × масштаб
  // а из пикселей — в единицы кадра делением на --u.
  const layoutCompact = (u) => {
    const compact = COMPACT.matches;
    const stageW = stage ? stage.clientWidth : window.innerWidth;
    const stageH = stage ? stage.clientHeight : window.innerHeight;
    const sceneLeft = (stageW - scene.clientWidth) / 2;
    const sceneTop = (stageH - scene.clientHeight) / 2;
    const mock = stageW <= 720 ? PHONE : TABLET;
    const phone = mock === PHONE;
    scene.classList.toggle('is-compact', compact);

    if (!compact || u <= 0) {
      items.forEach((item) => {
        const { base } = item;
        item.cfg = {
          enter: { ...base.enter, y: base.enter.y + outset },
          stack: base.stack,
          park: { ...base.park, y: base.park.y + outset },
          rest: REST,
          exit: { x: REST.x, y: EXIT_Y - outset, rot: 0 },
          compact: false,
        };
        item.stickers.forEach((s) => {
          s.x = s.x0;
          s.rise = STICKER_RISE + outset;
          s.y = s.y0;
          s.shift = (REST.y - EXIT_Y + outset) * PARALLAX;
          s.node.style.setProperty('--x', `${s.x.toFixed(2)}px`);
          s.node.style.removeProperty('--boost');
          s.node.hidden = false;
        });
      });
      layoutOthers(u, false, sceneLeft, sceneTop, stageH);
      scene.style.removeProperty('--title-top');
      return;
    }

    // сжатие по вертикали, если окно ниже макета (и растяжение, если выше)
    const sx = stageW / mock.width;
    const k = clamp(stageH / (sx * mock.height), 0.72, 1.2);
    const mockU = mock.scale; // размер папки в макете
    const fw = FOLDER_W * mockU;
    const fh = FOLDER_H * mockU;
    const toPxX = (mx) => stageW / 2 + (mx - mock.width / 2) * sx;
    const toPxY = (my) => stageH / 2 + (my - mock.height / 2) * sx * k;
    // центр папки в кадре (единицы кадра) по пикселям экрана
    const fold = (cx, cy, rot) => ({
      x: (cx - sceneLeft) / u - FOLDER_W / 2,
      y: (cy - sceneTop) / u - FOLDER_H / 2,
      rot,
    });
    // габарит повёрнутой папки в макете → её центр в пикселях
    const centerOf = ([bx, by, rot]) => {
      const r = (rot * Math.PI) / 180;
      const bw = fw * Math.abs(Math.cos(r)) + fh * Math.abs(Math.sin(r));
      const bh = fw * Math.abs(Math.sin(r)) + fh * Math.abs(Math.cos(r));
      return { cx: toPxX(bx + bw / 2), cy: toPxY(by + bh / 2) };
    };

    scene.style.setProperty('--title-top', `${(toPxY(mock.title) - sceneTop).toFixed(1)}px`);

    const folderPx = fh * sx; // высота папки на экране (= FOLDER_H·u)
    items.forEach((item, i) => {
      const m = mock.folders[i];
      const st = centerOf(m.stack);
      const en = m.enter ? centerOf(m.enter) : st;
      const rest = centerOf([m.rest[0], m.rest[1], 0]);
      const park = m.park ? centerOf(m.park) : st;
      const x = (cx) => cx;
      // выезд снизу: полностью за нижним краем экрана
      const belowY = stageH + folderPx * 0.75;
      item.cfg = {
        enter: m.enter
          ? fold(en.cx, belowY + 60 * i, m.enter[2] * 1.6)
          : fold(st.cx, belowY + 60 * i, m.stack[2] * 1.5),
        stack: fold(st.cx, st.cy, m.stack[2]),
        park: fold(park.cx, park.cy, m.park ? m.park[2] : 0),
        rest: fold(rest.cx, rest.cy, 0),
        exit: fold(rest.cx, -folderPx * 0.75, 0),
        compact: true,
      };
      const restTop = rest.cy - folderPx / 2;
      const folderDist = restTop + folderPx + 30; // путь папки до выхода за верх

      // Стикеры: центр из макета; у планшетных второй и третьей папок
      // берём телефонные, смещённые от центра папки и увеличенные
      const list = item.stickers;
      list.forEach((s, j) => {
        let spec = mock.stickers[i]?.[j];
        let boost = 1;
        if (!mock.stickers[i] && PHONE.stickers[i]) {
          const ps = PHONE.stickers[i][j];
          const pr = PHONE.folders[i].rest;
          const pc = [pr[0] + (FOLDER_W * SCALE_PHONE) / 2, pr[1] + (FOLDER_H * SCALE_PHONE) / 2];
          const f = SCALE_TABLET / SCALE_PHONE;
          const rc = [m.rest[0] + fw / 2, m.rest[1] + fh / 2];
          spec = ps ? [rc[0] + (ps[0] - pc[0]) * f, rc[1] + (ps[1] - pc[1]) * f, 1] : null;
        } else if (spec && spec[2]) {
          boost = spec[2];
        }
        s.node.hidden = !spec;
        if (!spec) return;
        const su = u * boost;
        const cx = toPxX(spec[0]);
        const cy = toPxY(spec[1]);
        s.x = (cx - sceneLeft) / su - s.w / 2;
        s.y = (cy - sceneTop) / su - parseFloat(s.node.dataset.h) / 2;
        const h = parseFloat(s.node.dataset.h);
        // выезжает снизу из-под экрана
        s.rise = (stageH + 30 - sceneTop) / su - s.y;
        // уходит вверх чуть быстрее папки и целиком за верх экрана
        s.shift = Math.max(s.y + h + (sceneTop + 30) / su, (folderDist * PARALLAX) / su);
        s.node.style.setProperty('--x', `${s.x.toFixed(2)}px`);
        s.node.style.setProperty('--boost', boost);
      });
    });
    // Предыдущая папка остаётся сверху полупрозрачной: отступ до неё равен
    // отступу от активной папки до следующей (как карусель)
    const rest1 = centerOf([mock.folders[1].rest[0], mock.folders[1].rest[1], 0]);
    const park2 = centerOf(mock.folders[2].park);
    const gapD = park2.cy - rest1.cy;
    [0, 1].forEach((i) => {
      const m = mock.folders[i];
      const nextRest = centerOf([mock.folders[i + 1].rest[0], mock.folders[i + 1].rest[1], 0]);
      const own = centerOf([m.rest[0], m.rest[1], 0]);
      items[i].cfg.prev = fold(own.cx, nextRest.cy - gapD, 0);
    });
    layoutOthers(u, true, sceneLeft, sceneTop, stageH, phone ? 'phone' : 'tablet');
  };

  // Фото и стикеры четвёртого экрана
  const layoutOthers = (u, compact, sceneLeft, sceneTop, stageH, kind = 'phone') => {
    const stageW = stage ? stage.clientWidth : window.innerWidth;
    let boost = compact ? COMPACT_OTHERS_BOOST[kind] : 1;
    let squeeze = 1;

    if (compact && u > 0) {
      // Всё должно поместиться по высоте окна: если нижний стикер вылезает
      // за экран, уменьшаем крупность и сжимаем раскладку к верху
      const top0 = 0.25 * stageH;
      const limit = stageH - 20;
      let bottom = 0;
      [[photos, MOBILE_PHOTOS], [notes, MOBILE_NOTES]].forEach(([list, table]) => {
        list.forEach((o, k) => {
          if (!table[k]) return;
          const h = parseFloat(o.node.dataset.h) * u * boost;
          bottom = Math.max(bottom, table[k][1] * stageH + h);
        });
      });
      if (bottom > limit) squeeze = clamp((limit - top0) / (bottom - top0), 0.6, 1);
    }

    const place = (list, table) => {
      list.forEach((o, k) => {
        if (compact && u > 0 && table[k]) {
          const s = u * boost * squeeze;
          const top0 = 0.25 * stageH;
          const y = top0 + (table[k][1] * stageH - top0) * squeeze;
          o.x = (table[k][0] * stageW - sceneLeft) / s;
          o.y = (y - sceneTop) / s;
          o.node.style.setProperty('--boost', boost * squeeze);
        } else {
          o.x = o.x0;
          o.y = o.y0;
          o.node.style.removeProperty('--boost');
        }
        o.node.style.setProperty('--x', `${o.x.toFixed(2)}px`);
      });
    };
    place(photos, MOBILE_PHOTOS);
    place(notes, MOBILE_NOTES);
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
    titleOthers?.setAttribute('aria-hidden', swap > 0.5 ? 'false' : 'true');
    // слова проявляются из блюра, как у остальных H2
    titleOthers?.classList.toggle('is-in', swap > 0.3);

    items.forEach((item, i) => placeFolder(item, i, p));
    placeOthers(p);
  };

  const placeFolder = (item, i, p) => {
    const { el, start, stickers, cfg } = item;
    // Позиции (с учётом полей или макета телефона) считает resize
    const { enter, stack, park, rest: REST, exit, prev } = cfg;
    // Первая папка выходит прямо из стопки, остальные стартуют с нахлёстом
    const arriveFrom = i === 0 ? start : start - OVERLAP * SPAN;
    const arriveTo = start + ARRIVE * SPAN;
    const leaveFrom = start + (1 - LEAVE) * SPAN;
    const leaveTo = start + SPAN;

    let pos;
    let fo = 1;

    if (p < STACK_END) {
      // выезжают по очереди снизу и собираются в стопку
      pos = mix(enter, stack, glide(range(p, i * 0.035, STACK_END)));
    } else if (p < PREVIEW_END) {
      // пауза: стопку можно разглядеть и открыть
      pos = stack;
    } else if (p < arriveFrom) {
      // своей очереди ещё нет: опускаемся из стопки вниз и ждём
      const t = glide(range(p, PREVIEW_END, PREVIEW_END + ARRIVE * SPAN));
      pos = mix(stack, park, t);

    } else if (p < arriveTo) {
      // едем на своё место: первая — прямо из стопки, остальные — снизу
      const t = glide(range(p, arriveFrom, arriveTo));
      pos = mix(i === 0 ? stack : park, REST, t);
    } else if (p > leaveFrom) {
      // уходим вверх — третья папка тоже, за ней начинается четвёртый экран.
      // На телефоне и планшете первая и вторая папки сперва остаются сверху
      // полупрозрачными, а уходят совсем, когда уезжает следующая.
      if (prev) {
        const out2 = glide(range(p, leaveFrom + SPAN, leaveTo + SPAN));
        pos = out2 > 0 ? mix(prev, exit, out2) : mix(REST, prev, glide(range(p, leaveFrom, leaveTo)));
        fo = 1 - 0.7 * glide(range(p, leaveFrom, leaveTo));
      } else {
        pos = mix(REST, exit, glide(range(p, leaveFrom, leaveTo)));
      }
    } else {
      pos = REST;
    }

    el.style.setProperty('--x', `${pos.x.toFixed(2)}px`);
    el.style.setProperty('--y', `${pos.y.toFixed(2)}px`);
    el.style.setProperty('--rot', `${pos.rot.toFixed(2)}deg`);
    el.style.setProperty('--fo', fo.toFixed(3));
    // телефон и планшет: пока папка стоит на месте и её обклеивают
    // стикерами, она «раскрыта» — как на десктопе при наведении
    const arriveEnd = start + ARRIVE * SPAN;
    el.classList.toggle('is-focus', cfg.compact && p > arriveEnd - 0.1 * ARRIVE * SPAN && p < leaveFrom + 0.1 * LEAVE * SPAN);

    // Навести и открыть папку можно на всём её пути, а не только в
    // финальной точке: ховер и клик живут, пока папку видно на экране.
    // Поля над кадром и под ним тоже видимая часть экрана — поэтому
    // считаем с их учётом (band), иначе папка «оживала» бы с опозданием.
    const stageH = stage ? stage.clientHeight : window.innerHeight;
    const u = scene.clientWidth / DESIGN_W;
    const topPx = (stageH - scene.clientHeight) / 2 + pos.y * u;
    const onScreen = topPx + FOLDER_H * u > 0 && topPx < stageH;
    el.classList.toggle('is-live', onScreen);
    el.tabIndex = onScreen ? 0 : -1;

    // Стикеры: подъезжают по одному после того, как папка встала на место
    const out = glide(range(p, leaveFrom, leaveTo));
    stickers.forEach(({ node, y, rise, shift: dist }, k) => {
      const from = start + (STICKER_START + k * STICKER_GAP) * SPAN;
      const t = ease(range(p, from, from + STICKER_LEN * SPAN));
      const shift = -out * dist;
      node.style.setProperty('--y', `${(y + (1 - t) * rise + shift).toFixed(2)}px`);
      node.style.setProperty('--o', Math.min(clamp(t * 3, 0, 1), 1 - clamp((out - 0.55) / 0.45, 0, 1)).toFixed(3));
    });
  };

  // Четвёртый экран: фото выезжают снизу, стикеры приклеиваются, потом
  // всё уходит вверх с разной скоростью
  const placeOthers = (p) => {
    // Без сглаживания на конце: иначе параллакс замирал прямо перед тем,
    // как сцена отпускает экран, и фото зависали поверх заголовка
    const compact = COMPACT.matches;
    const out = range(p, compact ? OTHERS_OUT - 0.06 : OTHERS_OUT, compact ? 0.92 : 1);
    // Надзаголовок уходит целиком в блюр и прозрачность вместе с фото
    scene?.style.setProperty('--swapout', compact ? ease(range(p, OTHERS_OUT - 0.06, OTHERS_OUT + 0.02)).toFixed(4) : 0);

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
      stick.style.setProperty('--stick-rx', `${((1 - t) * NOTE_TILT).toFixed(2)}deg`);
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

// Пластика листа — как у стикеров в хиро: лист режется на полосы и гнётся
// волной. Полосы — соседи, а не вложены друг в друга: цепочку проходим
// здесь и каждой полосе ставим готовое положение. У вложенных повороты
// копятся слоями, и на стыках вылезают швы.
const STRIPS = 10; // полос на лист
const GLUE = 0.2; // верхняя доля на клею — она не гнётся
const CURL_DEG = 92; // общий угол отгиба при полном наведении
// Линия сгиба строго горизонтальна. Наклонить её нельзя: полосы плоские,
// и при наклонной оси соседние расходятся клиньями тем сильнее, чем
// дальше от оси. Крен в сторону курсора даёт поворот всего листа.
const SWAY_DEG = 12; // на сколько лист разворачивается к курсору
const CURL_REACH = 0.85; // с какого расстояния до нижнего края лист реагирует

// Бумага на картинке не до конца непрозрачная (альфа 245 из 255). Если
// нарезать её как есть, в местах нахлёста она складывается сама с собой и
// даёт светлую полосу, а без нахлёста между слоями просвечивает фон. Поэтому
// перед нарезкой доводим непрозрачные места до конца — на глаз разницы в
// четыре процента нет, а полосы поперёк листа пропадают.
function opaque(img, w, h) {
  const src = img.currentSrc || img.src;
  try {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] > 128) px[i] = 255;
    }
    ctx.putImageData(data, 0, 0);
    return cv.toDataURL('image/png');
  } catch {
    return src;
  }
}

// Лист → полосы. Режем в натуральных пикселях картинки и целыми числами,
// иначе каждая полоса пересчитает изображение со своим дробным сдвигом.
function buildStrips(node, paper) {
  const img = paper.querySelector('img');
  if (!img) return null;
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  const boxW = parseFloat(node.style.width) || node.offsetWidth;
  if (!natW || !natH || !boxW) return null;

  const src = opaque(img, natW, natH);
  const sheet = document.createElement('span');
  sheet.className = 'team-note__sheet';
  sheet.style.width = `${natW}px`;
  sheet.style.height = `${natH}px`;
  sheet.style.setProperty('--paper-scale', (boxW / natW).toFixed(5));

  // шаг целый: при дробном каждая полоса пересчитает картинку со своим
  // дробным сдвигом, и на стыках появятся светлые нити
  const step = Math.max(1, Math.round(natH / STRIPS));
  const strips = [];
  const weights = [];
  for (let k = 0; k < STRIPS; k += 1) {
    const st = document.createElement('span');
    st.className = 'team-note__strip';
    st.style.width = `${natW}px`;
    // Последняя добирает остаток, остальные заходят друг на друга на
    // пару пикселей — чтобы между слоями не просвечивал фон
    const last = k === STRIPS - 1;
    st.style.height = `${last ? Math.max(step, natH - step * k) : step + 2}px`;
    st.style.transformOrigin = '0 0';
    st.style.backgroundImage = `url("${src}")`;
    st.style.backgroundSize = `${natW}px ${natH}px`;
    st.style.backgroundPosition = `0 ${-k * step}px`;
    sheet.appendChild(st);
    strips.push(st);
    // доля общего изгиба: в клейкой зоне ноль, дальше растёт к низу
    weights.push(Math.max(0, (k + 1) / STRIPS - GLUE) / (1 - GLUE));
  }
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  paper.appendChild(sheet);
  img.remove();
  return { strips, step, weights: weights.map((w) => w / total) };
}

// Кадр изгиба. Идём по цепочке сверху вниз и копим ориентацию полосы
// честной матрицей поворота: сгиб между полосами может быть наклонным
// (тогда заворачивается ближний к курсору нижний угол, а не вся грань),
// а при наклонной оси положение следующей полосы уже не выводится из
// одних лишь y и z — полосы разъезжаются. Поэтому каждой полосе отдаём
// готовую matrix3d: начало — конец предыдущей, поворот — накопленный.
function bendSheet(sheet, curl) {
  const { strips, step, weights } = sheet;
  const totalDeg = curl * CURL_DEG;

  // ориентация (по строкам) и начало текущей полосы
  let r = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  let ox = 0;
  let oy = 0;
  let oz = 0;

  for (let k = 0; k < strips.length; k += 1) {
    strips[k].style.transform =
      `matrix3d(${r[0]},${r[3]},${r[6]},0,${r[1]},${r[4]},${r[7]},0,${r[2]},${r[5]},${r[8]},0,` +
      `${ox.toFixed(2)},${oy.toFixed(2)},${oz.toFixed(2)},1)`;

    // нижний край этой полосы — начало следующей
    ox += r[1] * step;
    oy += r[4] * step;
    oz += r[7] * step;

    // сгиб под полосой: поворот вокруг её верхнего ребра
    const a = (totalDeg * weights[k] * Math.PI) / 180;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const m = [1, 0, 0, 0, c, -sn, 0, sn, c];
    r = [
      r[0] * m[0] + r[1] * m[3] + r[2] * m[6], r[0] * m[1] + r[1] * m[4] + r[2] * m[7], r[0] * m[2] + r[1] * m[5] + r[2] * m[8],
      r[3] * m[0] + r[4] * m[3] + r[5] * m[6], r[3] * m[1] + r[4] * m[4] + r[5] * m[7], r[3] * m[2] + r[4] * m[5] + r[5] * m[8],
      r[6] * m[0] + r[7] * m[3] + r[8] * m[6], r[6] * m[1] + r[7] * m[4] + r[8] * m[7], r[6] * m[2] + r[7] * m[5] + r[8] * m[8],
    ];
  }
}

function initNotes(notes, reduced) {
  if (reduced) return;

  notes.forEach(({ node, paper }, k) => {
    const shadow = document.createElement('span');
    shadow.className = 'team-note__shadow';
    node.insertBefore(shadow, node.firstElementChild);

    // падают с разным наклоном, чтобы не выглядело под копирку
    node.style.setProperty('--fall-spin', `${(k % 2 ? 1 : -1) * (9 + k * 5)}deg`);

    let sheet = null;
    const ready = () => {
      sheet = buildStrips(node, paper);
      if (sheet) bendSheet(sheet, 0);
    };
    const img = paper.querySelector('img');
    if (img && img.complete && img.naturalWidth) ready();
    else img?.addEventListener('load', ready, { once: true });

    let away = 0;
    let back = 0;
    let frame = 0;
    // куда тянемся и где сейчас: лист догоняет курсор, а не прыгает за ним,
    // и так же мягко распрямляется, когда курсор ушёл
    const want = { curl: 0, side: 0 };
    const now = { curl: 0, side: 0 };

    const draw = () => {
      now.curl += (want.curl - now.curl) * 0.18;
      now.side += (want.side - now.side) * 0.18;
      const rest = Math.abs(want.curl - now.curl) < 0.002 && Math.abs(want.side - now.side) < 0.002;
      if (rest) {
        now.curl = want.curl;
        now.side = want.side;
      }
      if (sheet) bendSheet(sheet, now.curl);
      node.style.setProperty('--curl', now.curl.toFixed(3));
      node.style.setProperty('--side', now.side.toFixed(3));
      node.style.setProperty('--sway', `${(now.side * now.curl * SWAY_DEG).toFixed(2)}deg`);
      frame = rest ? 0 : requestAnimationFrame(draw);
    };

    const schedule = (curl, side) => {
      want.curl = curl;
      want.side = side;
      if (!frame) frame = requestAnimationFrame(draw);
    };

    node.addEventListener('pointermove', (e) => {
      if (node.classList.contains('is-falling') || node.classList.contains('is-sticking')) return;
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      // чем ближе курсор к нижнему краю, тем сильнее отгиб; верх на клею
      const curl = clamp((py - GLUE) / (CURL_REACH - GLUE), 0, 1);
      // куда наклонена линия сгиба — туда и заворачивается угол
      schedule(curl, clamp((px - 0.5) * 2, -1, 1));
    });

    node.addEventListener('pointerleave', () => schedule(0, 0));

    node.addEventListener('click', () => {
      if (node.classList.contains('is-falling')) return;
      schedule(0, 0);
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
  // Секция нужна, чтобы притушить сцену под открытым попапом
  const section = document.querySelector('.team');
  const dialog = modal.querySelector('.video-modal__dialog');
  const name = modal.querySelector('.team-modal__name');
  const viewport = modal.querySelector('.team-modal__viewport');
  const track = modal.querySelector('.team-modal__track');
  const closeBtn = modal.querySelector('.video-modal__close');
  const arrows = [...modal.querySelectorAll('.team-modal__arrow')];

  const GAP = 24;
  const FRICTION = 0.93; // как быстро гаснет инерция после броска
  const CATCH = 0.12; // доля пути за кадр, когда ведут стрелки

  let opener = null;
  let hideTimer = 0;

  // Лента едет свободно: shift — сколько пикселей уехало влево. Карточки
  // ни к чему не прилипают. loop — ширина одной копии списка: лента
  // склеена трижды, и как только уезжаем за копию, незаметно
  // возвращаемся назад. Для человека лента бесконечная.
  let shift = 0;
  let loop = 0;
  let vel = 0;
  let target = null;
  let raf = 0;

  const draw = () => {
    track.style.setProperty('--shift', `${-shift}px`);
  };

  // Держим сдвиг внутри одной копии; цель едет вместе с ним, иначе
  // при перескоке лента дёрнулась бы
  const wrap = () => {
    if (loop <= 0) return;
    while (shift >= loop) {
      shift -= loop;
      if (target !== null) target -= loop;
    }
    while (shift < 0) {
      shift += loop;
      if (target !== null) target += loop;
    }
  };

  const tick = () => {
    raf = 0;
    if (target !== null) {
      shift += (target - shift) * CATCH;
      if (Math.abs(target - shift) < 0.5) {
        shift = target;
        target = null;
      }
    } else {
      shift += vel;
      vel *= FRICTION;
      if (Math.abs(vel) < 0.08) vel = 0;
    }
    wrap();
    draw();
    if (target !== null || vel !== 0) raf = requestAnimationFrame(tick);
  };

  const run = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  // Шаг стрелки — примерно экран: лента едет дальше по инерции, поэтому
  // точная карточка тут не нужна
  const step = () => Math.max(240, viewport.clientWidth * 0.6);

  const nudge = (dir) => {
    target = (target === null ? shift : target) + dir * step();
    vel = 0;
    run();
  };

  const open = (folder) => {
    if (!folder.classList.contains('is-live')) return;
    const tpl = folder.querySelector('.team-folder__detail');
    if (!tpl) return;

    opener = folder;
    clearTimeout(hideTimer);
    folder.classList.add('is-open');

    name.textContent = folder.dataset.detailName || '';
    // Сцена уходит в тень: иначе раскрытая папка и стикеры читаются
    // сквозь подложку, а в остальных попапах за ней ничего не разобрать
    section?.classList.add('is-detail');

    // Список склеен трижды — так лента не упирается в край
    const base = tpl.content.cloneNode(true);
    track.replaceChildren(base);
    const one = [...track.children];
    for (let c = 1; c < 3; c += 1) {
      one.forEach((card) => track.append(card.cloneNode(true)));
    }

    // Карточка, картинки для которой ещё не положили, просто не
    // показывается — в ленте не будет пустых мест
    track.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => {
        img.closest('.team-modal__card')?.remove();
        measure();
      }, { once: true });
    });
    // Видео в карточках играют, пока попап открыт
    track.querySelectorAll('video').forEach((v) => {
      v.muted = true;
      v.play().catch(() => {});
    });

    shift = 0;
    vel = 0;
    target = null;
    draw();

    // Папка успевает заметно раскрыться — листы рвутся наружу, передний
    // сгиб отваливается сильнее, — и только потом сверху приходит попап
    setTimeout(() => {
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('video-modal-open');
      lenis?.stop();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        modal.classList.add('video-modal--open');
        measure();
      }));
      closeBtn?.focus({ preventScroll: true });
    }, 420);
  };

  // Ширина одной копии списка — по ней считается перескок
  const measure = () => {
    const cards = [...track.children];
    const n = Math.round(cards.length / 3);
    let w = 0;
    for (let k = 0; k < n; k += 1) w += cards[k].offsetWidth + GAP;
    loop = w;
    wrap();
    draw();
  };

  const close = () => {
    if (modal.hidden) return;
    modal.classList.remove('video-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('video-modal-open');
    lenis?.start();
    section?.classList.remove('is-detail');
    cancelAnimationFrame(raf);
    raf = 0;
    vel = 0;
    target = null;
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

  // ----- тянем ленту -----
  // Лента идёт ровно за пальцем, а после броска доезжает по инерции
  let dragging = false;
  let lastX = 0;
  let moved = 0;

  viewport.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    vel = 0;
    target = null;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    shift -= dx;
    // Скорость считаем по последнему движению, сглаживая рывки мыши
    vel = vel * 0.6 + -dx * 0.4;
    wrap();
    draw();
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    viewport.releasePointerCapture?.(e.pointerId);
    // Бросок продолжается по инерции, короткое касание просто
    // останавливает ленту
    if (Math.abs(vel) < 0.5) vel = 0;
    else vel *= 2.2;
    run();
  };

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('dragstart', (e) => e.preventDefault());

  // Колесо и трекпад тоже крутят ленту
  viewport.addEventListener('wheel', (e) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!d) return;
    e.preventDefault();
    target = null;
    shift += d;
    vel = d * 0.25;
    wrap();
    draw();
    run();
  }, { passive: false });

  arrows.forEach((a) => a.addEventListener('click', () => nudge(Number(a.dataset.dir))));
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  dialog.addEventListener('click', (e) => {
    // Закрываем только по честному клику мимо карточек, а не после драга
    if (e.target === dialog && moved < 6) close();
  });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') nudge(1);
    if (e.key === 'ArrowLeft') nudge(-1);
  });
  window.addEventListener('resize', () => {
    if (!modal.hidden) measure();
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

// Для движения папок: разгон и торможение одинаково мягкие. Резкий
// ease-out на скролле читается как пружина — папка будто догоняет палец.
function glide(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
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
