// Мазок под ссылками шапки и футера по ховеру (Figma 418:3892, вектор hover).
// Контур взят из макета как есть; формы три — см. .scribble--1/2/3 в styles.css.
const NS = 'http://www.w3.org/2000/svg';
const D =
  'M 0 10.49 C 0.02 10.49 0.21 10.42 2.25 9.44 C 4.12 8.55 7.66 6.8 9.83 5.81 C 12 4.81 12.67 4.61 13.08 4.56 C 13.48 4.51 13.58 4.62 12.89 6.35 C 12.19 8.08 10.69 11.44 9.99 13.09 C 9.29 14.73 9.44 14.56 9.6 14.4 C 9.76 14.23 9.94 14.08 12.72 12.22 C 15.5 10.36 20.89 6.79 23.73 4.89 C 26.73 2.89 27.02 2.65 27.26 2.58 C 27.34 2.56 27.34 2.77 26.46 4.9 C 25.57 7.02 23.8 11.11 22.86 13.28 C 21.85 15.6 21.74 15.9 21.76 16.1 C 21.77 16.16 21.98 16.01 25.76 13.26 C 29.54 10.51 36.94 5.14 40.73 2.45 C 44.51 -0.25 44.45 -0.1 44.34 0.09 C 44.23 0.27 44.07 0.49 42.78 3.58 C 41.5 6.68 39.1 12.64 37.94 15.67 C 36.77 18.7 36.92 18.61 37.11 18.46 C 37.29 18.31 37.51 18.09 40.88 15.51 C 44.26 12.92 50.8 7.98 54.15 5.58 C 57.5 3.18 57.46 3.48 56.79 5.65 C 56.12 7.82 54.82 11.87 54.14 14.03 C 53.46 16.19 53.44 16.34 56.7 14.63 C 59.97 12.92 66.53 9.34 69.99 7.45 C 73.45 5.55 73.61 5.46 73.1 6.43 C 72.6 7.4 71.42 9.44 70.31 11.14 C 69.19 12.84 68.16 14.15 67.73 14.79 C 67.3 15.43 67.5 15.37 69.94 13.81 C 72.38 12.25 77.05 9.19 81.89 5.89';

export function initLinkScribble() {
  const links = document.querySelectorAll('.nav__item, .footer__link');
  links.forEach((a, i) => {
    if (a.querySelector('.scribble')) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', `scribble scribble--${(i % 3) + 1}`);
    svg.setAttribute('viewBox', '0 0 81.89 18.52');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', D);
    svg.appendChild(path);
    a.prepend(svg);
  });
}
