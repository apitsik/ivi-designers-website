const EASE = 0.14;
const SNAP = 0.4;

export function initHeroSpotlight(hero) {
  if (!hero) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.createElement('div');
  layer.className = 'hero__spotlight';
  layer.setAttribute('aria-hidden', 'true');
  hero.prepend(layer);

  let want = null;
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
