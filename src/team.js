// Team: сцена (100vh) залипает на экране, пока секция прокручивается
// на три «шага скролла» — по одному на команду. Внутри шага сначала снизу
// поднимается крупный постер, затем каскадом, один за другим, три мелких
// стикера вокруг него (раскадровка Team step 4 – step 14 в Figma).
// Заголовок проявляется из блюра той же волной, что и остальные H2
// (src/reveal.js).
//
// Позиции стикеров заданы в index.html в координатах макета 1440 × 832
// (data-x / data-y — верхний левый угол без поворота, data-w / data-h —
// размер, data-rot — поворот в градусах). Здесь они переводятся в проценты
// сцены, а прогресс скролла каждого стикера считается на каждый кадр
// и отдаётся в CSS через --p (0 — ещё под экраном, 1 — на месте).

import { splitWords, observeReveal } from './reveal.js';

// Размер макета, в котором расставлены стикеры
const DESIGN_W = 1440;
const DESIGN_H = 832;

// Сколько шагов скролла занимает блок (по числу постеров)
const STEPS = 3;

// Тайминг внутри одного шага (доли от его длины):
// постер едет на отрезке 0 → POSTER_END, стикер с порядковым номером n
// (1…3) стартует на STICKER_START + (n − 1) · STICKER_GAP и едет STICKER_LEN.
const POSTER_END = 0.55;
const STICKER_START = 0.3;
const STICKER_GAP = 0.16;
const STICKER_LEN = 0.26;

export function initTeam(section) {
  if (!section) return;

  const stage = section.querySelector('.team__stage');
  const title = section.querySelector('[data-words]');
  const stickers = [...section.querySelectorAll('.team__sticker')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (title) {
    splitWords(title);
    observeReveal(stage, section);
  }

  // Высота секции: экран сцены + по экрану на каждый шаг
  section.style.setProperty('--steps', STEPS);

  // Раскладка: координаты макета → проценты сцены
  const items = stickers.map((el) => {
    const d = el.dataset;
    const x = parseFloat(d.x);
    const y = parseFloat(d.y);
    const w = parseFloat(d.w);
    const h = parseFloat(d.h);
    el.style.left = `${((x / DESIGN_W) * 100).toFixed(3)}%`;
    el.style.top = `${((y / DESIGN_H) * 100).toFixed(3)}%`;
    el.style.width = `${((w / DESIGN_W) * 100).toFixed(3)}%`;
    el.style.setProperty('--ratio', `${w} / ${h}`);
    el.style.setProperty('--rot', `${d.rot || 0}deg`);

    const step = parseInt(d.step, 10) || 0;
    const order = parseInt(d.order, 10) || 0;
    let start;
    let end;
    if (order === 0) {
      start = 0;
      end = POSTER_END;
    } else {
      start = STICKER_START + (order - 1) * STICKER_GAP;
      end = Math.min(1, start + STICKER_LEN);
    }
    // Абсолютные границы в прогрессе всей секции
    return { el, start: (step + start) / STEPS, end: (step + end) / STEPS };
  });

  if (reduced) {
    items.forEach(({ el }) => el.style.setProperty('--p', 1));
    return;
  }

  let ticking = false;

  const measure = () => {
    ticking = false;
    const rect = section.getBoundingClientRect();
    // Пройденный путь от момента, когда сцена прилипла к верху экрана,
    // до момента, когда секция заканчивается (сцена отлипает)
    const travel = rect.height - window.innerHeight;
    const progress = travel > 0 ? clamp(-rect.top / travel, 0, 1) : 1;

    items.forEach(({ el, start, end }) => {
      const t = clamp((progress - start) / (end - start), 0, 1);
      el.style.setProperty('--p', easeOut(t).toFixed(4));
    });
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(measure);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  measure();
}

// Мягкое торможение в конце пути — стикер «долетает» и останавливается
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
