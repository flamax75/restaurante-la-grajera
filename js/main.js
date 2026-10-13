(() => {
  'use strict';
  const year = document.getElementById('current-year');
  if (year) year.textContent = new Date().getFullYear();
  const intro = document.getElementById('intro');
  const video = document.getElementById('intro-video');
  const skip = document.getElementById('skip-intro');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closed = false;
  const closeIntro = () => {
    if (closed || !intro) return;
    closed = true;
    if (video) video.pause();
    intro.classList.add('is-hidden');
    intro.addEventListener('transitionend', () => intro.remove(), { once: true });
  };
  if (!intro || !video || reducedMotion) {
    if (intro) closeIntro();
    return;
  }
  skip.addEventListener('click', closeIntro);
  video.addEventListener('ended', closeIntro, { once: true });
  video.addEventListener('error', closeIntro, { once: true });
  video.play().catch(closeIntro);

  const sectionHeadings = document.querySelectorAll('main > section:not(.hero) h2');
  const entrancePatterns = [
    [-24, -30, -9, .92], [22, 27, 8, 1.05], [-30, 8, -6, .96],
    [28, -12, 7, 1.04], [-13, 31, 5, .94], [18, -27, -8, 1.03]
  ];

  const prepareHeading = (heading, headingIndex) => {
    const label = heading.innerText.replace(/\s+/g, ' ').trim();
    heading.setAttribute('aria-label', label);
    heading.classList.add('heading-chaos');
    let characterIndex = 0;
    const textNodes = [];
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();
      [...textNode.textContent].forEach((character) => {
        const letter = document.createElement('span');
        const pattern = entrancePatterns[(characterIndex + headingIndex * 2) % entrancePatterns.length];
        letter.className = 'chaos-letter';
        letter.setAttribute('aria-hidden', 'true');
        letter.textContent = character === ' ' ? '\u00a0' : character;
        letter.style.setProperty('--chaos-x', `${pattern[0]}px`);
        letter.style.setProperty('--chaos-y', `${pattern[1]}px`);
        letter.style.setProperty('--chaos-rotate', `${pattern[2]}deg`);
        letter.style.setProperty('--chaos-scale', pattern[3]);
        letter.style.setProperty('--chaos-delay', `${characterIndex * .045}s`);
        fragment.appendChild(letter);
        characterIndex += 1;
      });
      textNode.replaceWith(fragment);
    });
  };

  if (!reducedMotion && 'IntersectionObserver' in window) {
    sectionHeadings.forEach(prepareHeading);
    const headingObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-formed');
        observer.unobserve(entry.target);
      });
    }, { threshold: .3, rootMargin: '0px 0px -12% 0px' });
    sectionHeadings.forEach((heading) => headingObserver.observe(heading));
  }
})();
