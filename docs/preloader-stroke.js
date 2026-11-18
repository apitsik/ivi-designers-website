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
 * Модуль подключён в index.html отдельным тегом, до основного кода
 * сайта: он крошечный и ничего не тянет за собой, поэтому мазок
 * трогается сразу, а не через секунду после открытия страницы, пока
 * грузится остальная сборка. Какой прелоадер показывать, решает
 * window.PRELOADER там же, в index.html.
 *
 * Рядом лежит preloader.js — прежний вариант с перебором логотипа. Какой
 * из них показывать, решает одна строка в начале main.js.
 */

// Файл подключён в index.html обычным тегом и намеренно не проходит через
// сборку: он должен выполниться сразу, а не ждать основной бандл сайта.
// Поэтому здесь нет импортов, а стили лежат строкой ниже.
(function () {
  if (window.PRELOADER !== 'stroke') return;

  const CSS = `
/* ----- прелоадер-мазок (src/preloader-stroke.js) ----- */

.preloader-stroke {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--color-bg);
  color: #e92153;
  pointer-events: none;
  transition: background-color 0.52s cubic-bezier(0.33, 1, 0.68, 1);
}

/* Подложка ушла — остался только мазок поверх страницы */
.preloader-stroke.is-open {
  background: transparent;
}

.preloader-stroke__svg {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.18s cubic-bezier(0.33, 1, 0.68, 1);
}

.preloader-stroke.is-drawing .preloader-stroke__svg {
  opacity: 1;
}

/* Толщина в процентах от квадрата макета: кисть растягивается вместе
   с экраном, как и сам путь */
.preloader-stroke__path {
  stroke-width: 32%;
}

@media (max-width: 767px) {
  .preloader-stroke__path {
    stroke-width: 42%;
  }
}
`;

  
  // Одна непрерывная дорожка времени: голова и хвост едут без остановок
  const TOTAL_MS = 2150;
  const HEAD_END = 0.58; // к этой доле времени голова прошла весь путь
  const TAIL_FROM = 0.3; // с этой доли трогается хвост
  const OPEN_AT = 0.62; // когда гаснет чёрная подложка
  const MAX_WAIT_MS = 4000; // дольше подложку не держим, даже если что-то не догрузилось
  
  // Путь строится прямо в коде, уже повёрнутым: заходы идут вдоль одной
  // диагонали, а сдвигаются вдоль другой — поэтому закрашивание ползёт из
  // левого верхнего угла в правый нижний. Каждый заход не прямой, а
  // выгнут дугой, и развороты скруглены: мазок читается как рука, а не
  // как строчка принтера. Заходы идут с нахлёстом, чтобы между ними не
  // оставалось чёрных просветов.
  // Размеры подогнаны так, чтобы кисть почти сразу оказалась в кадре:
  // лишние заходы и лишняя длина за краем — это секунды, когда на экране
  // не происходит ничего.
  const GAP = 193; // шаг между заходами поперёк диагонали
  const REACH = 720; // половина длины захода вдоль диагонали
  const BOW = 130; // насколько выгнут заход
  const TURN = 240; // вынос разворота за край
  const ROWS = 8; // столько заходов — ровно на диагональ квадрата
  
  const PATH = (() => {
    const C = 500;
    const k = Math.SQRT1_2; // 45°
    // along — вдоль захода (вверх-вправо), across — куда сдвигаемся (вниз-вправо)
    const along = [k, -k];
    const across = [k, k];
    const at = (u, v) => [
      C + along[0] * u + across[0] * v,
      C + along[1] * u + across[1] * v,
    ];
    const fmt = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  
    const first = -((ROWS - 1) / 2) * GAP;
    const d = [];
    for (let i = 0; i < ROWS; i += 1) {
      const v = first + i * GAP;
      const dir = i % 2 === 0 ? 1 : -1; // туда и обратно
      const from = -REACH * dir;
      const to = REACH * dir;
      if (i === 0) d.push(`M${fmt(at(from, v))}`);
      else {
        // разворот: выходим за край и заводим кисть на новый заход
        const prev = v - GAP;
        d.push(
          `C ${fmt(at(from + TURN * dir, prev))}, ${fmt(at(from + TURN * dir, v))}, ${fmt(at(from, v))}`,
        );
      }
      // сам заход — дугой
      d.push(
        `C ${fmt(at(from + (to - from) * 0.3, v - BOW))}, ${fmt(at(from + (to - from) * 0.7, v + BOW))}, ${fmt(at(to, v))}`,
      );
    }
    return d.join(' ');
  })();
  
  // Для головы: медленное начало, разгон к середине, мягкое торможение
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  
  // Для хвоста: трогается почти незаметно, разгоняется и так же мягко
  // приходит — последний кусок розового не срывается с экрана рывком
  const easeTail = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  
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
  
  // Ждём только то, что видно сразу: картинки без lazy и шрифты.
  // Свой короткий вариант вместо общего из preloader.js — чтобы этот
  // модуль не тянул за собой ничего тяжёлого.
  function waitForAssets() {
    const tasks = [];
    document.querySelectorAll('img[src]:not([loading="lazy"])').forEach((img) => {
      if (img.complete) return;
      tasks.push(new Promise((r) => {
        img.addEventListener('load', r, { once: true });
        img.addEventListener('error', r, { once: true });
      }));
    });
    if (document.fonts?.ready) tasks.push(document.fonts.ready.catch(() => {}));
    return Promise.all(tasks);
  }
  
  // Сигнал основному коду сайта: экран свободен, можно запускаться
  let told = false;
  const done = () => {
    if (told) return;
    told = true;
    window.dispatchEvent(new Event('preloader-done'));
  };

  function initPreloaderStroke(old) {
    // Разметка прежнего прелоадера этому варианту не нужна
    old?.remove();
  
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
      return Promise.race([waitForAssets(), wait(MAX_WAIT_MS)]).then(() => {
        root.remove();
        done();
      });
    }
  
    const assetsReady = Promise.race([waitForAssets(), wait(MAX_WAIT_MS)]);
  
    // Подложка гаснет, когда страница готова, но не позже своей отметки
    // на дорожке. Это отдельный переход прозрачности, он не трогает
    // движение мазка — поэтому заминки не возникает.
    Promise.race([assetsReady, wait(TOTAL_MS * OPEN_AT)]).then(() => {
      root.classList.add('is-open');
    });
  
    // Кисть не возникает из ниоткуда: первые кадры она набирает плотность
    requestAnimationFrame(() => root.classList.add('is-drawing'));
  
    return run(TOTAL_MS, (t) => t, (t) => {
      const head = easeInOut(Math.min(1, t / HEAD_END));
      const started = Math.max(0, (t - TAIL_FROM) / (1 - TAIL_FROM));
      const tail = easeTail(started);
      paint(len * (head - tail), len * head);
    }).then(() => {
      root.remove();
      done();
    });
  }
  
    // Стили кладём сами: файл подключён обычным тегом, без сборки
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
  
    // Запускаемся, как только браузер дочитал разметку
    const start = () => initPreloaderStroke(document.querySelector('.preloader'));
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
