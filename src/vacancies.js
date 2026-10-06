// Vacancies: «Присоединяйся к лучшей команде». Заголовок проявляется из
// блюра той же волной, что остальные H2 (src/reveal.js), подзаголовок и
// кнопка продолжают её. Позади текста — след из фотографий за курсором:
// каждые TRAIL_STEP px движения в точке курсора появляется карточка со
// следующим фото (случайный поворот, скругление), плавно проявляется,
// на миг застывает, растворяется и удаляется из DOM. Одновременно на
// экране не больше MAX_SHOTS карточек. Кнопка «Отправить резюме» открывает
// попап с формой — пока без бэкенда, после отправки показывает «спасибо».
// @gdeprostotamangelovsto

import { splitWords, observeReveal } from './reveal.js';
import { lenis } from './smooth-scroll.js';

const IMAGES = [
  'vacancies-image-1.jpg',
  'vacancies-image-2.jpg',
  'vacancies-image-3.jpg',
  'vacancies-image-4.jpg',
  'vacancies-image-5.jpg',
  'vacancies-image-6.jpg',
  'vacancies-image-7.jpg',
  'vacancies-image-8.jpg',
  'vacancies-image-9.jpg',
  'vacancies-image-9-1.jpg',
  'vacancies-image-10.jpg',
  'vacancies-image-11.jpg',
  'vacancies-image-12.jpg',
  'vacancies-image-13.jpg',
  'vacancies-image-14.jpg',
  'vacancies-image-15.jpg',
  'vacancies-image-16.jpg',
  'vacancies-image-17.jpg',
  'vacancies-image-18.jpg',
  'vacancies-image-19.jpg',
  'vacancies-image-20.jpg',
].map((name) => `/images/vacancies/${name}`);

// ----- параметры следа (по мотивам Smooth Image Trail) -----
const TRAIL_SPACING = 70; // px пройденного пути между карточками
const MAX_SHOTS = 7; // одновременно видимых карточек
const ROTATE_MAX = 12; // ± градусов
const SIZE_JITTER = 0.1; // ± доля от базового размера
const DRIFT = 18;
const MIN_AGE_OPACITY = 0.22; // прозрачность самой дальней карточки // px — карточка чуть доезжает по направлению движения
const POP_MS = 520; // упругое появление 0.5 → 1.05 → 1
const HOLD_MS = 420; // держится на экране
const EXIT_MS = 480; // мягкое растворение
const EVICT_MS = 220; // быстрый уход самой старой при переполнении

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initVacancies(section, modal) {
  if (!section) return;

  initReveal(section);
  initTrail(section);
  initResumeModal(modal, document.querySelectorAll('[data-resume-open]'));
}

// ----- проявление: слова H2, затем подзаголовок и кнопка -----

function initReveal(section) {
  const title = section.querySelector('[data-words]');
  const subtitle = section.querySelector('.vacancies__subtitle');
  const button = section.querySelector('.vacancies__button');
  let i = 0;
  if (title) i = splitWords(title);
  if (subtitle) subtitle.style.setProperty('--word-index', i++);
  if (button) button.style.setProperty('--word-index', i);
  observeReveal(section);
}

// ----- след из картинок -----

// Карточки спавнятся не по таймеру, а по пройденному пути: от точки
// последнего спавна до текущей позиции курсора отрезок делится шагами
// TRAIL_SPACING, и в каждой точке появляется карточка — при резком рывке
// они равномерно ложатся вдоль траектории, а не кучкуются. Каждая
// карточка: случайный поворот и размер, упругий поп (scale 0.5 → 1.05 → 1)
// с небольшим доездом по направлению движения, пауза и мягкое
// растворение с усадкой и уходом вниз. Больше MAX_SHOTS не живёт —
// самая старая быстро гаснет.
function initTrail(section) {
  const layer = section.querySelector('.vacancies__trail');
  if (!layer || REDUCED.matches) return;

  // Порядок фото — перетасованная очередь без повторов подряд
  let queue = [];
  const nextSrc = () => {
    if (!queue.length) queue = shuffle(IMAGES.slice());
    return queue.pop();
  };

  // Фото подгружаются заранее, когда секция подъезжает к экрану
  const preload = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      IMAGES.forEach((src) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
      });
      preload.disconnect();
    },
    { rootMargin: '50% 0px' },
  );
  preload.observe(section);

  const shots = []; // живые карточки по порядку появления
  let last = null; // точка последнего спавна
  const POP_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // упругий overshoot
  const EXIT_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

  const spawn = (x, y, dirX, dirY) => {
    const shot = document.createElement('div');
    shot.className = 'vacancies__shot';
    const rot = (Math.random() * 2 - 1) * ROTATE_MAX;
    const scale = 1 + (Math.random() * 2 - 1) * SIZE_JITTER;
    shot.style.setProperty('--size-scale', scale.toFixed(3));
    shot.style.left = `${x}px`;
    shot.style.top = `${y}px`;

    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = nextSrc();
    shot.append(img);
    layer.append(shot);

    // Доезд по направлению движения курсора: карточка «догоняет» точку
    const dx = dirX * DRIFT;
    const dy = dirY * DRIFT;
    const at = (tx, ty, s) => `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${s})`;

    const entry = { el: shot, rot, dx, dy, hiding: false, timer: 0, anim: null };
    shots.push(entry);

    entry.anim = shot.animate(
      [
        { opacity: 0, transform: at(-dx, -dy, 0.5), offset: 0 },
        { opacity: 1, transform: at(dx * 0.35, dy * 0.35, 1.05), offset: 0.62 },
        { opacity: 1, transform: at(dx, dy, 1), offset: 1 },
      ],
      { duration: POP_MS, easing: POP_EASE, fill: 'forwards' },
    );

    entry.timer = setTimeout(() => hide(entry, EXIT_MS), POP_MS + HOLD_MS);

    // Лишние — самые старые — быстро уходят
    const alive = shots.filter((s) => !s.hiding);
    for (let i = 0; i < alive.length - MAX_SHOTS; i++) hide(alive[i], EVICT_MS);
    fadeByAge();
  };

  // Чем дальше карточка от курсора (старше), тем прозрачнее: свежая — 1,
  // самая дальняя из живых — MIN_AGE_OPACITY. Ставится на <img>, чтобы
  // не спорить с попом/растворением, которые крутят opacity обёртки.
  const fadeByAge = () => {
    const alive = shots.filter((s) => !s.hiding);
    const n = alive.length;
    alive.forEach((s, i) => {
      const t = n > 1 ? (n - 1 - i) / Math.max(MAX_SHOTS - 1, 1) : 0;
      s.el.firstChild.style.opacity = (1 - Math.min(1, t) * (1 - MIN_AGE_OPACITY)).toFixed(3);
    });
  };

  const hide = (entry, duration) => {
    if (entry.hiding) return;
    entry.hiding = true;
    clearTimeout(entry.timer);
    // Стартуем из текущего состояния попа, чтобы не было скачка
    const cs = getComputedStyle(entry.el);
    const from = { opacity: cs.opacity, transform: cs.transform === 'none' ? '' : cs.transform };
    entry.anim?.cancel();
    const to = `translate(${entry.dx.toFixed(1)}px, ${(entry.dy + 14).toFixed(1)}px) rotate(${entry.rot.toFixed(2)}deg) scale(0.85)`;
    const anim = entry.el.animate(
      [
        { opacity: from.opacity, transform: from.transform || `rotate(${entry.rot}deg)` },
        { opacity: 0, transform: to },
      ],
      { duration, easing: EXIT_EASE, fill: 'forwards' },
    );
    anim.onfinish = () => {
      entry.el.remove();
      const i = shots.indexOf(entry);
      if (i !== -1) shots.splice(i, 1);
    };
  };

  section.addEventListener('pointermove', (e) => {
    // Под открытым попапом след не рисуем
    if (document.body.classList.contains('video-modal-open')) return;
    const rect = section.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!last) {
      last = { x, y };
      return;
    }
    let dx = x - last.x;
    let dy = y - last.y;
    let dist = Math.hypot(dx, dy);
    if (dist < TRAIL_SPACING) return;
    const ux = dx / dist;
    const uy = dy / dist;
    // Идём по отрезку шагами и спавним в каждой точке
    let n = 0;
    while (dist >= TRAIL_SPACING && n < 12) {
      last = { x: last.x + ux * TRAIL_SPACING, y: last.y + uy * TRAIL_SPACING };
      spawn(last.x, last.y, ux, uy);
      dist -= TRAIL_SPACING;
      n++;
    }
    // При очень длинном рывке хвост отрезка не копим — начинаем от курсора
    if (n >= 12) last = { x, y };
  });

  // Ушли из секции — следующий заход начнёт отсчёт заново, без «прыжка»
  const reset = () => {
    last = null;
  };
  section.addEventListener('pointerleave', reset);
  section.addEventListener('pointercancel', reset);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ----- попап с формой резюме -----

// Повторяет src/video-modal.js: hidden → display → класс --open через два
// кадра, закрытие по крестику, Esc, оверлею и клику по пустому месту диалога.
function initResumeModal(modal, openers) {
  if (!modal) return;

  const dialog = modal.querySelector('.video-modal__dialog');
  const closeBtn = modal.querySelector('.video-modal__close');
  const form = modal.querySelector('.resume-modal__card');
  const done = modal.querySelector('.resume-modal__done');
  const error = modal.querySelector('.resume-modal__error');
  const fileInput = modal.querySelector('.resume-modal__file-input');
  const fileName = modal.querySelector('.resume-modal__file-name');
  const fileHint = fileName ? fileName.textContent : '';
  let opener = null;
  let hideTimer = 0;

  const showError = (text) => {
    error.textContent = text;
    error.hidden = !text;
  };

  const resetForm = () => {
    form.reset();
    form.hidden = false;
    done.hidden = true;
    showError('');
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    if (fileName) {
      fileName.textContent = fileHint;
      fileName.classList.remove('is-set');
    }
  };

  const open = (btn) => {
    opener = btn;
    clearTimeout(hideTimer);
    resetForm();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('video-modal-open');
    lenis?.stop();
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('video-modal--open')));
    const first = form.querySelector('input');
    (first || closeBtn).focus({ preventScroll: true });
  };

  const close = () => {
    if (modal.hidden) return;
    modal.classList.remove('video-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('video-modal-open');
    lenis?.start();
    hideTimer = setTimeout(() => {
      modal.hidden = true;
    }, 350);
    if (opener) opener.focus({ preventScroll: true });
    opener = null;
  };

  openers.forEach((btn) => btn.addEventListener('click', () => open(btn)));
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  if (fileInput && fileName) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      fileName.textContent = file ? file.name : fileHint;
      fileName.classList.toggle('is-set', Boolean(file));
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const first = String(data.get('firstName') || '').trim();
    const last = String(data.get('lastName') || '').trim();
    const contact = String(data.get('contact') || '').trim();
    const link = String(data.get('link') || '').trim();
    const file = fileInput && fileInput.files && fileInput.files[0];

    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    const invalid = [];
    if (!first) invalid.push('firstName');
    if (!last) invalid.push('lastName');
    if (!contact) invalid.push('contact');
    invalid.forEach((name) => form.elements[name].classList.add('is-invalid'));

    if (invalid.length) {
      showError('Заполни имя, фамилию и как с тобой связаться');
      form.elements[invalid[0]].focus();
      return;
    }
    if (!link && !file) {
      showError('Прикрепи резюме или оставь ссылку');
      form.elements.link.focus();
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      showError('Файл больше 10 МБ — лучше ссылкой');
      return;
    }

    // TODO: отправка на бэкенд. Пока показываем «спасибо».
    showError('');
    form.hidden = true;
    done.hidden = false;
    done.querySelector('button')?.focus({ preventScroll: true });
  });
}
