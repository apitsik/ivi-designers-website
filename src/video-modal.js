import { lenis } from './smooth-scroll.js';

const ratioCache = new Map();
const VIMEO_ORIGIN = 'https://player.vimeo.com';

export function initVideoModal(modal, cards) {
  if (!modal) return;

  const dialog = modal.querySelector('.video-modal__dialog');
  const frame = modal.querySelector('.video-modal__frame');
  const glow = modal.querySelector('.video-modal__glow');
  const title = modal.querySelector('.video-modal__title');
  const closeBtn = modal.querySelector('.video-modal__close');
  const muteBtn = modal.querySelector('.video-modal__mute');
  const fsBtn = modal.querySelector('.video-modal__fullscreen');
  let muted = false;
  let opener = null;
  let hideTimer = 0;
  let openId = null;
  let openTitle = '';
  let openCrop = '1';
  const pending = new Map();

  const setRatio = (w, h) => {
    if (!w || !h) return;
    dialog.style.setProperty('--video-ar', `${w} / ${h}`);
    modal.classList.toggle('video-modal--portrait', h > w);
  };

  const setMuted = (value) => {
    muted = value;
    muteBtn.setAttribute('aria-pressed', String(value));
    muteBtn.setAttribute('aria-label', value ? 'Включить звук' : 'Выключить звук');
    muteBtn.classList.toggle('is-muted', value);
  };

  const toggleMute = () => {
    const iframe = frame.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) return;
    setMuted(!muted);
    iframe.contentWindow.postMessage(
      JSON.stringify({ method: 'setMuted', value: muted }),
      VIMEO_ORIGIN,
    );
  };

  window.addEventListener('message', (e) => {
    if (e.origin !== VIMEO_ORIGIN) return;
    let data = e.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    const resolve = data && pending.get(data.method);
    if (resolve) {
      pending.delete(data.method);
      resolve(data.value);
    }
  });

  const askPlayer = (method) =>
    new Promise((resolve) => {
      const iframe = frame.querySelector('iframe');
      if (!iframe || !iframe.contentWindow) return resolve(null);
      const timer = setTimeout(() => {
        pending.delete(method);
        resolve(null);
      }, 600);
      pending.set(method, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
      iframe.contentWindow.postMessage(JSON.stringify({ method }), VIMEO_ORIGIN);
    });

  const reloadPlayer = async (controls) => {
    const id = openId;
    const start = await askPlayer('getCurrentTime');
    if (!id || openId !== id) return;
    frame.style.setProperty('--video-crop', controls ? '1' : openCrop);
    frame.replaceChildren(buildPlayer(id, openTitle, { controls, start, muted }));
  };

  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const fsSupported = !!(frame.requestFullscreen || frame.webkitRequestFullscreen);
  fsBtn.hidden = !fsSupported;

  const toggleFullscreen = () => {
    if (fsElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      (frame.requestFullscreen || frame.webkitRequestFullscreen).call(frame);
    }
  };

  const syncFullscreen = () => {
    const on = fsElement() === frame;
    fsBtn.classList.toggle('is-fullscreen', on);
    fsBtn.setAttribute('aria-label', on ? 'Выйти из полноэкранного режима' : 'Во весь экран');
    if (openId) reloadPlayer(on);
  };

  const open = async (card) => {
    const id = card.dataset.vimeo;
    if (!id) return;
    opener = card;
    openId = id;
    clearTimeout(hideTimer);

    title.textContent = card.dataset.title || '';
    const img = card.querySelector('img');
    glow.style.backgroundImage = img ? `url("${img.currentSrc || img.src}")` : '';

    if (card.dataset.ratio) {
      const [w, h] = card.dataset.ratio.split('/').map(Number);
      setRatio(w, h);
    } else if (ratioCache.has(id)) {
      setRatio(...ratioCache.get(id));
    } else if (img && img.naturalWidth) {
      setRatio(img.naturalWidth, img.naturalHeight);
    } else {
      setRatio(16, 9);
    }

    setMuted(false);
    openTitle = card.dataset.title || '';
    openCrop = card.dataset.crop || '1';
    frame.style.setProperty('--video-crop', openCrop);
    frame.replaceChildren(buildPlayer(id, openTitle));

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('video-modal-open');
    lenis?.stop();
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('video-modal--open')));
    closeBtn.focus({ preventScroll: true });

    if (!card.dataset.ratio && !ratioCache.has(id)) {
      const size = await fetchVimeoSize(id);
      if (size) {
        ratioCache.set(id, size);
        if (openId === id) setRatio(...size);
      }
    }
  };

  const close = () => {
    if (modal.hidden) return;
    openId = null;
    modal.classList.remove('video-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('video-modal-open');
    lenis?.start();
    if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    frame.replaceChildren();
    hideTimer = setTimeout(() => {
      modal.hidden = true;
      glow.style.backgroundImage = '';
    }, 350);
    if (opener) opener.focus({ preventScroll: true });
    opener = null;
  };

  muteBtn.addEventListener('click', toggleMute);
  fsBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);
  cards.forEach((card) => card.addEventListener('click', () => open(card)));
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

async function fetchVimeoSize(id) {
  try {
    const url = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.width && data.height ? [data.width, data.height] : null;
  } catch {
    return null;
  }
}

function buildPlayer(id, name, { controls = false, start = 0, muted = false } = {}) {
  const iframe = document.createElement('iframe');
  const params = new URLSearchParams({
    autoplay: '1',
    title: '0',
    byline: '0',
    portrait: '0',
    controls: controls ? '1' : '0',
    badge: '0',
    pip: '0',
    playsinline: '1',
    dnt: '1',
  });
  if (muted) params.set('muted', '1');
  const time = Math.floor(start || 0);
  iframe.src = `${VIMEO_ORIGIN}/video/${id}?${params}${time > 0 ? `#t=${time}s` : ''}`;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.title = name || 'Showreel';
  return iframe;
}
