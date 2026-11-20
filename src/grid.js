import { splitWords, observeReveal } from './reveal.js';

export function initGrid(section) {
  if (!section) return;

  const title = section.querySelector('[data-words]');
  if (title) {
    splitWords(title);
    observeReveal(title);
  }

  const videos = section.querySelectorAll('video');
  if (!videos.length) return;

  const play = (video) => {
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) play(entry.target);
        else entry.target.pause();
      });
    },
    { rootMargin: '25% 0px', threshold: 0 },
  );

  videos.forEach((video) => io.observe(video));

  const warm = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        warm.unobserve(entry.target);
        entry.target.preload = 'auto';
        if (entry.target.paused && entry.target.readyState === 0) entry.target.load();
      });
    },
    { rootMargin: '200% 0px', threshold: 0 },
  );
  videos.forEach((video) => warm.observe(video));
}
