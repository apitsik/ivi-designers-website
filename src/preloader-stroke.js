/**
 * Прелоадер-мазок (по референсу extrafazant.nl).
 *
 * На чёрном экране сама себя рисует одна длинная петляющая линия очень
 * толстой кистью — она наезжает на себя и закрашивает экран. Когда
 * страница готова, чёрная подложка гаснет, остаётся только мазок поверх
 * живой страницы, и он уползает к своему концу, открывая сайт.
 *
 * Линия одна: это обычный SVG-путь, у которого мы двигаем «окно»
 * видимого участка (штрих и его смещение). Поэтому рисование и стирание
 * — это два числа, а не анимация формы: браузеру дёшево.
 *
 * Рядом лежит preloader.js — прежний вариант с перебором логотипа. Какой
 * из них показывать, решает одна строка в начале main.js.
 */

import './preloader-stroke.css';
import { waitForAssets } from './preloader.js';

const DRAW_MS = 1000; // рисуем мазок
const HOLD_MS = 120; // короткая пауза на полном экране
const FADE_MS = 420; // гаснет чёрная подложка
const WIPE_MS = 760; // мазок уползает
const MAX_WAIT_MS = 5000; // страховка: дольше не ждём, даже если что-то не догрузилось

// Метка в памяти браузера: один раз показали — больше не показываем
const SEEN_KEY = 'ivi-design-preloader-seen';

// Путь нарисован в квадрате 1000 × 1000 и растягивается на любой экран.
// Начинается и заканчивается за кадром, чтобы не было видно, как кисть
// появляется из ниоткуда.
const PATH =
  'M-60 700 C 90 380, 430 250, 590 430 C 750 610, 470 810, 330 690 ' +
  'C 190 570, 300 280, 620 230 C 940 180, 1090 520, 880 710 ' +
  'C 670 900, 350 950, 170 810 C -10 670, 60 360, 330 140 ' +
  'C 600 -80, 980 40, 1070 300';

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
    // Рисуем мазок: голова бежит по пути, хвост стоит в начале
    await run(DRAW_MS, easeInOut, (t) => paint(len * t, len * t));
    await assetsReady;
    await wait(HOLD_MS);

    // Подложка гаснет — страница уже видна сквозь просветы мазка
    root.classList.add('is-open');
    await wait(FADE_MS);

    // Мазок уползает: голова стоит в конце, хвост догоняет её
    await run(WIPE_MS, easeIn, (t) => paint(len * (1 - t), len));

    root.remove();
  })();
}
