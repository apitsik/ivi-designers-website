// Grid: библиотека иллюстраций. Заголовок проявляется из блюра той же
// волной, что остальные H2 (src/reveal.js). Видео в сетке играют без звука
// и контролов; чтобы не крутить десяток роликов за кадром, они стартуют
// при появлении в зоне видимости и ставятся на паузу, когда уходят с экрана.
// @gdeprostotamangelovsto

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
    // Autoplay может быть запрещён браузером — молча пропускаем
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
}
