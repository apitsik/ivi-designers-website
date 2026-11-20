import { splitWords, observeReveal } from './reveal.js';

const THEME_SWITCH_AT = 0.58;
const THEME_SWITCH_OFF = 0.48;

export function initExtraText(section) {
  if (!section) return;

  const card = section.querySelector('.extra-text__card');
  const title = section.querySelector('[data-words]');
  const root = document.documentElement;

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

  let dark = false;

  const measure = () => {
    ticking = false;
    const top = section.getBoundingClientRect().top + card.offsetTop;
    const enter = clamp(1 - top / window.innerHeight, 0, 1);
    section.style.setProperty('--enter', enter.toFixed(4));
    if (!dark && enter >= THEME_SWITCH_AT) dark = true;
    else if (dark && enter < THEME_SWITCH_OFF) dark = false;
    root.classList.toggle('theme-dark', dark);
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
