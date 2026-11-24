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

  const HEAD_MS = 1100;
  const TAIL_MS = 1300;
  const TAIL_AT_MS = 1000;
  const WIDTH_FROM = 0.25;
  const HOLD_MAX_MS = 4000;
  const MAX_FRAME_MS = 48;

  const WIDTH_THIN = 5;
  const WIDTH_FAT = 30;

  const ROWS = 6;
  const STEP = 236;
  const MID0 = -590;
  const LEAD = 290;
  const EDGE = 30;
  const BEND_START = [70, 95, 60, 100, 65, 85];
  const BEND_END = [95, 60, 100, 70, 90, 60];
  const HANDLE = [0.34, 0.3, 0.38, 0.32, 0.36, 0.3];
  const TURN_K = 0.7;

  const PATH = (() => {
    const K = Math.SQRT1_2;
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const mul = (a, k) => [a[0] * k, a[1] * k];
    const len = (a) => Math.hypot(a[0], a[1]);
    const unit = (a) => mul(a, 1 / len(a));
    const fmt = ([u, v]) => `${(500 + K * (u + v)).toFixed(1)} ${(500 + K * (v - u)).toFixed(1)}`;

    const mids = Array.from({ length: ROWS }, (_, i) => MID0 + i * STEP);
    const reach = mids.map((m) => 707 - Math.abs(m));
    const depth = [LEAD];
    for (let i = 0; i < ROWS - 1; i += 1) depth.push(Math.max(reach[i], reach[i + 1]) + EDGE);
    depth.push(LEAD);

    const rows = mids.map((m, i) => {
      const d = i % 2 === 0 ? 1 : -1;
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
      const out = unit(sub(row.end, row.c2));
      const into = unit(sub(next.c1, next.start));
      const h = TURN_K * len(sub(next.start, row.end));
      d += curve(add(row.end, mul(out, h)), sub(next.start, mul(into, h)), next.start);
    });
    return d;
  })();

  const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

  function waitForAssets() {
    const tasks = [];
    const vh = window.innerHeight;
    const always = '.nav__logo-img, .hero-notes img';
    document.querySelectorAll('img[src]:not([loading="lazy"])').forEach((img) => {
      if (!img.matches(always)) {
        const r = img.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || r.width === 0) return;
      }
      if (img.complete && img.naturalWidth > 0) {
        tasks.push(img.decode ? img.decode().catch(() => {}) : Promise.resolve());
        return;
      }
      tasks.push(
        new Promise((r) => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', r, { once: true });
        }).then(() => (img.decode ? img.decode().catch(() => {}) : null)),
      );
    });
    const bg = document.querySelector('.hero__background');
    const m = bg && /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(bg).backgroundImage);
    if (m) {
      tasks.push(
        new Promise((r) => {
          const pre = new Image();
          pre.onload = pre.onerror = r;
          pre.src = m[1];
          if (pre.complete) r();
        }),
      );
    }
    if (!window.__heroReady) {
      tasks.push(new Promise((r) => window.addEventListener('hero-ready', r, { once: true })));
    }
    if (document.fonts?.ready) tasks.push(document.fonts.ready.catch(() => {}));
    return Promise.all(tasks);
  }

  const whenSiteReady = () => {
    const app = new Promise((r) => window.addEventListener('app-ready', r, { once: true }));
    window.__preloaderState = 'covered';
    window.dispatchEvent(new Event('preloader-covered'));
    return app.then(waitForAssets);
  };

  let told = false;
  const done = () => {
    document.documentElement.classList.remove('is-preloading');
    if (told) return;
    told = true;
    window.__preloaderState = 'done';
    window.dispatchEvent(new Event('preloader-done'));
  };

  function initPreloaderStroke(old) {
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
    document.documentElement.classList.add('is-preloading');

    const path = root.querySelector('.preloader-stroke__path');
    const len = path.getTotalLength();

    const paint = (from, to, width) => {
      path.style.strokeDasharray = `${to - from}px, 999999px`;
      path.style.strokeDashoffset = `${-from}px`;
      path.style.strokeWidth = `${width}%`;
    };
    paint(0, 0, WIDTH_THIN);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return Promise.race([whenSiteReady(), wait(HOLD_MAX_MS)]).then(() => {
        root.remove();
        done();
      });
    }

    const FAT = WIDTH_FAT - WIDTH_THIN;
    const narrow = window.innerWidth <= 720 || window.innerWidth < window.innerHeight;
    const from0 = narrow ? 0.4 : WIDTH_FROM;
    return play(
      (ms) => {
        const head = clamp01(ms / HEAD_MS);
        const tail = clamp01((ms - TAIL_AT_MS) / TAIL_MS);
        const g = ease(clamp01((head - from0) / (1 - from0)));
        const grow = narrow ? g * g : g;
        const width = WIDTH_THIN + FAT * grow * (1 - ease(tail));
        paint(len * ease(tail), len * ease(head), width);
      },
      whenSiteReady,
      () => {
        root.classList.add('is-open');
        window.__preloaderState = 'open';
        window.dispatchEvent(new Event('preloader-open'));
      },
    ).then(() => {
      root.remove();
      done();
    });
  }

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const start = () => initPreloaderStroke(document.querySelector('.preloader'));
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
