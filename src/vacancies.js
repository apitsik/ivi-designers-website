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

const TRAIL_STEP = 64; // px движения курсора между карточками
const MAX_SHOTS = 7; // одновременно видимых карточек
const ROTATE_MAX = 10; // ± градусов
const SHOW_MS = 380;
const HOLD_MS = 420;
const HIDE_MS = 640;

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

  const shots = []; // видимые карточки по порядку появления
  let lastX = null;
  let lastY = null;

  const spawn = (x, y) => {
    const shot = document.createElement('div');
    shot.className = 'vacancies__shot';
    const rot = (Math.random() * 2 - 1) * ROTATE_MAX;
    shot.style.setProperty('--rot', `${rot.toFixed(2)}deg`);
    shot.style.left = `${x}px`;
    shot.style.top = `${y}px`;

    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = nextSrc();
    shot.append(img);
    layer.append(shot);

    const entry = { el: shot, rot, hiding: false, timer: 0 };
    shots.push(entry);

    shot.animate(
      [
        { opacity: 0, transform: `rotate(${rot}deg) scale(0.8)` },
        { opacity: 1, transform: `rotate(${rot}deg) scale(1)` },
      ],
      { duration: SHOW_MS, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' },
    );

    entry.timer = setTimeout(() => hide(entry), SHOW_MS + HOLD_MS);

    // Лишние — самые старые — начинают растворяться сразу
    const visible = shots.filter((s) => !s.hiding);
    for (let i = 0; i < visible.length - MAX_SHOTS; i++) hide(visible[i]);
  };

  const hide = (entry) => {
    if (entry.hiding) return;
    entry.hiding = true;
    clearTimeout(entry.timer);
    const anim = entry.el.animate(
      [
        { opacity: 1, transform: `rotate(${entry.rot}deg) scale(1)` },
        { opacity: 0, transform: `rotate(${entry.rot}deg) scale(0.9)` },
      ],
      { duration: HIDE_MS, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'forwards' },
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
    if (lastX === null) {
      lastX = x;
      lastY = y;
      return;
    }
    const dx = x - lastX;
    const dy = y - lastY;
    if (dx * dx + dy * dy < TRAIL_STEP * TRAIL_STEP) return;
    lastX = x;
    lastY = y;
    spawn(x, y);
  });

  // Ушли из секции — следующий заход начнёт отсчёт заново, без «прыжка»
  const reset = () => {
    lastX = null;
    lastY = null;
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
