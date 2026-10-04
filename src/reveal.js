// Общее проявление текста «из блюра»: разбивка на слова и запуск по входу
// в зону видимости. Используется заголовком шоурилов и блоком Extra Text,
// чтобы эффект был строго одинаковым.

// Разбивает текст на слова-span с индексом для задержки анимации.
// startIndex сдвигает нумерацию, если перед текстом уже есть элементы
// с тем же эффектом (например, иконка) — волна идёт сквозь них подряд.
// Возвращает индекс, следующий за последним словом.
export function splitWords(el, startIndex = 0) {
  // Собираем слова и принудительные переносы (<br>) в порядке следования
  const tokens = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.trim().split(/\s+/).filter(Boolean).forEach((w) => tokens.push(w));
    } else if (node.nodeName === 'BR') {
      tokens.push(null);
    } else {
      node.textContent.trim().split(/\s+/).filter(Boolean).forEach((w) => tokens.push(w));
    }
  });

  el.textContent = '';
  let index = startIndex;
  tokens.forEach((token, i) => {
    if (token === null) {
      el.append(document.createElement('br'));
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

// Вешает .is-visible на target каждый раз, когда trigger попадает в зону
// видимости, и снимает, когда уходит — так анимация запускается заново
// и при скролле сверху, и снизу. rootMargin снизу −35 %: старт, когда
// элемент вошёл в верхние две трети экрана, а не у самого нижнего края.
export function observeReveal(trigger, target = trigger) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) target.classList.add('is-visible');
        else target.classList.remove('is-visible');
      });
    },
    { rootMargin: '0px 0px -35% 0px', threshold: 0 },
  );
  io.observe(trigger);
  return io;
}
