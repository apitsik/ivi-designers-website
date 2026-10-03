// Попап с плеером Vimeo. Открывается кликом по карточке с data-vimeo,
// закрывается крестиком, Esc или кликом по оверлею. При закрытии iframe
// удаляется целиком — видео останавливается и выгружается.

export function initVideoModal(modal, cards) {
  if (!modal) return;

  const frame = modal.querySelector('.video-modal__frame');
  const glow = modal.querySelector('.video-modal__glow');
  const title = modal.querySelector('.video-modal__title');
  const closeBtn = modal.querySelector('.video-modal__close');
  let opener = null;
  let hideTimer = 0;

  const open = (card) => {
    const id = card.dataset.vimeo;
    if (!id) return;
    opener = card;
    clearTimeout(hideTimer);

    title.textContent = card.dataset.title || '';
    // Глоу — размытая копия превью карточки
    const img = card.querySelector('img');
    glow.style.backgroundImage = img ? `url("${img.currentSrc || img.src}")` : '';

    frame.replaceChildren(buildPlayer(id, card.dataset.title));

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('video-modal-open');
    // Два кадра: сначала display, потом класс — чтобы сработал transition
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('video-modal--open')));
    closeBtn.focus({ preventScroll: true });
  };

  const close = () => {
    if (modal.hidden) return;
    modal.classList.remove('video-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('video-modal-open');
    // Плеер выгружаем сразу, чтобы звук не продолжал играть под анимацию
    frame.replaceChildren();
    hideTimer = setTimeout(() => {
      modal.hidden = true;
      glow.style.backgroundImage = '';
    }, 350);
    if (opener) opener.focus({ preventScroll: true });
    opener = null;
  };

  cards.forEach((card) => card.addEventListener('click', () => open(card)));
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function buildPlayer(id, name) {
  const iframe = document.createElement('iframe');
  const params = new URLSearchParams({
    autoplay: '1',
    title: '0',
    byline: '0',
    portrait: '0',
    dnt: '1',
  });
  iframe.src = `https://player.vimeo.com/video/${id}?${params}`;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.title = name || 'Showreel';
  return iframe;
}
