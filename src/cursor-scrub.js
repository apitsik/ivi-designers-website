// Видео «перематывается» горизонтальным положением курсора:
// левый край экрана — начало ролика, правый — конец.
// Позиция ролика не прыгает к курсору, а догоняет его с инерцией (lerp).

const EASE = 0.015; // доля пути до цели за кадр при 60 fps: меньше — «вязче»
const FPS = 30000 / 1001; // частота кадров ролика (hero-ivi.mp4 — 29.97)
const SETTLE = 0.5 / FPS; // ближе полкадра к цели — считаем, что догнали

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
  let lastFrame = 0;
  let targetTime = 0;
  let currentTime = 0;
  let renderedFrame = -1;
  let prevTimestamp = 0;

  const onReady = () => {
    duration = video.duration || 0;
    lastFrame = Math.max(Math.floor(duration * FPS) - 1, 0);
    video.pause();
  };

  if (video.readyState >= 1) onReady();
  else video.addEventListener('loadedmetadata', onReady, { once: true });

  // 100% пути — полная ширина окна: X = 0 — первый кадр, X = innerWidth — последний.
  const setTargetFromX = (clientX) => {
    if (!video.duration) return;
    const progress = Math.max(0, Math.min(1, clientX / window.innerWidth));
    targetTime = progress * video.duration;
  };

  // pointermove покрывает и мышь, и палец на тач-экранах.
  window.addEventListener('pointermove', (e) => setTargetFromX(e.clientX), { passive: true });
  window.addEventListener('pointerdown', (e) => setTargetFromX(e.clientX), { passive: true });

  const tick = (timestamp) => {
    // Сглаживание не зависит от частоты экрана: на 120 Гц инерция та же, что на 60 Гц.
    const dt = prevTimestamp ? Math.min(timestamp - prevTimestamp, 100) : 16.67;
    prevTimestamp = timestamp;
    const alpha = 1 - Math.pow(1 - EASE, dt / 16.67);

    const delta = targetTime - currentTime;
    // У самой цели перестаём «ползти» бесконечно малыми шагами и встаём точно в неё.
    currentTime = Math.abs(delta) < SETTLE ? targetTime : currentTime + delta * alpha;

    // Перематываем только когда сменился кадр ролика: в покое seek не вызывается вовсе,
    // поэтому при остановке мыши нет микро-дёрганий. Пока браузер не закончил
    // предыдущую перемотку, новую не ставим, чтобы запросы не копились.
    const frame = Math.min(Math.round(currentTime * FPS), lastFrame);
    if (duration && frame !== renderedFrame && !video.seeking) {
      // Середина кадра, чтобы округление не показало соседний.
      video.currentTime = (frame + 0.5) / FPS;
      renderedFrame = frame;
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
