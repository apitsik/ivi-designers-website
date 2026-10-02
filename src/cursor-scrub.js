// Видео «перематывается» горизонтальным положением курсора:
// левый край экрана — начало ролика, правый — конец.

const EASE = 0.12; // доля пути до цели за кадр: меньше — плавнее и «тягучее»
const EPSILON = 1 / 120; // разница во времени, меньше которой не перематываем

export function initCursorScrub(video) {
  if (!video) return;

  video.muted = true;
  video.playsInline = true;
  video.autoplay = false;
  video.loop = false;
  video.controls = false;

  // Никакого штатного воспроизведения: ролик двигается только за курсором.
  video.addEventListener('play', () => video.pause());

  let duration = 0;
  let targetTime = 0;
  let currentTime = 0;

  const onReady = () => {
    duration = video.duration || 0;
    video.pause();
  };

  if (video.readyState >= 1) onReady();
  else video.addEventListener('loadedmetadata', onReady, { once: true });

  const setTargetFromX = (clientX) => {
    if (!duration) return;
    const progress = Math.min(Math.max(clientX / window.innerWidth, 0), 1);
    targetTime = progress * duration;
  };

  // pointermove покрывает и мышь, и палец на тач-экранах.
  window.addEventListener('pointermove', (e) => setTargetFromX(e.clientX), { passive: true });
  window.addEventListener('pointerdown', (e) => setTargetFromX(e.clientX), { passive: true });

  const tick = () => {
    currentTime += (targetTime - currentTime) * EASE;

    // Не ставим новую позицию, пока браузер не закончил предыдущую перемотку,
    // иначе запросы копятся и видео дёргается.
    if (duration && !video.seeking && Math.abs(video.currentTime - currentTime) > EPSILON) {
      video.currentTime = Math.min(currentTime, duration - 0.001);
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
