// Прелоадер: чёрный экран, по центру мелькают кадры логотипа из навбара.
// Перебор начинается с основного лого (logo-01), разгоняется, крутится,
// пока грузятся картинки/hero-видео/шрифты, затем тормозит и останавливается
// снова на основном лого. После этого полотно уезжает вверх.
//
// Темп задаётся интервалом между кадрами: SLOW_MS в начале и в конце,
// FAST_MS на пике. Разгон и торможение — по синусоиде, чтобы ускорение
// и замедление были плавными.

import './preloader.css';

const frameModules = import.meta.glob('../assets/logos/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const SLOW_MS = 280; // интервал между кадрами в покое (старт/финиш)
const FAST_MS = 50; // интервал на пике скорости
const RAMP_STEPS = 8; // кадров на разгон и столько же на торможение
const MIN_SPIN_MS = 350; // минимум крутимся на полной скорости (чтобы не дёргалось)
const MAX_WAIT_MS = 9000; // страховка: дольше этого не ждём, даже если что-то не догрузилось
const LEAVE_MS = 900; // длительность уезда, синхронно с CSS

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Ждём всё, что сайт показывает на старте и ниже: все <img> (включая
// lazy — их тянем через new Image, чтобы они легли в кэш), hero-видео
// до состояния «можно играть без буферизации», шрифты.
function waitForAssets(root) {
  const tasks = [];

  const seen = new Set();
  root.querySelectorAll('img[src]').forEach((img) => {
    const src = img.currentSrc || img.src;
    if (!src || seen.has(src)) return;
    seen.add(src);
    tasks.push(
      new Promise((resolve) => {
        const pre = new Image();
        pre.onload = pre.onerror = () => resolve();
        pre.src = src;
        if (pre.complete) resolve();
      }),
    );
  });

  const hero = root.querySelector('.hero__video');
  if (hero) {
    tasks.push(
      new Promise((resolve) => {
        if (hero.readyState >= 4) return resolve();
        const done = () => resolve();
        hero.addEventListener('canplaythrough', done, { once: true });
        hero.addEventListener('error', done, { once: true });
        hero.load();
      }),
    );
  }

  if (document.fonts?.ready) tasks.push(document.fonts.ready);

  return Promise.race([Promise.all(tasks), wait(MAX_WAIT_MS)]);
}

export function initPreloader(el) {
  if (!el) return Promise.resolve();
  const img = el.querySelector('.preloader__logo');
  const frames = Object.keys(frameModules)
    .sort()
    .map((key) => frameModules[key]);
  if (!img || !frames.length) {
    el.remove();
    return Promise.resolve();
  }

  const html = document.documentElement;
  html.classList.add('is-preloading');
  img.src = frames[0];

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assetsReady = waitForAssets(document);

  // Прогреваем кадры, чтобы перебор не споткнулся о первую загрузку
  const framesReady = Promise.all(
    frames.map(
      (src) =>
        new Promise((resolve) => {
          const pre = new Image();
          pre.onload = pre.onerror = () => resolve();
          pre.src = src;
        }),
    ),
  );

  const leave = () =>
    new Promise((resolve) => {
      el.classList.add('is-leaving');
      setTimeout(() => {
        el.remove();
        html.classList.remove('is-preloading');
        resolve();
      }, reduce.matches ? 400 : LEAVE_MS);
    });

  // Меньше движения — без перебора: просто ждём и уходим
  if (reduce.matches) {
    return assetsReady.then(() => wait(300)).then(leave);
  }

  let index = 0;
  const step = () => {
    index = (index + 1) % frames.length;
    img.src = frames[index];
  };

  const run = async () => {
    await framesReady;

    // Разгон: SLOW → FAST
    for (let i = 0; i < RAMP_STEPS; i++) {
      const t = easeInOutSine(i / RAMP_STEPS);
      await wait(SLOW_MS + (FAST_MS - SLOW_MS) * t);
      step();
    }

    // Крутимся на пике, пока не догрузится всё, не пройдёт минимум и пока
    // не окажемся на кадре, с которого торможение в RAMP_STEPS шагов
    // приедет ровно на основное лого (кадр 0).
    let ready = false;
    assetsReady.then(() => (ready = true));
    const spinStart = performance.now();
    const aligned = () => (index + RAMP_STEPS) % frames.length === 0;
    while (!ready || performance.now() - spinStart < MIN_SPIN_MS || !aligned()) {
      await wait(FAST_MS);
      step();
    }

    // Торможение: FAST → SLOW, финиш на кадре 0
    for (let i = 0; i < RAMP_STEPS; i++) {
      const t = easeInOutSine((i + 1) / RAMP_STEPS);
      await wait(FAST_MS + (SLOW_MS - FAST_MS) * t);
      step();
    }

    // Пауза на основном лого — и уезжаем
    await wait(260);
    await leave();
  };

  return run();
}
