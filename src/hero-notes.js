/**
 * Уведомления в хиро (Figma 334:6192, hero step 1; тексты — 18:105).
 *
 * Стопка плашек в левом нижнем углу, как уведомления в macOS: верхняя
 * видна целиком, под ней выглядывают края следующих. Клик по плашке
 * открывает то, о чём она говорит. При наведении на верхнюю в левом
 * верхнем углу появляется крестик. Плашку можно смахнуть в сторону
 * мышью или пальцем — уехала, следующая встала на её место.
 *
 * Содержимое ведём ТОЛЬКО руками и ниоткуда не подтягиваем: новая
 * статья или награда сама плашкой не станет. Когда решаем, что событие
 * должно стать виджетом, — дописываем объект в начало массива NOTES.
 * Первое в массиве лежит сверху стопки.
 *
 *   title    — крупная строка
 *   text     — строка помельче под ней
 *   url      — куда ведёт клик (новая вкладка)
 *   showreel — вместо ссылки: селектор карточки шоурила на этой же
 *              странице, клик открывает её видео в модалке
 *   icon     — картинка слева, путь без ведущего слэша
 *              (файлы лежат в public/images/widgets/)
 */

const NOTES = [
  {
    title: 'Новая ленточка на бехансе',
    text: 'За кейс «Motion Identity»',
    url: 'https://www.behance.net/gallery/257734309/Motion-Identity-streaming-ivi',
    icon: 'images/widgets/widget-image1.jpg',
  },
  {
    title: '2 победы на Red Dot 2026',
    text: 'За шрифт и шоурил',
    url: 'https://www.red-dot.org/project/good-no-matter-how-you-look-at-it-showreel-of-the-new-font-92869',
    icon: 'images/widgets/widget-image2.jpg',
  },
  {
    title: 'Вакансия бренд-дизайнера',
    text: 'Виу-виу. Мы ищем тебя, отзовись',
    url: 'https://corp.ivi.ru/vacancy/starshij-kommunikaczionnyj-dizajner/',
    icon: 'images/widgets/widget-image3.jpg',
  },
  {
    title: 'Рассказали про визуал',
    text: 'Как визуальные UX/UI-решения вызывают нужные ощущения',
    url: 'https://vkvideo.ru/video-230171290_456239023?back_url=&list=03421556fd49e76ba8&preview=&screen=&source=&webcast=',
    icon: 'images/widgets/widget-image4.jpg',
  },
  {
    title: 'Написали про исследование нашего шрифта',
    text: 'Новая статья на Хабре',
    url: 'https://habr.com/ru/companies/ivi/articles/780000/',
    icon: 'images/widgets/widget-image5.jpg',
  },
  {
    title: 'Запилили шоурил',
    text: 'Сделали всё сами, инхаус',
    showreel: '.showreel--2',
    icon: 'images/widgets/widget-image6.jpg',
  },
];

// Подъём и уменьшение каждой следующей плашки заданы в hero-notes.css
const DEPTH = 3; // больше трёх всё равно не видно
const THROW = 90; // с какого сдвига считаем, что смахнули

export function initHeroNotes(hero) {
  if (!hero || !NOTES.length) return;

  const root = document.createElement('div');
  root.className = 'hero-notes';
  root.setAttribute('aria-label', 'Новости команды');

  // Живой список: смахнули — вынули отсюда, стопка пересобралась
  const live = NOTES.map((note) => build(note, () => drop(note)));
  live.forEach(({ el }) => root.append(el));
  hero.append(root);

  let order = [...live];

  function drop(note) {
    const i = order.findIndex((o) => o.note === note);
    if (i < 0) return;
    order[i].el.classList.add('is-gone');
    order.splice(i, 1);
    // Плашка доезжает за кадр анимации, потом убираем её совсем
    setTimeout(() => {
      const dead = live.find((o) => o.note === note);
      dead?.el.remove();
    }, 420);
    paint();
  }

  function paint() {
    order.forEach(({ el }, i) => {
      el.style.setProperty('--depth', i);
      el.style.zIndex = String(order.length - i);
      el.classList.toggle('is-top', i === 0);
      el.classList.toggle('is-second', i === 1);
      el.classList.toggle('is-deep', i >= DEPTH);
      // Кликается и фокусируется только верхняя
      el.tabIndex = i === 0 ? 0 : -1;
      el.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
      const close = el.querySelector('.hero-note__close');
      if (close) close.tabIndex = i === 0 ? 0 : -1;
    });
    root.classList.toggle('is-empty', !order.length);
  }

  // ----- смахивание -----
  // Тянем только верхнюю и только вбок: вертикаль оставляем странице,
  // иначе на телефоне нельзя будет пролистать хиро пальцем.
  let drag = null;

  root.addEventListener('pointerdown', (e) => {
    const top = order[0];
    if (!top || !top.el.contains(e.target)) return;
    if (e.target.closest('.hero-note__close')) return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, locked: null, el: top.el, note: top.note };
    top.el.setPointerCapture?.(e.pointerId);
  });

  root.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (drag.locked === null) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      drag.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (drag.locked === 'x') {
        drag.el.classList.add('is-dragging');
        // Пока верхнюю тянут, под ней должна быть видна настоящая вторая
        root.classList.add('is-swiping');
      }
    }
    if (drag.locked !== 'x') return;
    drag.dx = dx;
    drag.el.style.setProperty('--slide', `${dx}px`);
    drag.el.style.setProperty('--fade', String(Math.max(0, 1 - Math.abs(dx) / 260)));
  });

  const endDrag = () => {
    if (!drag) return;
    const { el, note, dx } = drag;
    drag = null;
    root.classList.remove('is-swiping');
    el.classList.remove('is-dragging');
    el.style.removeProperty('--slide');
    el.style.removeProperty('--fade');
    if (Math.abs(dx) > THROW) {
      el.style.setProperty('--throw', dx > 0 ? '1' : '-1');
      drop(note);
    }
  };

  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);

  // Клик после смахивания — не переход по ссылке
  root.addEventListener('click', (e) => {
    const card = e.target.closest('.hero-note');
    if (card && card.dataset.moved === '1') {
      e.preventDefault();
      card.dataset.moved = '0';
    }
  }, true);

  paint();
}

function build(note, remove) {
  const el = document.createElement('a');
  el.className = 'hero-note';
  if (note.url) {
    el.href = note.url;
    el.target = '_blank';
    el.rel = 'noopener';
  } else {
    // Без внешней ссылки: плашка открывает шоурил на этой же странице
    el.href = '#';
    el.setAttribute('role', 'button');
    el.addEventListener('click', (e) => {
      // Смахивали, а не кликали — перехватчик в root уже погасил клик
      if (e.defaultPrevented) return;
      e.preventDefault();
      document.querySelector(note.showreel)?.click();
    });
  }
  // Иначе браузер начинает тащить саму ссылку и обрывает наш жест
  el.draggable = false;
  el.addEventListener('dragstart', (e) => e.preventDefault());

  const icon = document.createElement('span');
  icon.className = 'hero-note__icon';
  if (note.icon) {
    const img = document.createElement('img');
    img.src = note.icon;
    img.alt = '';
    img.decoding = 'async';
    img.width = 64;
    img.height = 64;
    icon.append(img);
  }

  const text = document.createElement('span');
  text.className = 'hero-note__text';

  const title = document.createElement('span');
  title.className = 'hero-note__title';
  title.textContent = note.title;

  const desc = document.createElement('span');
  desc.className = 'hero-note__desc';
  desc.textContent = note.text;

  const close = document.createElement('button');
  close.className = 'hero-note__close';
  close.type = 'button';
  close.setAttribute('aria-label', `Убрать уведомление «${note.title}»`);
  close.innerHTML =
    '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2 8 8M8 2 2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  close.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    remove();
  });

  text.append(title, desc);
  el.append(icon, text, close);

  // Если плашку тащили — клик по ней не должен открывать ссылку
  let moved = 0;
  el.addEventListener('pointerdown', (e) => {
    moved = e.clientX;
    el.dataset.moved = '0';
  });
  el.addEventListener('pointerup', (e) => {
    if (Math.abs(e.clientX - moved) > 6) el.dataset.moved = '1';
  });

  return { el, note };
}
