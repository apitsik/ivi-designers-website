// Логотип в шапке: в покое — первый кадр, при наведении — быстрая
// циклическая смена всех кадров из assets/logos/ (как покадровая анимация).
// При уходе курсора возвращаемся к первому кадру.

// Vite собирает все файлы из папки в сборку и отдаёт их URL.
const frameModules = import.meta.glob('../assets/logos/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const FRAME_MS = 70; // ~14 кадров/с — быстро, но каждый кадр ещё различим

export function initNavLogo(link) {
  if (!link) return;
  const img = link.querySelector('img');
  if (!img) return;

  // Сортируем по имени файла, чтобы порядок был logo-01 → logo-06.
  const frames = Object.keys(frameModules)
    .sort()
    .map((key) => frameModules[key]);

  if (!frames.length) return;

  img.src = frames[0];

  // Прогреваем остальные кадры, чтобы при первом ховере не было мигания.
  frames.slice(1).forEach((src) => {
    const pre = new Image();
    pre.src = src;
  });

  if (frames.length < 2) return;

  let timer = 0;
  let index = 0;

  const start = () => {
    if (timer) return;
    timer = window.setInterval(() => {
      index = (index + 1) % frames.length;
      img.src = frames[index];
    }, FRAME_MS);
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
    index = 0;
    img.src = frames[0];
  };

  link.addEventListener('pointerenter', start);
  link.addEventListener('pointerleave', stop);
  link.addEventListener('focus', start);
  link.addEventListener('blur', stop);

  // Если пользователь просил меньше движения — кадры не крутим.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) {
    link.removeEventListener('pointerenter', start);
    link.removeEventListener('focus', start);
  }
}
