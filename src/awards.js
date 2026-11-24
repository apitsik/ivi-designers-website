import { observeReveal } from './reveal.js';

export const AWARDS = [
  { name: 'G8', status: 'победа', image: 'images/awards/awards-image1.png', url: 'https://confluence.ivi.ru/pages/viewpage.action?pageId=516883985&spaceKey=DES' },
  { name: 'Медиабренд', status: 'золото', image: 'images/awards/awards-image2.png', url: 'https://t.me/mediabrandmoscow/3803' },
  { name: 'Red dot', status: 'победа', image: 'images/awards/awards-image3.png' },
  { name: 'D-Profile', status: 'победа', image: 'images/awards/awards-image4.png', url: 'https://dprofile.ru/case/127742/dizain-kollekcii-merca-dlia-ivi' },
  { name: 'Workspace Digital Award', status: 'золото', image: 'images/awards/awards-image5.png', url: 'https://workspace.ru/awards/cases/ivi-sans-display-novyy-firmennyy-shrift-onlayn-kinoteatra-ivi/' },
  { name: 'Среда', status: 'золото', image: 'images/awards/awards-image6.png', url: 'https://2024.festivalsreda.ru/works/innovacionnye-dizajnerskie-reshenija-v-reklame/5746/index.html' },
  { name: 'Indigo', status: 'золото', image: 'images/awards/awards-image7.png', url: 'https://www.indigoaward.com/winners/8421' },
  { name: 'Медиабренд', status: 'золото', image: 'images/awards/awards-image8.png', url: 'https://t.me/mediabrandmoscow/3554' },
  { name: 'Red dot', status: 'победа', image: 'images/awards/awards-image9.png' },
  { name: 'Muse', status: 'золото', image: 'images/awards/awards-image10.png', url: 'https://museaward.com/winner-info.php?id=229054' },
  { name: 'G8', status: 'шорт-лист', image: 'images/awards/awards-image11.png', url: 'https://g8.art/ru/works/4962' },
];

export const AWARDS_ICON = 'images/awards/awards-icon.svg';

const FOLLOW_EASE = 0.12;

export function initAwards(section) {
  if (!section) return;

  const title = section.querySelector('.awards__title');
  const list = section.querySelector('.awards__list');
  const iconWrap = section.querySelector('.awards__icon');
  const preview = section.querySelector('.awards__preview');
  const layers = preview ? [...preview.querySelectorAll('img')] : [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let index = 0;
  if (title) title.style.setProperty('--word-index', index++);

  const items = AWARDS.map((award) => {
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
    if (award.name.endsWith(' Award')) {
      name.append(award.name.slice(0, -6));
      const extra = document.createElement('span');
      extra.className = 'award__name-extra';
      extra.textContent = ' Award';
      name.append(extra);
    } else {
      name.textContent = award.name;
    }

    const status = document.createElement('span');
    status.className = 'award__status';
    status.textContent = award.status;

    const row = document.createElement('span');
    row.className = 'award__row';
    row.append(name, ' ', status);

    const pic = document.createElement('span');
    pic.className = 'award__pic';
    const picIn = document.createElement('span');
    picIn.className = 'award__pic-in';
    const picImg = document.createElement('img');
    picImg.alt = '';
    picImg.loading = 'lazy';
    picImg.decoding = 'async';
    picImg.src = award.image;
    picIn.append(picImg);
    pic.append(picIn);

    item.append(row, pic);
    list.append(item);
    return item;
  });

  if (iconWrap) {
    iconWrap.style.setProperty('--word-index', index++);
    const icon = iconWrap.querySelector('img');
    if (icon && !icon.getAttribute('src')) icon.src = AWARDS_ICON;
  }

  const warm = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      AWARDS.forEach((a) => {
        const img = new Image();
        img.src = a.image;
      });
      warm.disconnect();
    },
    { rootMargin: '100% 0px' },
  );
  warm.observe(section);

  const early = window.matchMedia('(max-width: 720px), (max-width: 1366px) and (orientation: portrait)').matches;
  observeReveal(section, section, early ? '0px 0px -8% 0px' : undefined);

  const compact = window.matchMedia('(max-width: 720px), (max-width: 1366px) and (orientation: portrait)');
  let focused = -1;
  const setFocus = (k) => {
    if (k === focused) return;
    focused = k;
    section.classList.toggle('is-focusing', k >= 0);
    items.forEach((item, i) => item.classList.toggle('is-focus', i === k));
  };
  const updateFocus = () => {
    if (focused >= 0 && items[focused]) {
      const r = items[focused].getBoundingClientRect();
      const d = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      items[focused].style.setProperty('--pic-shift', `${(-d * 36).toFixed(1)}px`);
    }
    if (!compact.matches) {
      items.forEach((item) => item.style.removeProperty('--f'));
      setFocus(-1);
      return;
    }
    const first = items[0];
    const rowH = first.querySelector('.award__row').offsetHeight;
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    const step = rowH + gap;
    const top = list.getBoundingClientRect().top;
    const mid = window.innerHeight / 2;
    const raw = (mid - top - rowH / 2) / step;
    const sectionRect = section.getBoundingClientRect();
    if (raw < -0.6 || sectionRect.bottom < window.innerHeight * 0.35) {
      items.forEach((item) => item.style.setProperty('--f', '0'));
      setFocus(-1);
      return;
    }
    const pos = clamp(raw, 0, items.length - 1);
    items.forEach((item, i) => {
      const t = Math.max(0, 1 - Math.abs(pos - i));
      item.style.setProperty('--f', (t * t * (3 - 2 * t)).toFixed(3));
    });
    setFocus(clamp(Math.round(raw), 0, items.length - 1));
  };
  window.addEventListener('scroll', updateFocus, { passive: true });
  window.addEventListener('resize', updateFocus);
  updateFocus();

  if (!preview || layers.length < 2) return;

  let front = 0;
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
        const r = section.getBoundingClientRect();
        x = targetX = e.clientX - r.left;
        y = targetY = e.clientY - r.top;
      }
      move(e);
    });
    item.addEventListener('pointerleave', () => {
      item.classList.remove('is-hovered');
      active = false;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!active) section.classList.remove('is-hovering');
      }, 80);
    });
  });

  let lastPointer = null;
  section.addEventListener('pointermove', (e) => {
    lastPointer = { clientX: e.clientX, clientY: e.clientY };
    if (active) move(e);
  });
  window.addEventListener(
    'scroll',
    () => {
      if (active && lastPointer) move(lastPointer);
    },
    { passive: true },
  );
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}
