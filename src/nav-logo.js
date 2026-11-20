const frameModules = import.meta.glob('../assets/logos/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const FRAME_MS = 250;

export function initNavLogo(link) {
  if (!link) return;
  const img = link.querySelector('img');
  if (!img) return;

  const frames = Object.keys(frameModules)
    .sort()
    .map((key) => frameModules[key]);

  if (!frames.length) return;

  img.src = frames[0];

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
    stop();
    link.blur();
    window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  const start = () => {
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

  link.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'touch') start();
  });
  link.addEventListener('pointerleave', stop);
  link.addEventListener('focus', () => {
    if (link.matches(':focus-visible')) start();
  });
  link.addEventListener('blur', stop);
}
