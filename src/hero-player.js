// Мини-плеер на первом экране (hero-player в Figma, 109:3322).
//
// Подборка лежит в public/music/playlist.json — список треков с обложками
// и mp3 в той же папке (формат описан в README, раздел «Музыка»).
// Плеер читает плейлист при загрузке, показывает первый трек, по кнопке
// играет его и по окончании сам переходит к следующему (по кругу).
// Клик по обложке — следующий трек. Если плейлист пустой или не грузится,
// виджет скрывается, чтобы не торчать пустым.
//
// Браузеры не дают включать звук без действия пользователя, поэтому музыка
// стартует только по клику на play; дальше треки сменяются сами.
//
// @gdeprostotamangelovsto

const PLAYLIST_URL = '/music/playlist.json';

export async function initHeroPlayer(root) {
  if (!root) return;

  const cover = root.querySelector('.hero-player__cover');
  const title = root.querySelector('.hero-player__title');
  const explicit = root.querySelector('.hero-player__explicit');
  const line2 = root.querySelector('.hero-player__artist');
  const button = root.querySelector('.hero-player__play');
  const progress = root.querySelector('.hero-player__progress');

  let data;
  try {
    const res = await fetch(PLAYLIST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch (err) {
    console.warn('hero-player: не удалось загрузить плейлист', err);
    root.hidden = true;
    return;
  }

  const tracks = (data.tracks || []).filter((t) => t && t.src);
  if (!tracks.length) {
    root.hidden = true;
    return;
  }
  const collection = data.collection || 'ivi tracks collection';

  const audio = new Audio();
  audio.preload = 'metadata';

  let index = 0;
  let playing = false;

  const show = (i) => {
    index = (i + tracks.length) % tracks.length;
    const t = tracks[index];
    audio.src = t.src;
    title.textContent = t.title || 'Без названия';
    line2.textContent = t.artist || collection;
    explicit.toggleAttribute('hidden', !t.explicit); // у <svg> нет свойства .hidden
    if (t.cover) {
      cover.src = t.cover;
      cover.alt = t.title ? `Обложка: ${t.title}` : '';
      cover.hidden = false;
    } else {
      cover.removeAttribute('src');
      cover.hidden = true;
    }
    progress.style.setProperty('--progress', '0');
    root.title = tracks.length > 1 ? `${index + 1} / ${tracks.length}` : '';
  };

  const setPlaying = (on) => {
    playing = on;
    root.classList.toggle('hero-player--playing', on);
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Пауза' : 'Играть');
  };

  const play = async () => {
    try {
      await audio.play();
      setPlaying(true);
    } catch (err) {
      // Автоплей заблокирован или файл не найден — остаёмся на паузе.
      console.warn('hero-player: воспроизведение не началось', err);
      setPlaying(false);
    }
  };

  const next = (autoplay = playing) => {
    show(index + 1);
    if (autoplay) play();
  };

  button.addEventListener('click', () => {
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      play();
    }
  });

  cover.addEventListener('click', () => next());

  audio.addEventListener('ended', () => next(true));
  audio.addEventListener('error', () => {
    console.warn('hero-player: не удалось открыть', audio.src);
    // Битый файл не должен ронять плеер: пробуем следующий, но не бесконечно.
    if (tracks.length > 1) next(playing);
    else setPlaying(false);
  });
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    progress.style.setProperty('--progress', String(audio.currentTime / audio.duration));
  });
  audio.addEventListener('pause', () => {
    if (!audio.ended) setPlaying(false);
  });

  // Поставить на паузу, если вкладка ушла в фон на мобильных? Нет —
  // фоновая музыка это и есть смысл виджета. Оставляем как есть.

  show(0);
  root.classList.add('hero-player--ready');

  return { next, play, pause: () => audio.pause(), audio };
}
