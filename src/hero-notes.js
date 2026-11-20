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
    icon: 'images/widgets/widget-reddot.jpg',
    award: true,
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

const DEPTH = 3;
const THROW = 90;

export function initHeroNotes(hero) {
  if (!hero || !NOTES.length) return;

  const root = document.createElement('div');
  root.className = 'hero-notes';
  root.setAttribute('aria-label', 'Новости команды');

  const mobile = window.matchMedia('(max-width: 720px)').matches;
  const list = mobile ? [...NOTES].sort((a, b) => Number(!!b.award) - Number(!!a.award)) : NOTES;
  const live = list.map((note) => build(note, () => drop(note)));
  live.forEach(({ el }) => root.append(el));
  hero.append(root);

  let order = [...live];

  function drop(note) {
    const i = order.findIndex((o) => o.note === note);
    if (i < 0) return;
    order[i].el.classList.add('is-gone');
    order.splice(i, 1);
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
      el.tabIndex = i === 0 ? 0 : -1;
      el.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
      const close = el.querySelector('.hero-note__close');
      if (close) close.tabIndex = i === 0 ? 0 : -1;
    });
    root.classList.toggle('is-empty', !order.length);
  }

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
    el.href = '#';
    el.setAttribute('role', 'button');
    el.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      document.querySelector(note.showreel)?.click();
    });
  }
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
