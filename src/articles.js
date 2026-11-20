import { lenis } from './smooth-scroll.js';
import { splitWords } from './reveal.js';

const ARTICLES = [
  {
    kind: 'Статья',
    title: 'Как визуальные UX/UI-решения вызывают нужные ощущения',
    desc: 'Разбираем, как маленькие детали делают интерфейс живым и смотрим на реальные примеры из продукта, где пользователь может даже не замечать их сознательно, но точно чувствует.',
    button: 'Смотреть',
    url: 'https://vkvideo.ru/video-230171290_456239023?back_url=&list=03421556fd49e76ba8&preview=&screen=&source=&webcast=',
  },
  {
    kind: 'Подкаст',
    title: 'Игорь Рыжов и Митя Осадчук на подкасте МамкинДизайнер',
    desc: 'Говорим про онлайн-кинотеатры как цифровой продукт, сериалы собственного производства, нетривиальные задачи и источники вдохновения, построение команд и комфортную атмосферу в коллективе.',
    button: 'Смотреть',
    url: 'https://www.youtube.com/watch?v=RrlyzNXaVHw',
  },
  {
    kind: 'Подкаст',
    title: 'В подкасте Пленума про киноиндустрию и дизайн',
    desc: 'С Егором Мызником и Митей Осадчуком обсуждаем тренд на локальный шопинг, этику космической рекламы, виртуальные путешествия и то, чем станет обязательное российское ПО.',
    button: 'Слушать',
    url: 'https://open.spotify.com/episode/5ohDVdf61paqpTt20vI4Xu',
  },
  {
    kind: 'Статья',
    title: 'Статья об исследовании шрифта',
    desc: 'Исследование Жени Савельевой. Рассказываем про оценку гарнитур по методу Чарльза Осгуда: как с помощью математики понять, передает ли шрифт нужный характер бренда и настроение.',
    button: 'Читать',
    url: 'https://habr.com/ru/companies/ivi/articles/780000/',
  },
  {
    kind: 'Статья',
    title: 'Как устроены UX-исследования в Иви',
    desc: 'Рассказываем о наших процессах, их влиянии на эффективность работы, а также о лайфхаках: как команда исследователей из двух человек может успевать делать все необходимое.',
    button: 'Читать',
    url: 'https://habr.com/ru/companies/ivi/articles/697850/',
  },
  {
    kind: 'Выступление',
    title: 'Креативные процессы в командах',
    desc: 'Митя Осадчук на сцене Design Prosmotr делится опытом борьбы с рутиной: почему отсутствие творчества губит сотрудников, в чём причина нежелания брать задачи и как мотивировать команду.',
    button: 'Смотреть',
    url: 'https://www.youtube.com/watch?v=13AE8T5rwz0',
  },
  {
    kind: 'Подкаст',
    title: 'Создание дизайна для ориджиналс-контента',
    desc: 'Леонид Буравлев и Дмитрий Лаврухин делятся опытом создания концепций для контента Иви. Разбираем тонкости передачи антуража через афиши, работу нейросетей и устройство дизайн-системы стриминга.',
    button: 'Слушать',
    url: 'https://dpcast.mave.digital/ep-141',
  },
  {
    kind: 'Статья',
    title: 'Статья на Sostav про 13 клиническую',
    desc: 'Разбираем, с какими вызовами столкнулась команда дизайна Иви при продвижении сериалов собственного производства и как создавался визуал для громкой премьеры «13-я Клиническая».',
    button: 'Читать',
    url: 'https://www.sostav.ru/publication/s-kakimi-trudnostyami-stalkivaetsya-komanda-dizajna-pri-prodvizhenii-serialov-62874.html',
  },
  {
    kind: 'Статья',
    title: 'Статья: Нейросети против дизайнеров',
    desc: 'Дизайн-лиды из Сбера, Яндекса, Иви, Skyeng, Ozon, Туту, Flowwow и Wildberries рассказывают, как меняется работа внутри компаний и отделов из-за искусственного интеллекта.',
    button: 'Читать',
    url: 'https://vk.ru/@prosmotr-chto-proishodit-na-rynke-dizaina-posle-massovogo-poyavleniya',
  },
  {
    kind: 'Подкаст',
    title: 'Нюансы продукта в дизайн-команде Иви',
    desc: 'Рассказываем про рынок онлайн-кинотеатров, ограничения платформ и девайсов, а также о том, где дизайнеру искать информацию о том, как проектировать дизайн для телевизоров.',
    button: 'Слушать',
    url: 'https://dpcast.mave.digital/ep-139',
  },
  {
    kind: 'Выступление',
    title: 'Как устроена дизайн-система в Иви',
    desc: 'Олег Топталов из Иви раскрывает устройство и эволюцию кроссплатформенной дизайн-системы онлайн-кинотеатра и рассказывает, как мгновенно доставлять изменения на все платформы.',
    button: 'Смотреть',
    url: 'https://www.youtube.com/watch?v=vuOjiTxWvXY',
  },
];

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

const STEP_X = 0.52;
const ROT_Y = 50;
const DEPTH = 0.9;
const SCALE_STEP = 0.025;
const DRAG_PX = 140;
const SMOOTHING = 0.14;
const EDGE_FADE = 1.2;

export function initArticles(section, modal) {
  if (!section) return;

  const deck = section.querySelector('.articles__deck');
  const name = section.querySelector('.articles__name');
  const prevBtn = section.querySelector('[data-prev]');
  const nextBtn = section.querySelector('[data-next]');
  const N = ARTICLES.length;

  const cards = ARTICLES.map((a, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'article-card';
    btn.dataset.index = String(i);
    btn.setAttribute('aria-label', a.title);
    const img = document.createElement('img');
    img.className = 'article-card__img';
    img.src = `images/articles/article-${i + 1}-cover.jpg`;
    img.alt = '';
    img.loading = 'lazy';
    img.draggable = false;
    btn.append(img);
    deck.append(btn);
    return btn;
  });

  let pos = 0;
  let target = 0;
  let active = 0;
  let raf = 0;
  let lastTime = 0;

  const offsetOf = (i, p) => {
    let d = (((i - p) % N) + N) % N;
    if (d > N / 2) d -= N;
    return d;
  };

  const INTRO_DELAY = 350;
  const INTRO_STEP = 85;
  const INTRO_MS = 900;
  const easeOutBack = (t) => {
    const c1 = 1.5;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  let introAt = REDUCED.matches ? -Infinity : null;
  let introRaf = 0;

  const introOf = (ad) => {
    if (introAt === null) return 0;
    const t = (performance.now() - introAt - INTRO_DELAY - Math.min(ad, 6) * INTRO_STEP) / INTRO_MS;
    return Math.min(1, Math.max(0, t));
  };

  const render = () => {
    const size = cards[0].offsetWidth || 200;
    const flat = REDUCED.matches;
    cards.forEach((card, i) => {
      const d = offsetOf(i, pos);
      const ad = Math.abs(d);
      const s = Math.sign(d);
      const ip = introOf(ad);
      const ie = easeOutBack(ip);
      const rot = flat ? 0 : -s * Math.max(30, ROT_Y - Math.max(0, ad - 1) * 4) * Math.min(1, ad * 1.6);
      const x = d * STEP_X * size * ie;
      const z = flat ? 0 : -Math.min(ad, 1) * DEPTH * size * 0.35 - ad * size * 0.06;
      const sc = Math.max(0.8, 1 - ad * SCALE_STEP) * (0.55 + 0.45 * Math.min(1, ie));
      const lift = (1 - ie) * size * 0.35;
      const tilt = (1 - ie) * (s || 1) * 14;
      card.style.transform = `translate3d(${x.toFixed(1)}px, ${lift.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) rotateZ(${tilt.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      const fade = Math.min(1, Math.max(0, (N / 2 - ad) / EDGE_FADE)) * Math.min(1, ip * 3);
      card.style.opacity = fade.toFixed(3);
      card.style.visibility = fade > 0 ? '' : 'hidden';
      card.style.zIndex = String(100 - Math.round(ad * 10));
      card.style.setProperty('--dim', Math.min(0.2, Math.max(0, ad - 1) * 0.05).toFixed(3));
      card.classList.toggle('is-active', Math.round(pos) === i && ad < 0.5);
    });
  };

  const setActive = (i) => {
    const idx = ((i % N) + N) % N;
    if (idx === active) return;
    active = idx;
    name.classList.add('is-switching');
    setTimeout(() => {
      name.textContent = ARTICLES[active].title;
      name.classList.remove('is-switching');
    }, 220);
  };

  const tick = (now) => {
    raf = 0;
    const dt = lastTime ? Math.min((now - lastTime) / 16.67, 3) : 1;
    lastTime = now;
    const k = 1 - Math.pow(1 - SMOOTHING, dt);
    const diff = target - pos;
    if (Math.abs(diff) < 0.001) {
      pos = target;
      render();
      lastTime = 0;
      return;
    }
    pos += diff * k;
    render();
    raf = requestAnimationFrame(tick);
  };

  const animate = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const goTo = (step) => {
    target = Math.round(target) + step;
    setActive(Math.round(target));
    animate();
  };

  prevBtn?.addEventListener('click', () => goTo(-1));
  nextBtn?.addEventListener('click', () => goTo(1));

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startPos = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let pressed = null;

  const activate = (card) => {
    const i = Number(card.dataset.index);
    const d = Math.round(offsetOf(i, target));
    if (d === 0) openModal(i);
    else goTo(d);
  };

  deck.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pressed = e.target.closest('.article-card');
    dragging = true;
    moved = false;
    startX = lastX = e.clientX;
    startPos = target;
    lastT = performance.now();
    velocity = 0;
    deck.setPointerCapture(e.pointerId);
  });

  deck.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 6) {
      moved = true;
      deck.classList.add('is-dragging');
    }
    if (!moved) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    velocity = (e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastT = now;
    pos = target = startPos - dx / DRAG_PX;
    render();
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    deck.classList.remove('is-dragging');
    if (!moved) {
      if (pressed) activate(pressed);
      pressed = null;
      return;
    }
    pressed = null;
    const fling = Math.abs(velocity) > 0.5 ? -Math.sign(velocity) : 0;
    target = Math.round(target + fling * 0.5);
    setActive(target);
    animate();
    e.preventDefault?.();
  };

  deck.addEventListener('pointerup', endDrag);
  deck.addEventListener('pointercancel', endDrag);

  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.detail === 0) activate(card);
    });
  });

  section.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(1); }
  });

  window.addEventListener('resize', render);
  name.textContent = ARTICLES[0].title;
  render();

  const introLoop = () => {
    introRaf = 0;
    render();
    const done = introAt !== null && performance.now() - introAt > INTRO_DELAY + 6 * INTRO_STEP + INTRO_MS;
    if (!done) introRaf = requestAnimationFrame(introLoop);
    else deck.classList.remove('is-intro');
  };

  const titleEl = section.querySelector('[data-words]');
  if (titleEl) splitWords(titleEl);

  if (introAt === null) deck.classList.add('is-intro');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          section.classList.add('is-visible');
          if (introAt === null) {
            introAt = performance.now();
            if (!introRaf) introRaf = requestAnimationFrame(introLoop);
          }
        } else {
          section.classList.remove('is-visible');
          if (!REDUCED.matches) {
            introAt = null;
            deck.classList.add('is-intro');
            render();
          }
        }
      });
    },
    { rootMargin: '0px 0px -30% 0px', threshold: 0 },
  );
  io.observe(section);

  const openModal = (() => {
    if (!modal) return () => {};
    const viewport = modal.querySelector('.article-modal__viewport');
    const track = modal.querySelector('.article-modal__track');
    const closeBtn = modal.querySelector('.video-modal__close');
    const arrows = [...modal.querySelectorAll('.article-modal__arrow')];
    let opener = null;
    let hideTimer = 0;
    const COPIES = 3;
    const N = ARTICLES.length;
    let index = N;

    const slides = [];
    for (let c = 0; c < COPIES; c += 1) {
      ARTICLES.forEach((a, i) => {
        const slide = document.createElement('div');
        slide.className = 'article-modal__slide';
        slide.setAttribute('aria-hidden', 'true');

        const card = document.createElement('article');
        card.className = 'article-modal__card';

        const img = document.createElement('img');
        img.className = 'article-modal__img';
        img.alt = '';
        img.decoding = 'async';
        const src = `images/articles/article-${i + 1}-image.jpg`;
        img.src = src;

        const body = document.createElement('div');
        body.className = 'article-modal__body';

        const text = document.createElement('div');
        text.className = 'article-modal__text';

        const kind = document.createElement('p');
        kind.className = 'article-modal__kind';
        kind.textContent = a.kind || '';

        const title = document.createElement('h3');
        title.className = 'article-modal__title';
        title.textContent = a.title;
        if (c === 1 && i === 0) title.id = 'article-modal-title';

        const desc = document.createElement('p');
        desc.className = 'article-modal__desc';
        desc.textContent = a.desc;

        const link = document.createElement('a');
        link.className = 'article-modal__link';
        link.href = a.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = a.button;
        link.tabIndex = -1;

        text.append(kind, title, desc);
        body.append(text, link);
        card.append(img, body);
        slide.append(card);
        track.append(slide);
        slides.push(slide);
      });
    }

    const shiftFor = (i) => {
      const slide = slides[i];
      if (!slide) return 0;
      return slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2;
    };

    const paint = () => {
      slides.forEach((slide, k) => {
        const active = k === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        const link = slide.querySelector('.article-modal__link');
        if (link) link.tabIndex = active ? 0 : -1;
      });
    };

    const go = (i, animate = true) => {
      index = i;
      track.classList.toggle('is-still', !animate);
      track.style.setProperty('--shift', `${-shiftFor(index)}px`);
      paint();
      if (!animate) {
        void track.offsetWidth;
        track.classList.remove('is-still');
      }
    };

    const recenter = () => {
      if (index >= N && index < N * 2) return;
      go(((index % N) + N) % N + N, false);
    };

    track.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'transform') recenter();
    });

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

    arrows.forEach((a) => a.addEventListener('click', () => go(index + Number(a.dataset.dir))));
    modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
    const dialog = modal.querySelector('.video-modal__dialog');
    dialog.addEventListener('click', (e) => {
      if (Math.abs(moved) > 6) return;
      if (e.target === dialog || e.target === viewport) close();
    });
    slides.forEach((slide, k) => {
      slide.addEventListener('click', () => {
        if (Math.abs(moved) > 6) return;
        if (k !== index) go(k);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    });

    let dragging = false;
    let startX = 0;
    let startShift = 0;
    let moved = 0;
    let vel = 0;
    let lastX = 0;

    let captured = false;

    viewport.addEventListener('pointerdown', (e) => {
      dragging = true;
      captured = false;
      moved = 0;
      vel = 0;
      startX = e.clientX;
      lastX = e.clientX;
      startShift = shiftFor(index);
      track.classList.add('is-still');
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (!captured && Math.abs(e.clientX - startX) > 4) {
        viewport.setPointerCapture(e.pointerId);
        captured = true;
      }
      moved = e.clientX - startX;
      vel = vel * 0.6 + (e.clientX - lastX) * 0.4;
      lastX = e.clientX;
      track.style.setProperty('--shift', `${-(startShift - moved)}px`);
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-still');
      if (captured) viewport.releasePointerCapture?.(e.pointerId);
      captured = false;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = slides[0] ? slides[0].offsetWidth + gap : 1;
      const flick = Math.abs(vel) > 4 ? Math.sign(vel) : 0;
      const dragged = moved / step;
      let by = Math.trunc(dragged);
      if (!by && Math.abs(dragged) > 0.2) by = Math.sign(dragged);
      if (!by && flick) by = flick;
      go(index - by);
    };

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('dragstart', (e) => e.preventDefault());

    let wheelLock = 0;
    viewport.addEventListener('wheel', (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      e.preventDefault();
      const now = performance.now();
      if (now - wheelLock < 420) return;
      wheelLock = now;
      go(index + Math.sign(d));
    }, { passive: false });

    window.addEventListener('resize', () => {
      if (!modal.hidden) go(index, false);
    });

    const preload = () => {
      slides.forEach((slide) => {
        const im = slide.querySelector('.article-modal__img');
        if (im) im.decode?.().catch(() => {});
      });
    };
    if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 4000 });
    else setTimeout(preload, 2500);

    return (i) => {
      opener = cards[i];
      clearTimeout(hideTimer);

      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('video-modal-open');
      lenis?.stop();
      go(N + i, false);
      const activeImg = slides[N + i]?.querySelector('.article-modal__img');
      const ready = activeImg && !activeImg.complete
        ? Promise.race([activeImg.decode().catch(() => {}), new Promise((r) => setTimeout(r, 500))])
        : Promise.resolve();
      ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('video-modal--open'))));
      closeBtn.focus({ preventScroll: true });
    };
  })();
}
