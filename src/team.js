// Team: сцена (100vh) залипает на экране, пока секция прокручивается, и за
// это время показывает три команды — папками с документами.
// Раскадровка в Figma: Team step 1 – step 13 (node 34:445 … 215:1140),
// ховер — node 215:733, попап — node 215:1195.
//
// Порядок по скроллу:
//   1. Папки по очереди выезжают снизу и собираются в стопку с наклоном.
//   2. Пауза: стопка стоит, её можно разглядеть, навести и открыть.
//   3. Заголовок уходит в блюр, первая папка едет на своё место,
//      остальные опускаются вниз.
//   4. К папке по одному подъезжают стикеры.
//   5. Папка со стикерами уходит вверх (стикеры быстрее — параллакс),
//      снизу приходит следующая. У третьей папки шага 5 нет.
//
// Координаты берутся прямо из макета (кадр 1440 × 832) и лежат в data-*
// в index.html. Кадр вписан в экран, его масштаб — в --u, поэтому внутри
// папки всё считается в пикселях макета. На каждый кадр модуль пишет
// в CSS --x / --y / --rot / --o, а переходы и изинги делает CSS.
//
// Ховер и клик живут в CSS (team.css), здесь только класс .is-live —
// он разрешает трогать папку, когда она стоит на месте.

import { splitWords, observeReveal } from './reveal.js';
import { lenis } from './smooth-scroll.js';

// Кадр макета
const DESIGN_W = 1440;

// Сколько экранов скролла занимает секция сверх самой сцены
const STEPS = 5;

// Фазы по общему прогрессу секции (0 — сцена прилипла, 1 — отлипает)
const STACK_END = 0.16; // стопка собралась
const PREVIEW_END = 0.3; // конец паузы-превью
const SPAN = (1 - PREVIEW_END) / 3; // отрезок на одну папку

// Доли внутри отрезка одной папки. Складываются в непрерывный рассказ:
// папка приезжает (0 → 0.30), по одному подъезжают три стикера
// (0.34 → 0.72), всё стоит на месте (0.72 → 0.80), уходит вверх (0.80 → 1).
// Между концом последнего стикера и началом ухода обязателен зазор —
// иначе стикер не успевает встать, а папка уже едет.
const ARRIVE = 0.3; // едет на своё место
const LEAVE = 0.2; // уходит вверх
const STICKER_START = 0.34; // когда пошёл первый стикер
const STICKER_GAP = 0.1; // сдвиг между соседними
const STICKER_LEN = 0.18; // сколько едет один стикер

// Следующая папка трогается с места ровно тогда, когда предыдущая
// начинает уходить вверх: пустоты на экране не возникает, но пока папка
// стоит в центре, следующей ещё не видно (в макете это шаг 11).
const OVERLAP = 0.2;

// Запас за краем сцены в пикселях макета: на него папка уезжает сверх
// самого края, чтобы не выглядывала тень
const MARGIN = 60;

// Стикеры уходят вверх быстрее папки — за счёт этого получается параллакс
const PARALLAX = 1.16;

// Общая для всех папок позиция «на экране» и точка ухода вверх
const REST = { x: 390, y: 248, rot: 0 };
const EXIT_Y = -560;

// Откуда стикер выезжает: ниже своего места на столько пикселей макета
const STICKER_RISE = 620;

export function initTeam(section, modal) {
  if (!section) return;

  const scene = section.querySelector('.team__scene');
  const title = section.querySelector('[data-words]');
  const folders = [...section.querySelectorAll('.team-folder')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (title) {
    splitWords(title);
    observeReveal(scene, section);
  }

  section.style.setProperty('--steps', STEPS);

  // ----- раскладка -----

  const items = folders.map((el, i) => {
    const d = el.dataset;
    const stickers = [...section.querySelectorAll(`.team__sticker[data-folder="${i}"]`)]
      .map((node) => {
        const s = node.dataset;
        const w = parseFloat(s.w);
        const h = parseFloat(s.h);
        node.style.width = `${w}px`;
        node.style.height = `${h}px`;
        node.style.setProperty('--x', `${parseFloat(s.x)}px`);
        node.firstElementChild?.style.setProperty('--rot', `${s.rot || 0}deg`);
        return { node, y: parseFloat(s.y), order: parseInt(s.order, 10) || 1 };
      })
      .sort((a, b) => a.order - b.order);

    return {
      el,
      stickers,
      enter: { x: num(d.stackX), y: num(d.enterY), rot: num(d.enterRot) },
      stack: { x: num(d.stackX), y: num(d.stackY), rot: num(d.stackRot) },
      park: { x: num(d.parkX), y: num(d.parkY), rot: 0 },
      // границы отрезка этой папки
      start: PREVIEW_END + i * SPAN,
      last: i === folders.length - 1,
    };
  });

  // Масштаб кадра: сцена может быть и уже, и шире 1440.
  //
  // Кадр 1440 × 832 вписан в экран по ширине, поэтому над ним и под ним
  // обычно остаются поля — и папка, уехавшая за край кадра, в этих полях
  // всё ещё видна. Высоту полей (в единицах макета) держим в outset и
  // прибавляем ко всем позициям за кадром: так припаркованной снизу папки
  // не видно, пока текущая стоит в центре, на любом экране.
  const stage = section.querySelector('.team__stage');
  let outset = MARGIN;

  const resize = () => {
    if (!scene) return;
    const u = scene.clientWidth / DESIGN_W;
    scene.style.setProperty('--u', u);
    const band = stage ? (stage.clientHeight - scene.clientHeight) / 2 : 0;
    outset = MARGIN + (u > 0 ? Math.max(0, band / u) : 0);
  };

  // ----- попап -----

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

  // ----- бережный режим -----

  // Ничего не ездит: сцена не залипает (это делает CSS), папки стоят
  // обычным списком, стикеры скрыты. Попап при этом работает.
  if (reduced) {
    items.forEach(({ el }) => {
      el.classList.add('is-live');
      el.style.setProperty('--rot', '0deg');
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

    items.forEach((item, i) => place(item, i, p));
  };

  const place = (item, i, p) => {
    const { el, stack, start, last, stickers } = item;
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
    let live = false;

    if (p < STACK_END) {
      // выезжают по очереди снизу и собираются в стопку
      pos = mix(enter, stack, ease(range(p, i * 0.035, STACK_END)));
    } else if (p < PREVIEW_END) {
      // пауза: стопку можно разглядеть и открыть
      pos = stack;
      live = true;
    } else if (p < arriveFrom) {
      // своей очереди ещё нет: опускаемся из стопки вниз и ждём
      pos = mix(stack, park, ease(range(p, PREVIEW_END, PREVIEW_END + ARRIVE * SPAN)));
    } else if (p < arriveTo) {
      // едем на своё место: первая — прямо из стопки, остальные — снизу
      pos = mix(i === 0 ? stack : park, REST, ease(range(p, arriveFrom, arriveTo)));
    } else if (!last && p > leaveFrom) {
      // уходим вверх
      pos = mix(REST, exit, ease(range(p, leaveFrom, leaveTo)));
    } else {
      pos = REST;
      live = true;
    }

    el.style.setProperty('--x', `${pos.x.toFixed(2)}px`);
    el.style.setProperty('--y', `${pos.y.toFixed(2)}px`);
    el.style.setProperty('--rot', `${pos.rot.toFixed(2)}deg`);
    el.classList.toggle('is-live', live);
    // В табуляцию попадает только та папка, которую сейчас видно
    el.tabIndex = live ? 0 : -1;

    // Стикеры: подъезжают по одному после того, как папка встала на место
    const out = last ? 0 : ease(range(p, leaveFrom, leaveTo));
    stickers.forEach(({ node, y, order }, k) => {
      const from = start + (STICKER_START + k * STICKER_GAP) * SPAN;
      const t = ease(range(p, from, from + STICKER_LEN * SPAN));
      const shift = out * (exit.y - REST.y) * PARALLAX;
      node.style.setProperty('--y', `${(y + (1 - t) * (STICKER_RISE + outset) + shift).toFixed(2)}px`);
      node.style.setProperty('--o', Math.min(clamp(t * 3, 0, 1), 1 - clamp((out - 0.55) / 0.45, 0, 1)).toFixed(3));
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

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
