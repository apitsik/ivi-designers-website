// Awards: список наград словами с пометками «победа / золото / шорт-лист»
// (Figma «awards», 36:971). Блок чисто информационный — клики никуда
// не ведут. При наведении на награду остальные гаснут, а за курсором
// плавно плывёт полупрозрачная картинка проекта (40 %).
// Заголовок, награды и иконка проявляются из блюра той же волной,
// что и остальные H2 (src/reveal.js).
//
// @gdeprostotamangelovsto

import { observeReveal } from './reveal.js';

// ---------------------------------------------------------------------------
// СПИСОК НАГРАД — единственное место, которое надо править.
// name   — название награды (крупно)
// status — пометка рядом: «победа», «золото», «шорт-лист» и т. п.
// image  — картинка проекта, которая всплывает под курсором
//          (кладём в public/images/awards/, путь от корня сайта)
// Порядок в массиве = порядок на странице. Удалить награду — убрать строку,
// добавить — дописать ещё одну.
// ---------------------------------------------------------------------------
export const AWARDS = [
  { name: 'G8', status: 'победа', image: '/images/awards/awards-image1.png' },
  { name: 'Медиабренд', status: 'золото', image: '/images/awards/awards-image2.png' },
  { name: 'Red dot', status: 'победа', image: '/images/awards/awards-image3.png' },
  { name: 'D-Profile', status: 'победа', image: '/images/awards/awards-image4.png' },
  { name: 'Workspace Digital Award', status: 'золото', image: '/images/awards/awards-image5.png' },
  { name: 'Среда', status: 'золото', image: '/images/awards/awards-image6.png' },
  { name: 'Indigo', status: 'золото', image: '/images/awards/awards-image7.png' },
  { name: 'Медиабренд', status: 'золото', image: '/images/awards/awards-image8.png' },
  { name: 'Red dot', status: 'победа', image: '/images/awards/awards-image9.png' },
  { name: 'Muse', status: 'золото', image: '/images/awards/awards-image10.png' },
  { name: 'G8', status: 'шорт-лист', image: '/images/awards/awards-image11.png' },
];

// Иконка под списком (public/images/awards/awards-icon.svg, 118 × 56)
export const AWARDS_ICON = '/images/awards/awards-icon.svg';

// Насколько картинка отстаёт от курсора (0 — рывком, 1 — не двигается)
const FOLLOW_EASE = 0.12;

export function initAwards(section) {
  if (!section) return;

  const title = section.querySelector('.awards__title');
  const list = section.querySelector('.awards__list');
  const iconWrap = section.querySelector('.awards__icon');
  const preview = section.querySelector('.awards__preview');
  // Два слоя картинки: при переходе с награды на награду новая проявляется
  // поверх старой кроссфейдом, а не рывком
  const layers = preview ? [...preview.querySelectorAll('img')] : [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----- разметка списка из AWARDS -----
  // Индексы проявления идут сквозь заголовок → награды → иконку одной волной
  let index = 0;
  if (title) title.style.setProperty('--word-index', index++);

  const items = AWARDS.map((award) => {
    const item = document.createElement('div');
    item.className = 'award';
    item.style.setProperty('--word-index', index++);
    item.dataset.image = award.image;

    const name = document.createElement('span');
    name.className = 'award__name';
    name.textContent = award.name;

    const status = document.createElement('span');
    status.className = 'award__status';
    status.textContent = award.status;

    item.append(name, ' ', status);
    list.append(item);
    return item;
  });

  if (iconWrap) {
    iconWrap.style.setProperty('--word-index', index++);
    const icon = iconWrap.querySelector('img');
    if (icon && !icon.getAttribute('src')) icon.src = AWARDS_ICON;
  }

  // Подгружаем картинки заранее, чтобы при первом наведении не было пустоты
  AWARDS.forEach((a) => {
    const img = new Image();
    img.src = a.image;
  });

  observeReveal(section);

  // ----- превью за курсором -----
  if (!preview || layers.length < 2) return;

  let front = 0;
  const showImage = (src) => {
    const next = layers[1 - front];
    if (layers[front].getAttribute('src') === src) return;
    const swap = () => {
      next.classList.add('is-front');
      layers[front].classList.remove('is-front');
      front = 1 - front;
    };
    next.src = src;
    if (next.complete) swap();
    else next.onload = swap;
  };

  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;
  let raf = 0;
  let active = false;
  let hideTimer = 0;

  const tick = () => {
    x += (targetX - x) * (reduced ? 1 : FOLLOW_EASE);
    y += (targetY - y) * (reduced ? 1 : FOLLOW_EASE);
    preview.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    if (active || Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  };

  const move = (e) => {
    const r = section.getBoundingClientRect();
    targetX = e.clientX - r.left;
    targetY = e.clientY - r.top;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  items.forEach((item) => {
    item.addEventListener('pointerenter', (e) => {
      const wasHovering = section.classList.contains('is-hovering');
      showImage(item.dataset.image);
      section.classList.add('is-hovering');
      item.classList.add('is-hovered');
      active = true;
      clearTimeout(hideTimer);
      if (!wasHovering) {
        // Первое появление — сразу под курсором, без пролёта из прошлой точки.
        // При переходе с награды на награду картинка плавно доезжает.
        const r = section.getBoundingClientRect();
        x = targetX = e.clientX - r.left;
        y = targetY = e.clientY - r.top;
      }
      move(e);
    });
    item.addEventListener('pointerleave', () => {
      item.classList.remove('is-hovered');
      active = false;
      // Прячем превью с задержкой: если курсор перешёл на соседнюю награду,
      // она успеет отменить и картинка просто сменится кроссфейдом
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!active) section.classList.remove('is-hovering');
      }, 80);
    });
  });

  section.addEventListener('pointermove', (e) => {
    if (active) move(e);
  });
}
