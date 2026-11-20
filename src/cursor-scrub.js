const EASE = 0.015;
const FPS = 30000 / 1001;
const SETTLE = 0.5 / FPS;

export function initCursorScrub(video) {
  if (!video) return;

  video.muted = true;
  video.playsInline = true;
  video.autoplay = false;
  video.loop = false;
  video.controls = false;

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

  const setTargetFromX = (clientX) => {
    if (!video.duration) return;
    const progress = Math.max(0, Math.min(1, clientX / window.innerWidth));
    targetTime = progress * video.duration;
  };

  window.addEventListener('pointermove', (e) => setTargetFromX(e.clientX), { passive: true });
  window.addEventListener('pointerdown', (e) => setTargetFromX(e.clientX), { passive: true });

  const tick = (timestamp) => {
    const dt = prevTimestamp ? Math.min(timestamp - prevTimestamp, 100) : 16.67;
    prevTimestamp = timestamp;
    const alpha = 1 - Math.pow(1 - EASE, dt / 16.67);

    const delta = targetTime - currentTime;
    currentTime = Math.abs(delta) < SETTLE ? targetTime : currentTime + delta * alpha;

    const frame = Math.min(Math.round(currentTime * FPS), lastFrame);
    if (duration && frame !== renderedFrame && !video.seeking) {
      video.currentTime = (frame + 0.5) / FPS;
      renderedFrame = frame;
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
