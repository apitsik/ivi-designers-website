export function splitWords(el, startIndex = 0) {
  const tokens = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.trim().split(/[ \t\n\r]+/).filter(Boolean).forEach((w) => tokens.push(w));
    } else if (node.nodeName === 'BR') {
      tokens.push({ br: node.className });
    } else {
      node.textContent.trim().split(/[ \t\n\r]+/).filter(Boolean).forEach((w) => tokens.push(w));
    }
  });

  el.textContent = '';
  let index = startIndex;
  tokens.forEach((token, i) => {
    if (typeof token === 'object') {
      const br = document.createElement('br');
      if (token.br) br.className = token.br;
      el.append(br);
      return;
    }
    const span = document.createElement('span');
    span.className = 'word';
    span.style.setProperty('--word-index', index++);
    span.textContent = token;
    el.append(span, tokens[i + 1] ? ' ' : '');
  });
  return index;
}

export function observeReveal(trigger, target = trigger, rootMargin = '0px 0px -35% 0px') {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) target.classList.add('is-visible');
        else target.classList.remove('is-visible');
      });
    },
    { rootMargin, threshold: 0 },
  );
  io.observe(trigger);
  return io;
}
