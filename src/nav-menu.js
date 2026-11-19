// Меню на телефоне. Кнопка-«бургер» в шапке открывает полноэкранный попап
// со ссылками на разделы. Открытие и закрытие — как у остальных попапов:
// оверлей с блюром, диалог всплывает, пока открыт — страница не скроллится
// (Lenis ставим на паузу). Закрывается крестиком, тапом по фону, Escape
// и тапом по пункту (страница при этом едет к разделу).
// @gdeprostotamangelovsto

import { lenis } from './smooth-scroll.js';

const MOBILE = window.matchMedia('(max-width: 900px)');

export function initNavMenu(burger, menu) {
  if (!burger || !menu) return;

  let isOpen = false;

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    menu.hidden = false;
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    lenis?.stop();
    // Два кадра: сначала браузер рисует скрытое состояние, потом запускаем
    // переход — иначе оверлей выскочил бы сразу на полной силе
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        menu.classList.add('menu-modal--open');
        menu.querySelector('.menu-modal__close')?.focus({ preventScroll: true });
      }),
    );
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    menu.classList.remove('menu-modal--open');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    lenis?.start();
    burger.focus({ preventScroll: true });
    // hidden возвращаем после ухода оверлея (visibility в CSS ждёт 0.4 s)
    window.setTimeout(() => {
      if (!isOpen) menu.hidden = true;
    }, 450);
  };

  burger.addEventListener('click', () => (isOpen ? close() : open()));

  menu.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });

  // Тап по пункту: закрываем в фазе перехвата, до обработчика якорей из
  // smooth-scroll.js — к этому моменту Lenis уже снова запущен и доедет
  // до раздела
  menu.addEventListener(
    'click',
    (e) => {
      if (e.target.closest('.menu-modal__link')) close();
    },
    true,
  );

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Повернули телефон / растянули окно — меню больше не нужно
  MOBILE.addEventListener('change', (e) => {
    if (!e.matches) close();
  });
}
