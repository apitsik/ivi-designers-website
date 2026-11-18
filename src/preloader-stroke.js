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
 * Показывается при каждом заходе на сайт и идёт одним непрерывным
 * движением: нигде не ждём и не замираем.
 *
 * Рядом лежит preloader.js — прежний вариант с перебором логотипа. Какой
 * из них показывать, решает одна строка в начале main.js.
 */

import './preloader-stroke.css';
import { waitForAssets } from './preloader.js';

// Одна непрерывная дорожка времени: голова и хвост едут без остановок
const TOTAL_MS = 2100;
const HEAD_END = 0.52; // к этой доле времени голова прошла весь путь
const TAIL_FROM = 0.26; // с этой доли трогается хвост
const OPEN_AT = 0.55; // когда гаснет чёрная подложка
const MAX_WAIT_MS = 4000; // дольше подложку не держим, даже если что-то не догрузилось

// Путь нарисован в квадрате 1000 × 1000 и растягивается на любой экран.
// Начинается и заканчивается за кадром, чтобы не было видно, как кисть
// появляется из ниоткуда.
// Путь нарисован в квадрате 1000 × 1000 и растягивается на любой экран.
// Заходы идут туда-обратно со скруглёнными разворотами, с нахлёстом,
// чтобы между ними не оставалось чёрных полос. Всю ленту потом
// поворачивают (ROTATE), поэтому закрашивание идёт по диагонали из
// левого верхнего угла в правый нижний. Путь нарочно шире и выше
// квадрата: после поворота его края должны оставаться за кадром.
const ROTATE = 34; // наклон ленты, градусы

const ROWS = [-240, -40, 160, 360, 560, 760, 960, 1160];
const LEFT = -240;
const RIGHT = 1240;

// Собираем змейку: прямой заход, скруглённый разворот, обратный заход
const PATH = (() => {
  const d = [`M${LEFT} ${ROWS[0]}`];
  ROWS.forEach((y, i) => {
    const toRight = i % 2 === 0;
    const from = toRight ? LEFT : RIGHT;
    const to = toRight ? RIGHT : LEFT;
    if (i > 0) {
      // разворот: уходим за край и возвращаемся на новую строку
      const edge = from + (toRight ? -170 : 170);
      const out = from + (toRight ? 250 : -250);
      d.push(`C ${out} ${ROWS[i - 1]}, ${out} ${y}, ${edge} ${y}`);
    }
    const a = from + (to - from) * 0.33;
    const b = from + (to - from) * 0.67;
    d.push(`C ${a} ${y - 28}, ${b} ${y + 28}, ${to} ${y}`);
  });
  return d.join(' ');
})();

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

export function initPreloaderStroke(old) {
  // Разметка прежнего прелоадера этому варианту не нужна
  old?.remove();

  const root = document.createElement('div');
  root.className = 'preloader-stroke';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <svg class="preloader-stroke__svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      <g transform="rotate(${ROTATE} 500 500)">
        <path class="preloader-stroke__path" d="${PATH}" fill="none"
              stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
      </g>
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

  // Подложка гаснет, когда страница готова, но не позже своей отметки
  // на дорожке. Это отдельный переход прозрачности, он не трогает
  // движение мазка — поэтому заминки не возникает.
  Promise.race([assetsReady, wait(TOTAL_MS * OPEN_AT)]).then(() => {
    root.classList.add('is-open');
  });

  return run(TOTAL_MS, (t) => t, (t) => {
    const head = easeInOut(Math.min(1, t / HEAD_END));
    const started = Math.max(0, (t - TAIL_FROM) / (1 - TAIL_FROM));
    const tail = easeIn(started);
    paint(len * (head - tail), len * head);
  }).then(() => {
    root.remove();
  });
}
