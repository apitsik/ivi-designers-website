/**
 * Подсветка под курсором в хиро.
 *
 * Поверх фона лежат два слоя: сетка точек и мягкое розовое свечение.
 * Оба видны только рядом с курсором — их вырезает круглая маска, центр
 * которой едет за мышью. Дальше от центра точки плавно гаснут.
 *
 * Считать нечего: JS только пишет две переменные --x и --y, всё
 * рисование на стороне CSS, поэтому эффект не грузит процессор даже на
 * слабых машинах. Координаты догоняют курсор лерпом — так пятно не
 * дёргается на рывках мыши. Кадр рисуется, только пока пятно едет: как
 * доехало, цикл засыпает до следующего движения.
 *
 * На тач-устройствах и при prefers-reduced-motion слой не включается.
 */

const EASE = 0.14; // доля пути за кадр: больше — резче follow
const SNAP = 0.4; // ближе этого считаем, что доехали

export function initHeroSpotlight(hero) {
  if (!hero) return;

  // Слой создаём всегда, но зажигается он только от мыши: с пальца
  // pointermove приходит с другим pointerType и мы его пропускаем
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.createElement('div');
  layer.className = 'hero__spotlight';
  layer.setAttribute('aria-hidden', 'true');
  hero.prepend(layer);

  let want = null; // куда ведёт курсор
  const now = { x: 0, y: 0 };
  let started = false;
  let raf = 0;

  const draw = () => {
    layer.style.setProperty('--x', `${now.x}px`);
    layer.style.setProperty('--y', `${now.y}px`);
  };

  const tick = () => {
    raf = 0;
    if (!want) return;
    now.x += (want.x - now.x) * EASE;
    now.y += (want.y - now.y) * EASE;
    draw();
    if (Math.abs(want.x - now.x) > SNAP || Math.abs(want.y - now.y) > SNAP) {
      raf = requestAnimationFrame(tick);
    }
  };

  const run = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    want = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!started) {
      // Первое попадание — ставим пятно сразу под курсор, без наезда с угла
      started = true;
      now.x = want.x;
      now.y = want.y;
      draw();
      layer.classList.add('is-on');
      return;
    }
    run();
  });

  hero.addEventListener('pointerleave', () => {
    layer.classList.remove('is-on');
    started = false;
    want = null;
  });
}
