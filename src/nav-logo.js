// Логотип в шапке: в покое — первый кадр, при наведении — быстрая
// циклическая смена всех кадров из assets/logos/ (как покадровая анимация).
// При уходе курсора возвращаемся к первому кадру. Клик — плавно наверх страницы.

// Vite собирает все файлы из папки в сборку и отдаёт их URL.
const frameModules = import.meta.glob('../assets/logos/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const FRAME_MS = 250; // 4 кадра/с

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

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = 0;
  let index = 0;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    // После клика ссылка остаётся в фокусе, и анимация крутилась бы, пока
    // не щёлкнешь куда-то ещё. Гасим её и снимаем фокус.
    stop();
    link.blur();
    window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  const start = () => {
    // Если пользователь просил меньше движения — кадры не крутим.
    if (timer || reduce.matches) return;
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

  // С пальца ховера нет: касание не должно запускать анимацию, которая
  // потом не остановится, пока не коснёшься другого места
  link.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'touch') start();
  });
  link.addEventListener('pointerleave', stop);
  // Фокус от мыши (после клика) не считаем — только с клавиатуры
  link.addEventListener('focus', () => {
    if (link.matches(':focus-visible')) start();
  });
  link.addEventListener('blur', stop);
}
