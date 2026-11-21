const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const DURATION = 1200;

function wrapLine(content) {
  const mask = document.createElement('span');
  mask.className = 'mask';
  const inner = document.createElement('span');
  inner.className = 'mask__in';
  inner.append(content);
  mask.append(inner);
  return mask;
}

function maskTitle(el) {
  const original = el.innerHTML;
  const text = document.createTextNode(el.textContent);
  el.textContent = '';
  const line = wrapLine(text);
  el.append(line);
  return { original, lines: [line.firstChild] };
}

function maskLines(el) {
  const original = el.innerHTML;
  const words = el.textContent.trim().split(/[ \t\n\r]+/).filter(Boolean);
  el.textContent = '';
  const spans = words.map((w, i) => {
    const s = document.createElement('span');
    s.textContent = w;
    s.style.display = 'inline-block';
    el.append(s, i < words.length - 1 ? ' ' : '');
    return s;
  });
  const groups = [];
  let top = null;
  spans.forEach((s, i) => {
    if (top === null || Math.abs(s.offsetTop - top) > 4) {
      groups.push([]);
      top = s.offsetTop;
    }
    groups[groups.length - 1].push(words[i]);
  });
  el.textContent = '';
  const lines = groups.map((g) => {
    const line = wrapLine(document.createTextNode(g.join(' ')));
    line.style.display = 'block';
    el.append(line);
    return line.firstChild;
  });
  return { original, lines };
}

export function initHeroIntro(hero) {
  if (!hero || REDUCED.matches) return;

  const title = hero.querySelector('.hero__title');
  const subtitle = hero.querySelector('.hero__subtitle');
  const hint = hero.querySelector('.hero__hint');
  if (!title || !subtitle) return;

  const parts = [maskTitle(title), maskLines(subtitle)];
  parts.forEach(({ lines }) => lines.forEach((l) => l.classList.add('mask__in--pending')));
  hint?.classList.add('hero__hint--pending');

  let started = false;
  const start = () => {
    if (started) return;
    started = true;

    let delay = 0;
    parts.forEach(({ lines }) => {
      lines.forEach((l) => {
        l.style.transitionDelay = `${delay}ms`;
        delay += 140;
        requestAnimationFrame(() => requestAnimationFrame(() => l.classList.remove('mask__in--pending')));
      });
      delay += 120;
    });
    if (hint) {
      hint.style.setProperty('--intro-delay', `${delay}ms`);
      requestAnimationFrame(() => requestAnimationFrame(() => hint.classList.remove('hero__hint--pending')));
    }

    setTimeout(() => {
      parts[0].lines[0].closest('.hero__title').innerHTML = parts[0].original;
      subtitle.innerHTML = parts[1].original;
      if (hint) hint.style.removeProperty('--intro-delay');
    }, delay + DURATION + 200);
  };

  if (window.__preloaderState === 'done' || window.PRELOADER !== 'stroke') start();
  else {
    window.addEventListener('preloader-done', start, { once: true });
    setTimeout(start, 9000);
  }
}
