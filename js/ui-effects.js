/**
 * UI Effects & Interactive Features
 * Countdown timer, 3D card tilt, FAQ accordions, registration modal & ticket generator.
 */

const EVENT_DATE = new Date('2026-10-24T10:00:00+05:30').getTime();

class MultiverseUI {
  constructor() {
    this.countdownInterval = null;
    this.initCountdown();
    this.init3DTilt();
    this.initTimelineProgress();
    this.initAccordion();
    this.initModalAndPassGenerator();
    this.initPointerAtmosphere();
    this.initCustomCursor();
    this.initMobileNav();
    this.initSmoothNavScroll();
    this.initActiveNavigation();
    this.initHammerReactions();
    this.initGlobalClickImpact();
  }

  initPointerAtmosphere() {
    const main = document.getElementById('main-content');
    const pointerPreference = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!main || !pointerPreference.matches) return;

    let pointerFrame = 0;
    let latestPointer = null;
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || !pointerPreference.matches) return;
      latestPointer = { x: event.clientX, y: event.clientY };
      if (pointerFrame) return;

      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!latestPointer) return;
        main.style.setProperty('--pointer-x', `${latestPointer.x}px`);
        main.style.setProperty('--pointer-y', `${latestPointer.y}px`);
        main.classList.add('pointer-active');
        window.backgroundLightning?.setPointer?.(latestPointer.x, latestPointer.y);
        window.hammerScene?.setPointer?.(latestPointer.x, latestPointer.y);
      });
    }, { passive: true });
  }

  /* -------------------------------------------------------------
     1. Real-Time Countdown Timer
     ------------------------------------------------------------- */
  initCountdown() {
    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');
    const countdownBox = document.getElementById('event-countdown');
    const countdownEyebrow = document.getElementById('countdown-eyebrow');
    const completionMessage = document.getElementById('countdown-complete');

    if (!daysEl || !countdownBox) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = EVENT_DATE - now;

      if (distance <= 0) {
        if (daysEl) daysEl.textContent = '00';
        if (hoursEl) hoursEl.textContent = '00';
        if (minsEl) minsEl.textContent = '00';
        if (secsEl) secsEl.textContent = '00';
        countdownBox.hidden = true;
        if (countdownEyebrow) countdownEyebrow.hidden = true;
        if (completionMessage) completionMessage.hidden = false;
        document.getElementById('main-content')?.classList.add('event-countdown-complete');
        clearInterval(this.countdownInterval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((distance % (1000 * 60)) / 1000);

      const previousMinutes = minsEl?.textContent;
      const previousSeconds = secsEl?.textContent;
      daysEl.textContent = String(days).padStart(2, '0');
      hoursEl.textContent = String(hours).padStart(2, '0');
      minsEl.textContent = String(mins).padStart(2, '0');
      secsEl.textContent = String(secs).padStart(2, '0');

      if (previousSeconds !== secsEl.textContent) {
        secsEl.classList.remove('countdown-value-tick');
        void secsEl.offsetWidth;
        secsEl.classList.add('countdown-value-tick');
      }
      if (previousMinutes !== minsEl.textContent) {
        countdownBox.classList.remove('countdown-minute-pulse');
        void countdownBox.offsetWidth;
        countdownBox.classList.add('countdown-minute-pulse');
      }
    };

    updateTimer();
    this.countdownInterval = setInterval(updateTimer, 1000);
  }

  /* -------------------------------------------------------------
     2. 3D Magnetic Card Tilt with Mouse Spotlight
     ------------------------------------------------------------- */
  init3DTilt() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

        const sheen = card.querySelector('.card-sheen');
        if (sheen) {
          sheen.style.background = `radial-gradient(circle 300px at ${x}px ${y}px, rgba(0, 240, 255, 0.15), transparent 70%)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        const sheen = card.querySelector('.card-sheen');
        if (sheen) {
          sheen.style.background = 'transparent';
        }
      });

      card.addEventListener('mouseenter', () => {
        if (window.multiverseAudio) window.multiverseAudio.playHoverTick();
        document.dispatchEvent(new CustomEvent('hammer:react'));
      });
    });
  }

  /* -------------------------------------------------------------
     3. Chrono-Timeline Scroll Line Progression
     ------------------------------------------------------------- */
  initTimelineProgress() {
    const timelineSection = document.getElementById('schedule');
    const timelineBar = document.getElementById('timeline-energy-bar');
    const timelineItems = document.querySelectorAll('.timeline-item');

    if (!timelineSection || !timelineBar) return;

    window.addEventListener('scroll', () => {
      const rect = timelineSection.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.top <= windowHeight && rect.bottom >= 0) {
        const totalHeight = rect.height;
        const scrolled = Math.max(0, windowHeight * 0.5 - rect.top);
        const progress = Math.min(1, Math.max(0, scrolled / totalHeight));

        timelineBar.style.height = `${(progress * 100).toFixed(1)}%`;

        timelineItems.forEach((item) => {
          const itemRect = item.getBoundingClientRect();
          if (itemRect.top < windowHeight * 0.65) {
            item.classList.add('active-node');
          } else {
            item.classList.remove('active-node');
          }
        });
      }
    }, { passive: true });
  }

  /* -------------------------------------------------------------
     4. FAQ Accordion
     ------------------------------------------------------------- */
  initAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach((item) => {
      const header = item.querySelector('.faq-header');
      if (!header) return;

      header.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');

        // Close all other items for clean editorial accordion feel
        faqItems.forEach((other) => {
          other.classList.remove('active');
          other.querySelector('.faq-header')?.setAttribute('aria-expanded', 'false');
          const body = other.querySelector('.faq-body');
          if (body) body.style.maxHeight = null;
        });

        if (!isOpen) {
          item.classList.add('active');
          header.setAttribute('aria-expanded', 'true');
          const body = item.querySelector('.faq-body');
          if (body) {
            body.style.maxHeight = body.scrollHeight + 30 + 'px';
          }
          if (window.multiverseAudio) window.multiverseAudio.playHoverTick();
        }
      });

      header.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          header.click();
        }
      });
    });
  }

  /* -------------------------------------------------------------
     5. Registration Modal & Generative Access Pass
     ------------------------------------------------------------- */
  initModalAndPassGenerator() {
    const openBtns = document.querySelectorAll('[data-open-modal="register"]');
    const modal = document.getElementById('register-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const form = document.getElementById('registration-form');
    const formView = document.getElementById('modal-form-view');
    const passView = document.getElementById('modal-pass-view');
    const guide = document.getElementById('registration-guide');
    const guideStepLabel = document.getElementById('registration-guide-step');
    const guideMessage = document.getElementById('registration-guide-message');
    const guideBackBtn = document.getElementById('registration-guide-back');
    const guideNextBtn = document.getElementById('registration-guide-next');
    const guideSkipBtn = document.getElementById('registration-guide-skip');
    const guideFields = Array.from(form?.querySelectorAll('.form-group .form-input, .form-group .form-select') || []);
    const guideMessages = [
      'Start with a name for your squad.',
      'Who will lead the team? Enter the team leader’s full name.',
      'Add an email address where we can reach your team.',
      'Tell us which college or university you represent.',
      'Choose the track that best fits your project.',
      'How many members are in your squad?',
      'Add a phone or WhatsApp number for event updates.'
    ];
    let guideIndex = 0;
    let allowGuidedSubmit = false;

    const setGuideStep = (index) => {
      guideIndex = Math.max(0, Math.min(index, guideFields.length - 1));
      if (guideStepLabel) guideStepLabel.textContent = `STEP ${guideIndex + 1} OF ${guideFields.length}`;
      if (guideMessage) guideMessage.textContent = guideMessages[guideIndex];
      guideFields.forEach((field, fieldIndex) => {
        const group = field.closest('.form-group');
        group?.classList.toggle('guide-current', fieldIndex === guideIndex);
        if (fieldIndex === guideIndex) group?.setAttribute('aria-current', 'step');
        else group?.removeAttribute('aria-current');
      });
      if (guideBackBtn) guideBackBtn.disabled = guideIndex === 0;
      if (guideNextBtn) guideNextBtn.textContent = guideIndex === guideFields.length - 1 ? 'GENERATE PASS' : 'NEXT FIELD';
      if (guide) {
        guide.classList.remove('is-tapping');
        void guide.offsetWidth;
        guide.classList.add('is-tapping');
      }
      guideFields[guideIndex]?.focus({ preventScroll: true });
      window.hammerScene?.setRegistrationGuideTarget(guideFields[guideIndex]);
    };

    const startRegistrationGuide = () => {
      modal?.classList.remove('guide-skipped');
      form?.classList.add('guide-active');
      setGuideStep(0);
    };

    const submitGuidedForm = () => {
      allowGuidedSubmit = true;
      form?.requestSubmit();
      allowGuidedSubmit = false;
    };

    guideBackBtn?.addEventListener('click', () => setGuideStep(guideIndex - 1));
    guideNextBtn?.addEventListener('click', () => {
      const field = guideFields[guideIndex];
      if (field && !field.checkValidity()) {
        field.reportValidity();
        return;
      }
      if (guideIndex === guideFields.length - 1) submitGuidedForm();
      else setGuideStep(guideIndex + 1);
    });
    guideSkipBtn?.addEventListener('click', () => {
      modal?.classList.add('guide-skipped');
      form?.classList.remove('guide-active');
      window.hammerScene?.clearRegistrationGuideTarget();
      guideFields.forEach((field) => {
        const group = field.closest('.form-group');
        group?.classList.remove('guide-current');
        group?.removeAttribute('aria-current');
      });
    });

    const openModal = (defaultTrack = '') => {
      if (modal) {
        modal.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        if (formView && passView) {
          formView.style.display = 'block';
          passView.style.display = 'none';
        }
        if (defaultTrack) {
          const trackSelect = document.getElementById('reg-track');
          if (trackSelect) trackSelect.value = defaultTrack;
        }
        startRegistrationGuide();
      }
    };

    const closeModal = () => {
      if (modal) {
        modal.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
      window.hammerScene?.clearRegistrationGuideTarget();
    };

    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const track = btn.getAttribute('data-track') || '';
        openModal(track);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Form submission & Ticket Generation
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (form.classList.contains('guide-active') && !allowGuidedSubmit) {
          const field = guideFields[guideIndex];
          if (field && !field.checkValidity()) {
            field.reportValidity();
            return;
          }
          if (guideIndex === guideFields.length - 1) submitGuidedForm();
          else setGuideStep(guideIndex + 1);
          return;
        }
        const teamName = document.getElementById('reg-team').value.trim() || 'QUANTUM AVENGERS';
        const leadName = document.getElementById('reg-name').value.trim() || 'OPERATIVE ZERO';
        const college = document.getElementById('reg-college').value.trim() || 'BENNETT UNIVERSITY';
        const track = document.getElementById('reg-track').value || 'STRATEGIST';
        const teamSize = document.getElementById('reg-size').value || '4';

        // Generate Marvel Pass Code
        const randId = Math.floor(1000 + Math.random() * 9000);
        const passCode = `GFG-BU-MV${randId}`;

        // Populate Ticket
        const passIdEl = document.getElementById('pass-code-display');
        const passTeamEl = document.getElementById('pass-team-display');
        const passLeadEl = document.getElementById('pass-lead-display');
        const passTrackEl = document.getElementById('pass-track-display');
        const passCollegeEl = document.getElementById('pass-college-display');
        const passSizeEl = document.getElementById('pass-size-display');
        const passDateEl = document.getElementById('pass-timestamp-display');

        if (passIdEl) passIdEl.textContent = passCode;
        if (passTeamEl) passTeamEl.textContent = teamName.toUpperCase();
        if (passLeadEl) passLeadEl.textContent = leadName.toUpperCase();
        if (passTrackEl) passTrackEl.textContent = track.toUpperCase();
        if (passCollegeEl) passCollegeEl.textContent = college.toUpperCase();
        if (passSizeEl) passSizeEl.textContent = `${teamSize} OPERATIVES`;
        if (passDateEl) passDateEl.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        window.hammerScene?.clearRegistrationGuideTarget();
        if (formView && passView) {
          formView.style.display = 'none';
          passView.style.display = 'block';
        }

        if (window.multiverseAudio) window.multiverseAudio.playThunderStrike();

        // Confetti celebration
        if (window.confetti) {
          window.confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00F0FF', '#38BDF8', '#EF4444', '#FFFFFF']
          });
        }
      });
    }

    // Copy Pass ID
    const copyPassBtn = document.getElementById('copy-pass-btn');
    if (copyPassBtn) {
      copyPassBtn.addEventListener('click', () => {
        const passCode = document.getElementById('pass-code-display')?.textContent || 'GFG-BU-MV9999';
        navigator.clipboard.writeText(passCode).then(() => {
          const orig = copyPassBtn.innerHTML;
          copyPassBtn.innerHTML = '<span>COPIED TO CLIPBOARD!</span>';
          setTimeout(() => { copyPassBtn.innerHTML = orig; }, 2000);
        });
      });
    }
  }

  /* -------------------------------------------------------------
     6. Custom Futuristic Cursor
     ------------------------------------------------------------- */
  initCustomCursor() {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');

    if (!dot || !ring || window.matchMedia('(hover: none)').matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(-50%, -50%) translate(${mouseX}px, ${mouseY}px)`;
    });

    const animateCursor = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(-50%, -50%) translate(${ringX}px, ${ringY}px)`;
      requestAnimationFrame(animateCursor);
    };
    animateCursor();

    const interactives = document.querySelectorAll('a, button, input, select, .tilt-card, .faq-item');
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', () => ring.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('cursor-hover'));
    });
  }

  /* -------------------------------------------------------------
     7. Mobile Navigation Drawer
     ------------------------------------------------------------- */
  initMobileNav() {
    const toggleBtn = document.getElementById('mobile-menu-btn');
    const drawer = document.getElementById('mobile-drawer');
    const drawerLinks = document.querySelectorAll('.mobile-nav-link');

    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('drawer-open');
      if (isOpen) {
        drawer.classList.remove('drawer-open');
        toggleBtn.classList.remove('btn-active');
      } else {
        drawer.classList.add('drawer-open');
        toggleBtn.classList.add('btn-active');
      }
    });

    drawerLinks.forEach((link) => {
      link.addEventListener('click', () => {
        drawer.classList.remove('drawer-open');
        toggleBtn.classList.remove('btn-active');
      });
    });
  }

  /* -------------------------------------------------------------
     8. Smooth Navigation Scrolling
     ------------------------------------------------------------- */
  initSmoothNavScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || !href) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  initActiveNavigation() {
    if (!('IntersectionObserver' in window)) return;
    const links = [...document.querySelectorAll('.nav-link')];
    const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('nav-link-active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-28% 0px -58% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }

  initHammerReactions() {
    const main = document.getElementById('main-content');
    const pointerPreference = window.matchMedia('(hover: hover) and (pointer: fine)');
    const targets = document.querySelectorAll('[data-open-modal="register"], .track-card, .timeline-item');
    const activeTargets = new Map();
    let currentTarget = null;

    const syncTarget = () => {
      const entries = [...activeTargets.entries()];
      const nextTarget = entries.at(-1) || null;
      if (currentTarget?.[0] === nextTarget?.[0]) return;
      if (currentTarget) {
        currentTarget[0].classList.remove('hammer-target-active');
        document.dispatchEvent(new CustomEvent('hammer:target', {
          detail: { element: currentTarget[0], kind: currentTarget[1], active: false }
        }));
      }
      currentTarget = nextTarget;
      main?.classList.toggle('hammer-reacting', Boolean(currentTarget));
      if (!currentTarget) return;

      const [element, kind] = currentTarget;
      element.classList.add('hammer-target-active');
      document.dispatchEvent(new CustomEvent('hammer:target', {
        detail: { element, kind, active: true }
      }));
      document.dispatchEvent(new CustomEvent('hammer:react'));
      const rect = element.getBoundingClientRect();
      window.backgroundLightning?.triggerInteractionPulse(rect.left + rect.width / 2, rect.top + rect.height / 2);
    };

    targets.forEach((element) => {
      const kind = element.matches('.track-card') ? 'track' : element.matches('.timeline-item') ? 'timeline' : 'register';
      element.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse' || !pointerPreference.matches) return;
        activeTargets.set(element, kind);
        syncTarget();
      });
      element.addEventListener('pointerleave', (event) => {
        if (event.pointerType !== 'mouse') return;
        activeTargets.delete(element);
        syncTarget();
      });
    });
  }

  initGlobalClickImpact() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const strong = Boolean(target?.closest('[data-open-modal="register"], .btn-primary, [type="submit"], [data-impact="strong"]'));
      const strength = strong ? 1.65 : 1;

      window.backgroundLightning?.triggerClickImpact(event.clientX, event.clientY, strong);
      document.dispatchEvent(new CustomEvent('hammer:impact', { detail: { strength } }));
    });
  }
}

window.MultiverseUI = MultiverseUI;
