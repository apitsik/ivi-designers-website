// Шоурилы: наезд плашки на хиро, затухание хиро, появление заголовка
// и параллакс карточек. Всё считается от scrollY в одном rAF.

const MOBILE = window.matchMedia('(max-width: 720px)');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initShowreels(section) {
  if (!section) return;

  const grid = section.querySelector('.showreels__grid');
  const items = [...section.querySelectorAll('[data-speed]')];
  let ticking = false;

  const update = () => {
    ticking = false;

    // Насколько плашка закрыла хиро: 0 — её верх у нижнего края окна, 1 — у верхнего.
    const top = section.getBoundingClientRect().top;
    const enter = clamp(1 - top / window.innerHeight, 0, 1);
    section.style.setProperty('--enter', enter.toFixed(4));
    document.documentElement.style.setProperty('--hero-fade', enter.toFixed(4));

    if (MOBILE.matches || REDUCED.matches) {
      items.forEach((el) => (el.style.transform = ''));
      return;
    }

    // Параллакс: сдвиг пропорционален расстоянию центра карточки от центра окна.
    // Положительная скорость — карточка «ближе» и едет быстрее скролла,
    // отрицательная — отстаёт. Считаем от нетрансформированной позиции.
    const gridTop = grid.getBoundingClientRect().top;
    const mid = window.innerHeight / 2;
    items.forEach((el) => {
      const speed = parseFloat(el.dataset.speed) || 0;
      const center = gridTop + el.offsetTop + el.offsetHeight / 2;
      const shift = (mid - center) * speed;
      el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    });
  };

  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  MOBILE.addEventListener('change', request);
  update();
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
