/**
 * Прелоадер-мазок (по референсу extrafazant.nl).
 *
 * На чёрном экране широкая розовая кисть идёт от левого верхнего угла к
 * правому нижнему и закрашивает экран. Хвост мазка подтягивается следом
 * за головой — всё время, а не после: получается живой мазок, который
 * кто-то тянет по экрану, а не линия, которую сначала нарисовали, потом
 * стёрли. Когда страница готова, чёрная подложка гаснет, и хвост
 * догоняет голову, открывая сайт.
 *
 * Линия одна: это обычный SVG-путь, у которого мы двигаем «окно»
 * видимого участка — голову и хвост. Это два числа за кадр, а не
 * анимация формы: браузеру дёшево.
 *
 * Рядом лежит preloader.js — прежний вариант с перебором логотипа. Какой
 * из них показывать, решает одна строка в начале main.js.
 */

import './preloader-stroke.css';
import { waitForAssets } from './preloader.js';

const DRAW_MS = 1150; // голова проходит путь целиком
const TAIL_FROM = 0.45; // с какой доли первой части трогается хвост
const TAIL_LAG = 0.26; // сколько пути он успевает съесть к её концу
const HOLD_MS = 100; // короткая пауза на закрашенном экране
const FADE_MS = 380; // гаснет чёрная подложка
const WIPE_MS = 850; // хвост догоняет голову
const MAX_WAIT_MS = 5000; // страховка: дольше не ждём, даже если что-то не догрузилось

// Метка в памяти браузера: один раз показали — больше не показываем
const SEEN_KEY = 'ivi-design-preloader-seen';

// Путь нарисован в квадрате 1000 × 1000 и растягивается на любой экран.
// Начинается и заканчивается за кадром, чтобы не было видно, как кисть
// появляется из ниоткуда.
// Путь нарисован в квадрате 1000 × 1000 и растягивается на любой экран.
// Идёт из-за левого верхнего угла в правый нижний широкими округлыми
// заходами — так человек закрашивает лист: туда-обратно, со
// скруглёнными разворотами, постепенно спускаясь. Заходы идут с
// нахлёстом, чтобы между ними не оставалось чёрных полос.
const PATH =
  'M-240 80 C 120 30, 580 30, 900 80 ' +
  'C 1180 125, 1180 245, 900 290 ' +
  'C 580 340, 120 340, 60 290 ' +
  'C -180 245, -180 455, 60 500 ' +
  'C 120 550, 580 550, 900 500 ' +
  'C 1180 455, 1180 665, 900 710 ' +
  'C 580 760, 120 760, 60 710 ' +
  'C -180 665, -180 875, 60 920 ' +
  'C 120 970, 580 970, 900 920 ' +
  'C 1120 885, 1240 1000, 1320 1160';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t) => t * t;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Прогоняем значение от 0 до 1 за заданное время
function run(ms, ease, step) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      step(ease(t));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

function alreadySeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* не страшно */
  }
}

export function initPreloaderStroke(old) {
  // Разметка прежнего прелоадера этому варианту не нужна
  old?.remove();

  if (alreadySeen()) return Promise.resolve();
  remember();

  const root = document.createElement('div');
  root.className = 'preloader-stroke';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <svg class="preloader-stroke__svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      <path class="preloader-stroke__path" d="${PATH}" fill="none"
            stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
  document.body.append(root);

  const path = root.querySelector('.preloader-stroke__path');
  const len = path.getTotalLength();

  // Видимый участок пути: от head - shown до head
  const paint = (shown, head) => {
    path.style.strokeDasharray = `${shown}px, 999999px`;
    path.style.strokeDashoffset = `${shown - head}px`;
  };
  paint(0, 0);

  // Без анимаций просто ждём загрузку и уходим
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return Promise.race([waitForAssets(document), wait(MAX_WAIT_MS)]).then(() => {
      root.remove();
    });
  }

  const assetsReady = Promise.race([waitForAssets(document), wait(MAX_WAIT_MS)]);

  return (async () => {
    // Голова идёт по всему пути. Хвост трогается с середины и идёт
    // следом — мазок тянется, но экран успевает закраситься целиком
    await run(DRAW_MS, easeInOut, (t) => {
      const head = len * t;
      const started = Math.max(0, (t - TAIL_FROM) / (1 - TAIL_FROM));
      const tail = len * TAIL_LAG * started * started;
      paint(head - tail, head);
    });
    await assetsReady;
    await wait(HOLD_MS);

    // Подложка гаснет — страница уже видна сквозь просветы мазка
    root.classList.add('is-open');

    // Хвост догоняет голову: мазок подтягивается к концу пути
    await run(WIPE_MS, easeIn, (t) => {
      const tail = len * (TAIL_LAG + (1 - TAIL_LAG) * t);
      paint(len - tail, len);
    });

    root.remove();
  })();
}
