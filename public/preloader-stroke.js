/**
 * Прелоадер-мазок (по референсу extrafazant.nl).
 *
 * На чёрном экране светлая (#EBE2E6) кисть идёт от левого верхнего угла к правому
 * нижнему. Это один непрерывный мазок: длинные дуги, как взмахи руки,
 * и круглые развороты за краем экрана. Кисть сначала тонкая, а пока идёт,
 * толстеет и заливает экран целиком — не полосами по одной, а разом.
 * Потом мазок «стирается» с хвоста и снова истончается, открывая сайт.
 *
 * Движение в два прохода, как в референсе:
 *   1. голова бежит по пути от начала до конца, кисть толстеет;
 *   2. хвост бежит от начала до конца, кисть истончается и уходит за край.
 * Проходы чуть нахлёстываются. На стыке экран закрыт сплошной заливкой.
 * В этот момент:
 *   - гаснет чёрная подложка (никто не видит);
 *   - мы сообщаем сайту событием preloader-covered, что можно запускаться:
 *     создавать логотип, стикеры, плеер и всё остальное. Это тяжёлая
 *     работа, главный поток на ней встаёт на сотни миллисекунд, и лучше,
 *     чтобы это случилось, пока на экране ничего не движется;
 *   - мазок ждёт ответа app-ready и загрузки картинок, но не дольше
 *     HOLD_MAX_MS. Так сайт под мазком уже целиком готов, и после него
 *     ничего не «доезжает».
 *
 * Почему теперь плавно (раньше дёргалось):
 *  - Путь без изломов. Каждый заход — дуга, разворот — полуокружность,
 *    а на стыках касательные совпадают, поэтому кисть нигде не меняет
 *    направление скачком. Радиус самого узкого места — около 50 единиц
 *    из 1000 (на скруглении это уже не излом, а изгиб руки).
 *  - Скорость считается по настоящей длине пути и меняется только по
 *    одной кривой изинга. Раньше путь за кадром проскакивался в шесть
 *    раз быстрее, и на каждом заходе скорость прыгала.
 *  - Экран закрашивается утолщением кисти, а не рядом отдельных полос.
 *  - Если браузер на секунду завис (грузится сайт), время не перепрыгивает
 *    вперёд: кисть продолжает с того же места, а не телепортируется.
 *
 * Линия одна: это обычный SVG-путь, у которого мы двигаем «окно»
 * видимого участка (голову и хвост) и толщину. Три числа за кадр, а не
 * анимация формы: браузеру дёшево.
 *
 * Показывается при каждом заходе на сайт.
 *
 * Модуль подключён в index.html отдельным тегом, до основного кода
 * сайта: он крошечный и ничего не тянет за собой, поэтому мазок
 * трогается сразу, а не через секунду после открытия страницы, пока
 * грузится остальная сборка. Какой прелоадер показывать, решает
 * window.PRELOADER там же, в index.html.
 *
 * Рядом лежит preloader.js — прежний вариант с перебором логотипа.
 */

// Файл подключён в index.html обычным тегом и намеренно не проходит через
// сборку: он должен выполниться сразу, а не ждать основной бандл сайта.
// Поэтому здесь нет импортов, а стили лежат строкой ниже.
(function () {
  if (window.PRELOADER !== 'stroke') return;

  const CSS = `
/* ----- прелоадер-мазок (public/preloader-stroke.js) ----- */

.preloader-stroke {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--color-bg);
  color: #ebe2e6;
  pointer-events: none;
}

/* Экран закрыт сплошной заливкой — подложка больше не нужна.
   Гасим её сразу, без перехода: под заливкой этого всё равно не видно */
.preloader-stroke.is-open {
  background: transparent;
}

.preloader-stroke__svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* Толщину двигает скрипт: в процентах от квадрата макета (1000 × 1000),
   так кисть растягивается вместе с экраном, как и сам путь */
.preloader-stroke__path {
  stroke-width: 5%;
}
`;

  // ---------------------------------------------------------------------------
  // Время
  // ---------------------------------------------------------------------------
  const HEAD_MS = 1100; // голова проходит весь путь
  const TAIL_MS = 1300; // хвост проходит весь путь
  // Хвост трогается чуть раньше, чем голова остановится: к этой отметке экран
  // уже закрыт целиком (проверено покадрово), а голова почти дошла и
  // тормозит. Без нахлёста между проходами получается сплошной розовый
  // экран, на котором ничего не происходит, — это читается как «замерло».
  const TAIL_AT_MS = 1000;
  const WIDTH_FROM = 0.25; // с этой доли первого прохода кисть начинает толстеть
  const HOLD_MAX_MS = 2500; // сколько максимум держим сплошную заливку, пока сайт запускается и грузится
  const MAX_FRAME_MS = 48; // кадр длиннее считаем зависанием и не перескакиваем

  // Толщина кисти, в процентах от квадрата макета. Толстая кисть закрывает
  // экран целиком: путь подобран так, что при 30% дыр нет (проверено счётом
  // по сетке, самая дальняя точка экрана — 139 из 150).
  const WIDTH_THIN = 5;
  const WIDTH_FAT = 30;

  // ---------------------------------------------------------------------------
  // Путь
  // ---------------------------------------------------------------------------
  // Мазок строим в «повёрнутых» координатах: u — вдоль захода (вверх-вправо),
  // v — поперёк (вниз-вправо). Заходы идут туда и обратно вдоль одной
  // диагонали, а сдвигаются вдоль другой — поэтому закрашивание ползёт из
  // левого верхнего угла в правый нижний. Потом всё переводится в квадрат
  // 1000 × 1000, который растягивается на экран.
  //
  // Каждый заход — кубическая дуга, концы которой уходят от середины к
  // правому нижнему углу (у каждого захода свой изгиб, чтобы мазок не был
  // «строчкой принтера»). Все дуги выгнуты в одну сторону, поэтому расстояние
  // между ними почти не меняется и дыр между заходами не остаётся.
  // Разворот — кривая, которая на стыках берёт направление у соседних
  // заходов: излома нет.
  const ROWS = 6; // заходов
  const STEP = 236; // шаг между заходами по середине
  const MID0 = -590; // первый заход проходит у левого верхнего угла
  const LEAD = 290; // как далеко за кадром начинается и кончается мазок
  const EDGE = 30; // насколько конец захода выходит за край экрана
  const BEND_START = [70, 95, 60, 100, 65, 85]; // на сколько начало захода уходит от середины
  const BEND_END = [95, 60, 100, 70, 90, 60]; // то же для конца
  const HANDLE = [0.34, 0.3, 0.38, 0.32, 0.36, 0.3]; // где стоят «ручки» дуги вдоль захода
  const TURN_K = 0.7; // насколько округлый разворот

  const PATH = (() => {
    const K = Math.SQRT1_2; // 45°
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const mul = (a, k) => [a[0] * k, a[1] * k];
    const len = (a) => Math.hypot(a[0], a[1]);
    const unit = (a) => mul(a, 1 / len(a));
    const fmt = ([u, v]) => `${(500 + K * (u + v)).toFixed(1)} ${(500 + K * (v - u)).toFixed(1)}`;

    const mids = Array.from({ length: ROWS }, (_, i) => MID0 + i * STEP);
    // Половина длины захода внутри экрана: у заходов у углов короче
    const reach = mids.map((m) => 707 - Math.abs(m));
    // Глубина разворота между заходами i и i+1 общая: так конец одного
    // и начало другого стоят друг напротив друга, и поворот получается
    // ровной полуокружностью, а не каплей
    const depth = [LEAD];
    for (let i = 0; i < ROWS - 1; i += 1) depth.push(Math.max(reach[i], reach[i + 1]) + EDGE);
    depth.push(LEAD);

    const rows = mids.map((m, i) => {
      const d = i % 2 === 0 ? 1 : -1; // туда и обратно
      const from = depth[i];
      const to = depth[i + 1];
      const pull = (from + to) * HANDLE[i];
      return {
        start: [-d * from, m + BEND_START[i]],
        c1: [-d * from + d * pull, m - BEND_START[i] / 3],
        c2: [d * to - d * pull, m - BEND_END[i] / 3],
        end: [d * to, m + BEND_END[i]],
      };
    });

    const curve = (c1, c2, p) => ` C${fmt(c1)}, ${fmt(c2)}, ${fmt(p)}`;
    let d = `M${fmt(rows[0].start)}`;
    rows.forEach((row, i) => {
      d += curve(row.c1, row.c2, row.end);
      const next = rows[i + 1];
      if (!next) return;
      // Разворот: выходим из конца захода по его же касательной и входим
      // в начало следующего по его касательной
      const out = unit(sub(row.end, row.c2));
      const into = unit(sub(next.c1, next.start));
      const h = TURN_K * len(sub(next.start, row.end));
      d += curve(add(row.end, mul(out, h)), sub(next.start, mul(into, h)), next.start);
    });
    return d;
  })();

  // ---------------------------------------------------------------------------
  // Изинг
  // ---------------------------------------------------------------------------
  // Медленный старт, разгон в середине, мягкая остановка. Синусоида вместо
  // степенной кривой: у неё нет резкой смены ускорения посередине, поэтому
  // кисть не «подпинывает» на середине прохода.
  const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Одни общие часы на оба прохода. Длинный кадр (браузер завис) не
  // пропускаем целиком, а засчитываем как короткий: кисть продолжит с того
  // же места, а не перескочит вперёд.
  //
  // На отметке TAIL_AT_MS часы встают, пока сайт не запустится и не
  // догрузится (но не дольше HOLD_MAX_MS): экран в этот момент закрыт
  // сплошной заливкой. Когда можно, подложка гаснет и часы идут дальше.
  function play(step, ready, onOpen) {
    return new Promise((resolve) => {
      const total = TAIL_AT_MS + TAIL_MS;
      let last = null;
      let elapsed = 0;
      let holding = false;
      let released = false;
      const frame = (now) => {
        if (last !== null) {
          const next = elapsed + Math.min(now - last, MAX_FRAME_MS);
          if (!released && next >= TAIL_AT_MS) {
            elapsed = TAIL_AT_MS;
            if (!holding) {
              holding = true;
              Promise.race([ready(), wait(HOLD_MAX_MS)]).then(() => {
                released = true;
                onOpen();
              });
            }
          } else {
            elapsed = next;
          }
        }
        last = now;
        step(elapsed);
        if (elapsed < total) requestAnimationFrame(frame);
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
    // Ждём только картинки первого экрана: всё, что ниже, догрузится уже под
    // открытой страницей и не должно держать розовую заливку.
    const vh = window.innerHeight;
    document.querySelectorAll('img[src]:not([loading="lazy"])').forEach((img) => {
      if (img.complete) return;
      const r = img.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.width === 0) return;
      tasks.push(
        new Promise((r) => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', r, { once: true });
        }),
      );
    });
    if (document.fonts?.ready) tasks.push(document.fonts.ready.catch(() => {}));
    return Promise.all(tasks);
  }

  // Экран закрыт сплошной заливкой: просим основной код сайта запуститься и
  // ждём его ответа (app-ready), а потом картинок, которые он создал.
  // Слушатель ставим до сигнала, чтобы не пропустить ответ.
  const whenSiteReady = () => {
    const app = new Promise((r) => window.addEventListener('app-ready', r, { once: true }));
    // Флаг для основного кода, который мог загрузиться позже сигнала
    window.__preloaderState = 'covered';
    window.dispatchEvent(new Event('preloader-covered'));
    return app.then(waitForAssets);
  };

  // Сигнал основному коду сайта: мазок ушёл. Заодно снимаем блокировку
  // прокрутки, которую ставили на время прелоадера.
  let told = false;
  const done = () => {
    document.documentElement.classList.remove('is-preloading');
    if (told) return;
    told = true;
    window.__preloaderState = 'done';
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
    // На время прелоадера прокрутка заморожена (правило в index.html)
    document.documentElement.classList.add('is-preloading');

    const path = root.querySelector('.preloader-stroke__path');
    const len = path.getTotalLength();

    // Видимый участок пути: от from до to (в единицах длины) и толщина.
    // Мазок начинается и кончается за кадром, так что «точка» от круглого
    // кончика нулевой длины на экране не появляется.
    const paint = (from, to, width) => {
      path.style.strokeDasharray = `${to - from}px, 999999px`;
      path.style.strokeDashoffset = `${-from}px`;
      path.style.strokeWidth = `${width}%`;
    };
    paint(0, 0, WIDTH_THIN);

    // Без анимаций просто ждём запуск сайта и загрузку и уходим
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return Promise.race([whenSiteReady(), wait(HOLD_MAX_MS)]).then(() => {
        root.remove();
        done();
      });
    }

    // Голова идёт по пути и кисть толстеет; потом хвост идёт по пути и
    // кисть истончается. Проходы чуть нахлёстываются (см. TAIL_AT_MS).
    const FAT = WIDTH_FAT - WIDTH_THIN;
    return play(
      (ms) => {
        const head = clamp01(ms / HEAD_MS);
        const tail = clamp01((ms - TAIL_AT_MS) / TAIL_MS);
        const grow = ease(clamp01((head - WIDTH_FROM) / (1 - WIDTH_FROM)));
        const width = WIDTH_THIN + FAT * grow * (1 - ease(tail));
        paint(len * ease(tail), len * ease(head), width);
      },
      whenSiteReady,
      // Экран закрыт сплошной заливкой — подложку можно гасить
      () => root.classList.add('is-open'),
    ).then(() => {
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
