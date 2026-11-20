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
    window.setTimeout(() => {
      if (!isOpen) menu.hidden = true;
    }, 450);
  };

  burger.addEventListener('click', () => (isOpen ? close() : open()));

  menu.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });

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

  MOBILE.addEventListener('change', (e) => {
    if (!e.matches) close();
  });
}
