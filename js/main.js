(() => {
  'use strict';
  const header = document.querySelector('.site-header'); const menuButton = document.querySelector('.menu-toggle'); const navigation = document.querySelector('.main-nav'); const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setMenu = (open) => { menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); navigation.classList.toggle('open', open); header.classList.toggle('menu-active', open); document.body.classList.toggle('menu-open', open); };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); }); document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); }); window.addEventListener('resize', () => { if (window.innerWidth >= 900) setMenu(false); });
  // La introducción usa el vídeo configurado en el HTML y deja una salida inmediata al contenido.
  const heroVideo = document.querySelector('.hero-video');
  const videoToggle = document.querySelector('.video-toggle');
  const heroEntry = document.querySelector('.hero-entry');
  if (heroVideo && videoToggle && heroEntry && heroVideo.dataset.src.trim() && !reduceMotion) {
    heroVideo.src = heroVideo.dataset.src;
    let introFinished = false;
    let playbackTimeout;
    const finishIntro = () => {
      if (introFinished) return;
      introFinished = true;
      window.clearTimeout(playbackTimeout);
      heroEntry.classList.remove('is-intro-playing');
      videoToggle.hidden = true;
      heroVideo.pause();
    };
    const startIntro = () => {
      heroEntry.classList.add('is-intro-playing');
      videoToggle.hidden = false;
      heroVideo.play().catch(finishIntro);
    };
    heroVideo.addEventListener('ended', finishIntro, { once: true });
    heroVideo.addEventListener('error', finishIntro, { once: true });
    heroVideo.addEventListener('playing', () => window.clearTimeout(playbackTimeout), { once: true });
    videoToggle.addEventListener('click', finishIntro);
    playbackTimeout = window.setTimeout(finishIntro, 6000);
    startIntro();
  } else if (heroEntry) {
    heroEntry.classList.remove('is-intro-playing');
    if (videoToggle) videoToggle.hidden = true;
  }
  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 24); updateHeader(); window.addEventListener('scroll', updateHeader, { passive: true });
  document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', (event) => { const target = document.querySelector(link.getAttribute('href')); if (!target) return; event.preventDefault(); target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }));
  document.getElementById('current-year').textContent = new Date().getFullYear(); const items = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) items.forEach((item) => item.classList.add('is-visible'));
  else { const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .12, rootMargin: '0px 0px -40px' }); items.forEach((item) => observer.observe(item)); }
})();
