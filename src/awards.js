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
// url    — ссылка на кейс или новость; без неё награда просто не кликается
// status — пометка рядом: «победа», «золото», «шорт-лист» и т. п.
// image  — картинка проекта, которая всплывает под курсором
//          (кладём в public/images/awards/, путь от корня сайта)
// Порядок в массиве = порядок на странице. Удалить награду — убрать строку,
// добавить — дописать ещё одну.
// ---------------------------------------------------------------------------
export const AWARDS = [
  { name: 'G8', status: 'победа', image: '/images/awards/awards-image1.png', url: 'https://confluence.ivi.ru/pages/viewpage.action?pageId=516883985&spaceKey=DES' },
  { name: 'Медиабренд', status: 'золото', image: '/images/awards/awards-image2.png', url: 'https://t.me/mediabrandmoscow/3803' },
  { name: 'Red dot', status: 'победа', image: '/images/awards/awards-image3.png' },
  { name: 'D-Profile', status: 'победа', image: '/images/awards/awards-image4.png', url: 'https://dprofile.ru/case/127742/dizain-kollekcii-merca-dlia-ivi' },
  { name: 'Workspace Digital Award', status: 'золото', image: '/images/awards/awards-image5.png', url: 'https://workspace.ru/awards/cases/ivi-sans-display-novyy-firmennyy-shrift-onlayn-kinoteatra-ivi/' },
  { name: 'Среда', status: 'золото', image: '/images/awards/awards-image6.png', url: 'https://2024.festivalsreda.ru/works/innovacionnye-dizajnerskie-reshenija-v-reklame/5746/index.html' },
  { name: 'Indigo', status: 'золото', image: '/images/awards/awards-image7.png', url: 'https://www.indigoaward.com/winners/8421' },
  { name: 'Медиабренд', status: 'золото', image: '/images/awards/awards-image8.png', url: 'https://t.me/mediabrandmoscow/3554' },
  { name: 'Red dot', status: 'победа', image: '/images/awards/awards-image9.png' },
  { name: 'Muse', status: 'золото', image: '/images/awards/awards-image10.png', url: 'https://museaward.com/winner-info.php?id=229054' },
  { name: 'G8', status: 'шорт-лист', image: '/images/awards/awards-image11.png', url: 'https://g8.art/ru/works/4962' },
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
    // Награда со ссылкой — <a>, без ссылки — обычный <div>
    const item = document.createElement(award.url ? 'a' : 'div');
    item.className = 'award';
    if (award.url) {
      item.href = award.url;
      item.target = '_blank';
      item.rel = 'noopener noreferrer';
      item.classList.add('award--link');
    }
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
  // Картинки подгружены заранее, поэтому слой переключаем сразу, не дожидаясь
  // onload: так нет гонки, когда курсор перескочил раньше, чем догрузился
  // предыдущий кадр, и превью оставалось пустым
  const showImage = (src) => {
    if (layers[front].getAttribute('src') === src) return;
    const back = layers[1 - front];
    if (back.getAttribute('src') !== src) back.src = src;
    back.classList.add('is-front');
    layers[front].classList.remove('is-front');
    front = 1 - front;
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
