(() => {
  'use strict';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const initialHash = window.location.hash;
  const hasExplicitHash = initialHash.length > 1;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const positionInitialView = () => {
    window.requestAnimationFrame(() => {
      if (!hasExplicitHash) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        return;
      }
      const target = document.getElementById(decodeURIComponent(initialHash.slice(1)));
      if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  };

  document.body.classList.add('has-js');
  if (!hasExplicitHash) positionInitialView();
  const hero = document.getElementById('inicio');
  const installButton = document.getElementById('install-app');
  const iosInstallHint = document.getElementById('ios-install-hint');
  const closeIosInstallHint = document.getElementById('close-ios-install-hint');
  const year = document.getElementById('current-year');
  if (year) year.textContent = new Date().getFullYear();
  const intro = document.getElementById('intro');
  const video = document.getElementById('intro-video');
  const skip = document.getElementById('skip-intro');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closed = false;
  let introFinished = false;
  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;
    if (intro) intro.remove();
    positionInitialView();
    if (hero) window.requestAnimationFrame(() => hero.classList.add('is-revealed'));
    revealInstallOptions();
  };
  const closeIntro = () => {
    if (closed || !intro) return;
    closed = true;
    if (video) video.pause();
    intro.classList.add('is-hidden');
    intro.addEventListener('transitionend', finishIntro, { once: true });
    window.setTimeout(finishIntro, 700);
  };
  if (isStandalone) {
    finishIntro();
  } else if (!intro || !video || reducedMotion) {
    if (intro) closeIntro();
    else finishIntro();
  } else {
    skip.addEventListener('click', closeIntro);
    video.addEventListener('ended', closeIntro, { once: true });
    video.addEventListener('error', closeIntro, { once: true });
    video.play().catch(closeIntro);
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted && !hasExplicitHash) positionInitialView();
  });

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let deferredInstallPrompt;

  const wasDismissed = (key) => {
    try { return localStorage.getItem(key) === 'true'; } catch { return false; }
  };
  const rememberDismissal = (key) => {
    try { localStorage.setItem(key, 'true'); } catch { /* Storage can be unavailable. */ }
  };
  function revealInstallOptions() {
    if (isStandalone) return;
    window.setTimeout(() => {
      if (deferredInstallPrompt && installButton && !wasDismissed('la-grajera-install-dismissed')) installButton.hidden = false;
      if (isIos && iosInstallHint && !wasDismissed('la-grajera-ios-install-dismissed')) iosInstallHint.hidden = false;
    }, 900);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (introFinished) revealInstallOptions();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = undefined;
    if (installButton) installButton.hidden = true;
  });
  if (installButton) installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome !== 'accepted') rememberDismissal('la-grajera-install-dismissed');
    deferredInstallPrompt = undefined;
    installButton.hidden = true;
  });
  if (closeIosInstallHint) closeIosInstallHint.addEventListener('click', () => {
    rememberDismissal('la-grajera-ios-install-dismissed');
    if (iosInstallHint) iosInstallHint.hidden = true;
  });
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || isLocalhost)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
  }

  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('primary-navigation');
  const closeMobileNavigation = () => {
    if (!navToggle || !mainNav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.closest('.site-header')?.classList.remove('is-menu-open');
  };
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      navToggle.closest('.site-header')?.classList.toggle('is-menu-open', !isOpen);
    });
    mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobileNavigation));
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || navToggle.getAttribute('aria-expanded') !== 'true') return;
      closeMobileNavigation();
      navToggle.focus();
    });
  }

  const updateFloatingWhatsApp = () => {
    if (!hero) return;
    document.body.classList.toggle('hero-at-top', window.scrollY < hero.offsetHeight - 90);
  };
  updateFloatingWhatsApp();
  window.addEventListener('scroll', updateFloatingWhatsApp, { passive: true });

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
