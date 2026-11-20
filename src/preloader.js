import './preloader.css';

const frameModules = import.meta.glob('../assets/logos/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const SLOW_MS = 200;
const FAST_MS = 45;
const RAMP_STEPS = 6;
const MIN_SPIN_MS = 150;
const MAX_WAIT_MS = 5000;
const LEAVE_MS = 700;

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function waitForAssets(root) {
  const tasks = [];

  const seen = new Set();
  root.querySelectorAll('img[src]').forEach((img) => {
    const src = img.currentSrc || img.src;
    if (!src || seen.has(src)) return;
    seen.add(src);
    const p = new Promise((resolve) => {
      const pre = new Image();
      pre.onload = pre.onerror = () => resolve();
      pre.src = src;
      if (pre.complete) resolve();
    });
    if (img.loading !== 'lazy') tasks.push(p);
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

const SEEN_KEY = 'ivi-design-preloader-seen';

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
  }
}

export function initPreloader(el) {
  if (!el) return Promise.resolve();

  if (alreadySeen()) {
    el.remove();
    return Promise.resolve();
  }
  remember();
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

    for (let i = 0; i < RAMP_STEPS; i++) {
      const t = easeInOutSine(i / RAMP_STEPS);
      await wait(SLOW_MS + (FAST_MS - SLOW_MS) * t);
      step();
    }

    let ready = false;
    assetsReady.then(() => (ready = true));
    const spinStart = performance.now();
    const aligned = () => (index + RAMP_STEPS) % frames.length === 0;
    while (!ready || performance.now() - spinStart < MIN_SPIN_MS || !aligned()) {
      await wait(FAST_MS);
      step();
    }

    for (let i = 0; i < RAMP_STEPS; i++) {
      const t = easeInOutSine((i + 1) / RAMP_STEPS);
      await wait(FAST_MS + (SLOW_MS - FAST_MS) * t);
      step();
    }

    await wait(150);
    await leave();
  };

  return run();
}
