(() => {
  'use strict';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  // Installed apps always open on the cover, never at a saved section hash.
  if (isStandalone && window.location.hash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
  const initialHash = isStandalone ? '' : window.location.hash;
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
  const introFallback = document.getElementById('intro-fallback');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closed = false;
  let introFinished = false;
  let playbackStarted = false;
  let playbackTimer;
  let standaloneStartTimer;
  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;
    if (intro) intro.remove();
    positionInitialView();
    window.requestAnimationFrame(initializeTitleAnimations);
    revealInstallOptions();
  };
  const closeIntro = () => {
    if (closed || !intro) return;
    closed = true;
    window.clearTimeout(playbackTimer);
    window.clearTimeout(standaloneStartTimer);
    if (video) video.pause();
    intro.classList.add('is-hidden');
    intro.addEventListener('transitionend', (event) => {
      if (event.target === intro) finishIntro();
    }, { once: true });
    window.setTimeout(finishIntro, 700);
  };
  if (!intro || !video || reducedMotion) {
    if (intro) closeIntro();
    else finishIntro();
  } else {
    const setVideoAutoplayProperties = () => {
      // These properties must be set before every programmatic play attempt on iOS.
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
    };
    const showAutoplayFallback = () => {
      if (closed || playbackStarted) return;
      intro.classList.add('is-autoplay-blocked');
      skip.textContent = 'Entrar';
      if (introFallback) introFallback.hidden = false;
    };
    const markPlaybackStarted = () => {
      playbackStarted = true;
      window.clearTimeout(playbackTimer);
      window.clearTimeout(standaloneStartTimer);
      if (isStandalone) intro.classList.add('is-video-playing');
      intro.classList.remove('is-autoplay-blocked');
      if (introFallback) introFallback.hidden = true;
    };
    const attemptPlayback = () => {
      if (closed) return Promise.resolve(false);
      setVideoAutoplayProperties();
      if (isStandalone) {
        try { video.currentTime = 0; } catch { /* The source may not be seekable yet. */ }
      }
      let playPromise;
      try {
        playPromise = video.play();
      } catch {
        showAutoplayFallback();
        return Promise.resolve(false);
      }
      if (playPromise === undefined) return Promise.resolve(true);
      return playPromise.then(() => true).catch(() => {
        showAutoplayFallback();
        return false;
      });
    };
    let standaloneStartScheduled = false;
    const requestPlaybackWhenReady = () => {
      if (playbackStarted || closed) return;
      if (!isStandalone) {
        attemptPlayback();
        return;
      }
      if (document.visibilityState !== 'visible' || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || standaloneStartScheduled) return;
      standaloneStartScheduled = true;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          standaloneStartTimer = window.setTimeout(() => {
            standaloneStartScheduled = false;
            if (closed || playbackStarted) return;
            if (document.visibilityState !== 'visible') {
              requestPlaybackWhenReady();
              return;
            }
            try { video.currentTime = 0; } catch { /* The source is already at its start. */ }
            attemptPlayback();
          }, 400);
        });
      });
    };

    setVideoAutoplayProperties();
    if (isStandalone) {
      video.pause();
      try { video.currentTime = 0; } catch { /* Metadata can arrive after the source is attached. */ }
      document.addEventListener('visibilitychange', requestPlaybackWhenReady);
    }
    skip.addEventListener('click', () => {
      if (!intro.classList.contains('is-autoplay-blocked')) {
        closeIntro();
        return;
      }
      attemptPlayback().then((started) => {
        if (!started) closeIntro();
      });
    });
    video.addEventListener('ended', closeIntro, { once: true });
    video.addEventListener('error', showAutoplayFallback, { once: true });
    video.addEventListener('playing', markPlaybackStarted, { once: true });
    video.addEventListener('loadeddata', requestPlaybackWhenReady, { once: true });
    video.addEventListener('canplay', requestPlaybackWhenReady, { once: true });
    if (video.dataset.src) {
      const source = document.createElement('source');
      source.src = video.dataset.src;
      source.type = 'video/mp4';
      video.appendChild(source);
      video.load();
    }
    playbackTimer = window.setTimeout(showAutoplayFallback, 4500);
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) requestPlaybackWhenReady();
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
    window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' }).catch(() => {}));
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

  const sectionHeadings = document.querySelectorAll('main > section:not(.hero) h2');
  const heroTitle = hero?.querySelector('h1');
  const entrancePatterns = [
    [-24, -30, -9, .92], [22, 27, 8, 1.05], [-30, 8, -6, .96],
    [28, -12, 7, 1.04], [-13, 31, 5, .94], [18, -27, -8, 1.03]
  ];
  const heroEntrancePatterns = [
    [-35, -28, -8, .9], [34, 25, 7, 1.07], [-31, 29, -6, .94],
    [32, -19, 8, 1.06], [-22, 30, 5, .92], [27, -30, -7, 1.04],
    [-35, 9, 6, .96], [18, 28, -5, 1.08]
  ];

  const prepareHeading = (heading, headingIndex) => {
    const label = heading.innerText.replace(/\s+/g, ' ').trim();
    heading.setAttribute('aria-label', label);
    heading.classList.add('heading-chaos');
    heading.classList.add(`heading-float-variant-${headingIndex % 3}`);
    let characterIndex = 0;
    const textNodes = [];
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();
      [...textNode.textContent].forEach((character) => {
        const letter = document.createElement('span');
        const glyph = document.createElement('span');
        const pattern = entrancePatterns[(characterIndex + headingIndex * 2) % entrancePatterns.length];
        letter.className = 'chaos-letter';
        glyph.className = 'chaos-letter__glyph';
        letter.setAttribute('aria-hidden', 'true');
        glyph.textContent = character === ' ' ? '\u00a0' : character;
        letter.appendChild(glyph);
        letter.style.setProperty('--chaos-x', `${pattern[0]}px`);
        letter.style.setProperty('--chaos-y', `${pattern[1]}px`);
        letter.style.setProperty('--chaos-rotate', `${pattern[2]}deg`);
        letter.style.setProperty('--chaos-scale', pattern[3]);
        letter.style.setProperty('--chaos-delay', `${characterIndex * .045}s`);
        letter.style.setProperty('--wave-delay', `${characterIndex * .045}s`);
        fragment.appendChild(letter);
        characterIndex += 1;
      });
      textNode.replaceWith(fragment);
    });
  };

  const prepareHeroTitle = (title) => {
    const label = title.innerText.replace(/\s+/g, ' ').trim();
    title.setAttribute('aria-label', label);
    title.classList.add('hero-title-lettered');
    let characterIndex = 0;

    title.querySelectorAll('.hero-title-line').forEach((line) => {
      const textNodes = [];
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach((textNode) => {
        const fragment = document.createDocumentFragment();
        [...textNode.textContent].forEach((character) => {
          const letter = document.createElement('span');
          const glyph = document.createElement('span');
          const pattern = heroEntrancePatterns[characterIndex % heroEntrancePatterns.length];
          letter.className = 'hero-letter';
          glyph.className = 'hero-letter__glyph';
          letter.setAttribute('aria-hidden', 'true');
          glyph.textContent = character === ' ' ? '\u00a0' : character;
          letter.appendChild(glyph);
          letter.style.setProperty('--hero-x', `${pattern[0]}px`);
          letter.style.setProperty('--hero-y', `${pattern[1]}px`);
          letter.style.setProperty('--hero-rotate', `${pattern[2]}deg`);
          letter.style.setProperty('--hero-scale', pattern[3]);
          letter.style.setProperty('--hero-delay', `${characterIndex * .037}s`);
          letter.style.setProperty('--wave-delay', `${characterIndex * .045}s`);
          fragment.appendChild(letter);
          characterIndex += 1;
        });
        textNode.replaceWith(fragment);
      });
    });
  };

  let titleAnimationsInitialized = false;
  const floatTimers = new WeakMap();
  const waveTimers = new WeakMap();

  const clearFloatTimer = (title) => {
    const timer = floatTimers.get(title);
    if (timer) window.clearTimeout(timer);
    floatTimers.delete(title);
  };

  const startFloatAfterEntrance = (title, className, delay) => {
    clearFloatTimer(title);
    const timer = window.setTimeout(() => {
      title.classList.remove('is-entering');
      title.classList.add(className);
      floatTimers.delete(title);
    }, delay);
    floatTimers.set(title, timer);
  };

  const restartSectionHeading = (heading) => {
    clearFloatTimer(heading);
    heading.classList.remove('heading-is-floating', 'is-formed', 'is-entering', 'is-waving');
    // A frame with the initial letter transforms guarantees a fresh transition.
    window.requestAnimationFrame(() => {
      heading.classList.add('is-formed', 'is-entering');
      startFloatAfterEntrance(heading, 'heading-is-floating', 2200);
    });
  };

  const resetSectionHeading = (heading) => {
    clearFloatTimer(heading);
    heading.classList.remove('heading-is-floating', 'is-formed', 'is-entering', 'is-waving');
    const waveTimer = waveTimers.get(heading);
    if (waveTimer) window.clearTimeout(waveTimer);
    waveTimers.delete(heading);
  };

  const restartHeroTitle = () => {
    if (!hero || !heroTitle) return;
    clearFloatTimer(heroTitle);
    heroTitle.classList.remove('hero-title-is-floating', 'is-formed', 'is-entering', 'is-waving');
    window.requestAnimationFrame(() => {
      hero.classList.add('is-revealed');
      heroTitle.classList.add('is-formed', 'is-entering');
      startFloatAfterEntrance(heroTitle, 'hero-title-is-floating', 1900);
    });
  };

  const resetHeroTitle = () => {
    if (!hero || !heroTitle) return;
    clearFloatTimer(heroTitle);
    heroTitle.classList.remove('hero-title-is-floating', 'is-formed', 'is-entering', 'is-waving');
    const waveTimer = waveTimers.get(heroTitle);
    if (waveTimer) window.clearTimeout(waveTimer);
    waveTimers.delete(heroTitle);
  };

  const launchWave = (title, floatingClass, duration) => {
    if (!title.classList.contains(floatingClass) || title.classList.contains('is-waving')) return;
    title.classList.add('is-waving');
    const timer = window.setTimeout(() => {
      title.classList.remove('is-waving');
      waveTimers.delete(title);
    }, duration);
    waveTimers.set(title, timer);
  };

  const bindHoverWave = (title, floatingClass, duration) => {
    title.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      launchWave(title, floatingClass, duration);
    });
  };

  function initializeTitleAnimations() {
    if (titleAnimationsInitialized) return;
    titleAnimationsInitialized = true;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      if (hero) hero.classList.add('is-revealed');
      return;
    }

    sectionHeadings.forEach(prepareHeading);
    if (heroTitle) prepareHeroTitle(heroTitle);
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      sectionHeadings.forEach((heading) => bindHoverWave(heading, 'heading-is-floating', 1250));
      if (heroTitle) bindHoverWave(heroTitle, 'hero-title-is-floating', 1500);
    }
    const titleObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const { target, intersectionRatio } = entry;
        const isHeroTitle = target === heroTitle;

        // Separate enter/exit thresholds prevent tiny scroll movements from
        // repeatedly resetting a title at the viewport edge.
        if (intersectionRatio >= .45) {
          if (isHeroTitle) {
            if (!target.dataset.titleVisible) restartHeroTitle();
          } else if (!target.dataset.titleVisible) {
            restartSectionHeading(target);
          }
          target.dataset.titleVisible = 'true';
        } else if (intersectionRatio <= .1) {
          if (isHeroTitle) resetHeroTitle();
          else resetSectionHeading(target);
          delete target.dataset.titleVisible;
        }
      });
    }, {
      threshold: [.1, .45],
      rootMargin: '-8% 0px -12% 0px'
    });

    sectionHeadings.forEach((heading) => titleObserver.observe(heading));
    if (heroTitle) titleObserver.observe(heroTitle);
  }
  const gallery = document.getElementById('galeria');
  const galleryLightbox = document.getElementById('gallery-lightbox');
  if (gallery && galleryLightbox) {
    const galleryTriggers = [...gallery.querySelectorAll('.gallery__trigger')];
    const galleryImage = galleryLightbox.querySelector('.gallery-lightbox__image');
    const closeGallery = galleryLightbox.querySelector('.gallery-lightbox__close');
    const previousGalleryImage = galleryLightbox.querySelector('.gallery-lightbox__previous');
    const nextGalleryImage = galleryLightbox.querySelector('.gallery-lightbox__next');
    let activeGalleryIndex = 0;
    let galleryOpener;
    const showGalleryImage = (index) => {
      activeGalleryIndex = (index + galleryTriggers.length) % galleryTriggers.length;
      const sourceImage = galleryTriggers[activeGalleryIndex].querySelector('img');
      galleryImage.src = sourceImage.currentSrc || sourceImage.src;
      galleryImage.alt = sourceImage.alt;
    };
    const openGallery = (index, opener) => {
      galleryOpener = opener;
      showGalleryImage(index);
      galleryLightbox.hidden = false;
      document.body.classList.add('is-gallery-lightbox-open');
      closeGallery.focus();
    };
    const closeGalleryLightbox = () => {
      if (galleryLightbox.hidden) return;
      galleryLightbox.hidden = true;
      galleryImage.removeAttribute('src');
      document.body.classList.remove('is-gallery-lightbox-open');
      galleryOpener?.focus();
    };
    galleryTriggers.forEach((trigger, index) => trigger.addEventListener('click', () => openGallery(index, trigger)));
    closeGallery.addEventListener('click', closeGalleryLightbox);
    previousGalleryImage.addEventListener('click', () => showGalleryImage(activeGalleryIndex - 1));
    nextGalleryImage.addEventListener('click', () => showGalleryImage(activeGalleryIndex + 1));
    galleryLightbox.addEventListener('click', (event) => { if (event.target === galleryLightbox) closeGalleryLightbox(); });
    window.addEventListener('keydown', (event) => {
      if (galleryLightbox.hidden) return;
      if (event.key === 'Escape') closeGalleryLightbox();
      if (event.key === 'ArrowLeft') showGalleryImage(activeGalleryIndex - 1);
      if (event.key === 'ArrowRight') showGalleryImage(activeGalleryIndex + 1);
    });
  }
})();
