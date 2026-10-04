// Extra Text: розовая плашка выезжает снизу, по пути подрастает (0.8 → 1,
// как step 1 → step 3 в Figma), и в момент, когда её верх проходит
// середину экрана, вся страница переключается с белого на чёрный
// (класс .theme-dark на <html>, сам переход — в CSS).
// Иконка, заголовок и подзаголовок проявляются той же волной из блюра,
// что и заголовок шоурилов (src/reveal.js).

import { splitWords, observeReveal } from './reveal.js';

// Доля экрана, которую верх плашки должен пройти снизу вверх, чтобы
// фон стал чёрным: 0.5 — середина, 0.33 — нижняя треть.
const THEME_SWITCH_AT = 0.5;

export function initExtraText(section) {
  if (!section) return;

  const card = section.querySelector('.extra-text__card');
  const title = section.querySelector('[data-words]');
  const root = document.documentElement;

  // Волна проявления идёт сквозь всё содержимое по порядку:
  // иконка (0) → слова заголовка (1…n) → подзаголовок (n+1).
  // Индекс каждого элемента — в --word-index, задержка считается в CSS.
  if (title) {
    const icon = section.querySelector('.extra-text__icon');
    const subtitle = section.querySelector('.extra-text__subtitle');
    let i = 0;
    if (icon) icon.style.setProperty('--word-index', i++);
    i = splitWords(title, i);
    if (subtitle) subtitle.style.setProperty('--word-index', i);
    observeReveal(card, section);
  }

  let ticking = false;

  const measure = () => {
    ticking = false;
    // 0 — верх плашки у нижнего края окна, 1 — у верхнего
    const top = card.getBoundingClientRect().top;
    const enter = clamp(1 - top / window.innerHeight, 0, 1);
    section.style.setProperty('--enter', enter.toFixed(4));
    root.classList.toggle('theme-dark', enter >= THEME_SWITCH_AT);
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

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
