/**
 * Master Application Controller
 * Audio HUD controls, GSAP section animations, and initialization.
 */

document.addEventListener('DOMContentLoaded', () => {
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');
  const skipBtn = document.getElementById('skip-sequence-btn');

  // Initialize hammer sequence controller immediately
  const sequenceController = new HammerSequenceController();
  window.hammerSequence = sequenceController;
  sequenceController.init();

  // Initialize UI interactive components
  window.ui = new MultiverseUI();

  // Sound Toggle HUD
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      if (window.multiverseAudio) {
        const isUnmuted = window.multiverseAudio.toggleMute();
        if (isUnmuted) {
          soundToggleBtn.classList.add('sound-active');
          if (soundLabel) soundLabel.textContent = 'AUDIO: ON';
          if (soundIcon) soundIcon.innerHTML = `<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
        } else {
          soundToggleBtn.classList.remove('sound-active');
          if (soundLabel) soundLabel.textContent = 'AUDIO: OFF';
          if (soundIcon) soundIcon.innerHTML = `<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`;
        }
      }
    });
  }

  // Skip sequence button
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      sequenceController.finishOpeningExperience(true);
    });
  }

  // Setup GSAP section scroll reveals
  initGSAPScrollAnimations();

  function initGSAPScrollAnimations() {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.utils.toArray('.section-header').forEach((header) => {
      gsap.from(header, {
        scrollTrigger: {
          trigger: header,
          start: 'top 88%',
          toggleActions: 'play none none none'
        },
        y: 18,
        opacity: 0,
        duration: 0.65,
        ease: 'power2.out'
      });
    });

    // Fade-in HUD Cards
    gsap.utils.toArray('.reveal-up').forEach((el) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        },
        y: 35,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
      });
    });

    // Track Cards Stagger
    gsap.from('.track-card', {
      scrollTrigger: {
        trigger: '#tracks-grid',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 50,
      opacity: 0,
      stagger: 0.12,
      duration: 0.9,
      ease: 'power3.out'
    });

    // Highlight Items Stagger
    gsap.from('.highlight-row', {
      scrollTrigger: {
        trigger: '#highlights-container',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      x: -30,
      opacity: 0,
      stagger: 0.1,
      duration: 0.7,
      ease: 'power2.out'
    });

    // Intel HUD Stat Cards
    gsap.from('.intel-card', {
      scrollTrigger: {
        trigger: '#intel-grid',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      scale: 0.94,
      stagger: 0.08,
      duration: 0.7,
      ease: 'back.out(1.2)'
    });

  }
});
