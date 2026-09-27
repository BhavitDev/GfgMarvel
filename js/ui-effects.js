/**
 * UI Effects & Interactive Features
 * Countdown timer, 3D card tilt, FAQ accordions, registration modal & ticket generator.
 */

class MultiverseUI {
  constructor() {
    this.countdownInterval = null;
    this.initCountdown();
    this.init3DTilt();
    this.initTimelineProgress();
    this.initAccordion();
    this.initModalAndPassGenerator();
    this.initCustomCursor();
    this.initMobileNav();
    this.initSmoothNavScroll();
    this.initActiveNavigation();
    this.initHammerReactions();
  }

  /* -------------------------------------------------------------
     1. Real-Time Countdown Timer
     ------------------------------------------------------------- */
  initCountdown() {
    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');

    if (!daysEl) return;

    // Target event date: October 24, 2026 10:00:00 IST
    const eventDate = new Date('2026-10-24T10:00:00+05:30').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = eventDate - now;

      if (distance < 0) {
        if (daysEl) daysEl.textContent = '00';
        if (hoursEl) hoursEl.textContent = '00';
        if (minsEl) minsEl.textContent = '00';
        if (secsEl) secsEl.textContent = '00';
        clearInterval(this.countdownInterval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((distance % (1000 * 60)) / 1000);

      daysEl.textContent = String(days).padStart(2, '0');
      hoursEl.textContent = String(hours).padStart(2, '0');
      minsEl.textContent = String(mins).padStart(2, '0');
      secsEl.textContent = String(secs).padStart(2, '0');
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
      }
    };

    const closeModal = () => {
      if (modal) {
        modal.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
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
    document.querySelectorAll('.highlight-row, .track-card').forEach((item) => {
      item.addEventListener('mouseenter', () => document.dispatchEvent(new CustomEvent('hammer:react')));
      item.addEventListener('focusin', () => document.dispatchEvent(new CustomEvent('hammer:react')));
    });
  }
}

window.MultiverseUI = MultiverseUI;
