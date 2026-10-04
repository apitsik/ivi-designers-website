// Шоурилы: наезд плашки на хиро, затухание хиро, проявление заголовка
// по словам и параллакс карточек со сглаживанием (lerp), чтобы шаги
// колёсика мыши не давали ступенчатого движения.

const MOBILE = window.matchMedia('(max-width: 720px)');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

// Коэффициент сглаживания параллакса: доля пути к цели за кадр (при 60 fps).
// Меньше — мягче и «тяжелее», больше — отзывчивее.
const SMOOTHING = 0.12;
// Порог заголовка: когда плашка закрыла столько экрана, слова начинают проявляться
const TITLE_TRIGGER = 0.35;

export function initShowreels(section) {
  if (!section) return;

  const grid = section.querySelector('.showreels__grid');
  const items = [...section.querySelectorAll('[data-speed]')].map((el) => ({
    el,
    speed: parseFloat(el.dataset.speed) || 0,
    current: 0, // сглаженный сдвиг, который реально применён
    target: 0, // сдвиг, который даёт текущий scrollY
  }));

  const title = section.querySelector('[data-words]');
  if (title) splitWords(title);
  let titleShown = false;

  let raf = 0;
  let lastTime = 0;

  // Считаем целевые значения от scrollY. Вызывается на скролл/ресайз.
  const measure = () => {
    // Насколько плашка закрыла хиро: 0 — её верх у нижнего края окна, 1 — у верхнего.
    const top = section.getBoundingClientRect().top;
    const enter = clamp(1 - top / window.innerHeight, 0, 1);
    section.style.setProperty('--enter', enter.toFixed(4));
    document.documentElement.style.setProperty('--hero-fade', enter.toFixed(4));

    if (title && !titleShown && enter >= TITLE_TRIGGER) {
      titleShown = true;
      title.classList.add('is-visible');
    }

    if (MOBILE.matches || REDUCED.matches) {
      items.forEach((it) => {
        it.target = it.current = 0;
        it.el.style.transform = '';
      });
      return;
    }

    // Параллакс: сдвиг пропорционален расстоянию центра карточки от центра окна.
    // Положительная скорость — карточка «ближе» и едет быстрее скролла,
    // отрицательная — отстаёт. Считаем от нетрансформированной позиции.
    const gridTop = grid.getBoundingClientRect().top;
    const mid = window.innerHeight / 2;
    items.forEach((it) => {
      const center = gridTop + it.el.offsetTop + it.el.offsetHeight / 2;
      it.target = (mid - center) * it.speed;
    });
  };

  // Кадр сглаживания: каждая карточка подтягивается к цели по lerp,
  // с поправкой на реальную длительность кадра (на 120 Гц не быстрее).
  const tick = (now) => {
    raf = 0;
    const dt = lastTime ? Math.min((now - lastTime) / 16.67, 3) : 1;
    lastTime = now;
    const k = 1 - Math.pow(1 - SMOOTHING, dt);

    let moving = false;
    items.forEach((it) => {
      const diff = it.target - it.current;
      if (Math.abs(diff) < 0.05) {
        it.current = it.target;
      } else {
        it.current += diff * k;
        moving = true;
      }
      it.el.style.transform = `translate3d(0, ${it.current.toFixed(2)}px, 0)`;
    });

    if (moving) raf = requestAnimationFrame(tick);
    else lastTime = 0;
  };

  const onScroll = () => {
    measure();
    if (!raf) raf = requestAnimationFrame(tick);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  MOBILE.addEventListener('change', onScroll);
  onScroll();
}

// Разбивает текст заголовка на слова-span с индексом для задержки анимации
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.style.setProperty('--word-index', i);
    span.textContent = word;
    el.append(span, i < words.length - 1 ? ' ' : '');
  });
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
