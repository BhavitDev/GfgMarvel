/**
 * Scrollytelling & Canvas Frame Sequence Controller
 * Orchestrates 240 hammer frames, lightning canvas, typography phases, and GSAP ScrollTrigger.
 */

class HammerSequenceController {
  constructor() {
    this.totalFrames = 240;
    this.frames = [];
    this.imagesLoaded = 0;
    this.currentFrameIndex = 0;
    this.canvas = document.getElementById('hammer-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.lightningCanvas = document.getElementById('lightning-canvas');
    this.lightningEngine = null;
    this.container = document.getElementById('cinematic-sequence');
    this.canvasWrapper = document.getElementById('canvas-wrapper');
    this.flashOverlay = document.getElementById('thunder-flash');
    this.phaseTexts = {
      p1: document.getElementById('phase-text-1'),
      p2: document.getElementById('phase-text-2'),
      p3: document.getElementById('phase-text-3'),
      p4: document.getElementById('phase-text-4'),
    };
    this.scrollProgress = 0;
    this.hasStruck = false;
    this.isLoaded = false;
    this.animationFrameId = null;
    this.openingTimers = [];
    this.openingFinished = false;
  }

  init() {
    if (!this.canvas) return;

    this.lightningEngine = new LightningEngine(this.lightningCanvas);
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // 1. Immediately render frame 1 synchronously so there is NEVER a black screen
    const firstFrame = new Image();
    firstFrame.src = 'ezgif-50c1e9bd8ff6ca08-jpg/ezgif-frame-001.jpg';
    firstFrame.onload = () => {
      this.frames[0] = firstFrame;
      this.drawFrame(0);
    };
    if (firstFrame.complete) {
      this.frames[0] = firstFrame;
      this.drawFrame(0);
    }

    this.startRenderLoop();
    this.setupScrollTrigger();
    this.startOpeningExperience();
  }

  startOpeningExperience() {
    const overlay = document.getElementById('opening-intro');
    const skipButton = document.getElementById('skip-sequence-btn');
    const mainSection = document.getElementById('main-content');
    const hudControls = document.querySelector('.hud-controls-top');
    if (!overlay || !mainSection) return;

    let hasSeenIntro = false;
    try {
      hasSeenIntro = localStorage.getItem('gfg_intro_seen') === 'true';
    } catch {}

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.classList.add('opening-intro-active');
    mainSection.inert = true;
    if (this.container) this.container.inert = true;
    if (hudControls) hudControls.inert = true;

    if (skipButton) {
      skipButton.addEventListener('click', () => this.finishOpeningExperience(true));
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (hasSeenIntro || reducedMotion) {
      overlay.classList.add('controls-visible');
      if (skipButton) skipButton.disabled = false;
      if (hudControls) hudControls.inert = false;
      this.openingTimers.push(window.setTimeout(() => this.finishOpeningExperience(false), hasSeenIntro ? 40 : 450));
      return;
    }

    this.openingTimers.push(window.setTimeout(() => {
      overlay.classList.add('controls-visible', 'brand-reveal');
      if (skipButton) skipButton.disabled = false;
      if (hudControls) hudControls.inert = false;
      this.triggerOpeningFlash('flash-one');
      window.multiverseAudio?.playIntroThunder();
    }, 1100));

    this.openingTimers.push(window.setTimeout(() => {
      overlay.classList.remove('brand-reveal');
      overlay.classList.add('presents-reveal');
    }, 1800));

    this.openingTimers.push(window.setTimeout(() => {
      overlay.classList.add('flash-two');
      this.triggerOpeningFlash('flash-two');
      window.multiverseAudio?.playIntroZap();
    }, 2750));

    this.openingTimers.push(window.setTimeout(() => this.preloadFrames(), 3800));
    this.openingTimers.push(window.setTimeout(() => this.finishOpeningExperience(false), 3620));
  }

  triggerOpeningFlash(className) {
    const overlay = document.getElementById('opening-intro');
    if (!overlay) return;
    overlay.classList.remove('flash-one', 'flash-two');
    void overlay.offsetWidth;
    overlay.classList.add(className);

    if (window.multiverseAudio && !window.multiverseAudio.isMuted && window.multiverseAudio.ctx?.state === 'running') {
      window.multiverseAudio.playThunderStrike();
    }
  }

  finishOpeningExperience(skipped) {
    if (this.openingFinished) return;
    this.openingFinished = true;
    this.openingTimers.forEach((timer) => window.clearTimeout(timer));
    this.openingTimers = [];

    try {
      localStorage.setItem('gfg_intro_seen', 'true');
    } catch {}

    const overlay = document.getElementById('opening-intro');
    const mainSection = document.getElementById('main-content');
    const hudControls = document.querySelector('.hud-controls-top');
    if (mainSection) {
      mainSection.inert = true;
    }
    if (this.container) this.container.inert = false;
    if (hudControls) hudControls.inert = false;
    this.preloadFrames();
    document.body.classList.remove('opening-intro-active');
    document.documentElement.classList.remove('intro-pending');
    document.documentElement.classList.add('intro-seen');

    if (overlay) overlay.classList.add('is-closing');
    window.scrollTo({ top: 0, behavior: 'instant' });
    window.ScrollTrigger?.update();

    window.setTimeout(() => {
      overlay?.remove();
    }, 560);
  }

  handleResize() {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    if (this.lightningEngine) {
      this.lightningEngine.resize(w, h);
    }

    this.drawFrame(this.currentFrameIndex);
  }

  preloadFrames() {
    if (this.framesPreloaded) return;
    this.framesPreloaded = true;
    const total = this.totalFrames;
    for (let i = 1; i <= total; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(3, '0');
      img.src = `ezgif-50c1e9bd8ff6ca08-jpg/ezgif-frame-${frameNum}.jpg`;

      img.onload = () => {
        this.frames[i - 1] = img;
        this.imagesLoaded++;
        if (this.imagesLoaded === 1) {
          this.drawFrame(0);
        }
      };
      this.frames[i - 1] = img;
    }
  }

  drawFrame(index) {
    if (!this.ctx) return;
    const img = this.frames[index] || this.frames[0];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.ctx.clearRect(0, 0, w, h);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;

    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawW = w;
      drawH = w / imgRatio;
      drawX = 0;
      drawY = (h - drawH) / 2;
    } else {
      drawH = h;
      drawW = h * imgRatio;
      drawX = (w - drawW) / 2;
      drawY = 0;
    }

    this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  startRenderLoop() {
    const loop = () => {
      if (this.lightningEngine) {
        this.lightningEngine.render();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  setupScrollTrigger() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const self = this;

    ScrollTrigger.create({
      trigger: '#cinematic-sequence',
      start: 'top top',
      end: '+=125%',
      pin: true,
      anticipatePin: 1,
      scrub: 0.1,
      onUpdate: (selfTrigger) => {
        const progress = selfTrigger.progress;
        self.scrollProgress = progress;

        // Map progress 0 to 0.82 to frame sequence 0 to 239
        let frameIndex = 0;
        if (progress < 0.82) {
          const normProgress = progress / 0.82;
          frameIndex = Math.min(
            self.totalFrames - 1,
            Math.max(0, Math.floor(normProgress * self.totalFrames))
          );
        } else {
          frameIndex = self.totalFrames - 1;
        }

        if (frameIndex !== self.currentFrameIndex) {
          self.currentFrameIndex = frameIndex;
          self.drawFrame(frameIndex);
        }

        // Update lightning & audio
        if (self.lightningEngine) {
          self.lightningEngine.updateProgress(progress);
        }
        if (window.multiverseAudio) {
          window.multiverseAudio.updateChargeHum(progress);
          if (Math.random() < progress * 0.4 && progress > 0.15 && progress < 0.85) {
            window.multiverseAudio.playArcCrackle(progress);
          }
        }

        self.handlePhases(progress);
      }
    });
  }

  handlePhases(p) {
    // 1. Typography Phase Management
    // Keep the event-wide opening line visible before the first scroll.
    this.interpolateOpacity(this.phaseTexts.p1, p, -0.1, -0.01, 0.08, 0.16);

    // Phase 2 (0.15 - 0.32): BUT IT REMEMBERS
    this.interpolateOpacity(this.phaseTexts.p2, p, 0.16, 0.21, 0.27, 0.32);

    // Phase 3 (0.33 - 0.52): THE STORM IS COMING
    this.interpolateOpacity(this.phaseTexts.p3, p, 0.34, 0.39, 0.46, 0.52);

    // Phase 4 (0.53 - 0.70): ARE YOU WORTHY?
    this.interpolateOpacity(this.phaseTexts.p4, p, 0.54, 0.59, 0.65, 0.70);

    // 2. Camera Shake Intensity (Phase 4 & 5)
    if (p >= 0.55 && p <= 0.82) {
      const shakeIntensity = p >= 0.72 ? 8 : (p - 0.55) * 14;
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * shakeIntensity;
      if (this.canvasWrapper) {
        this.canvasWrapper.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
      }
    } else if (this.canvasWrapper) {
      this.canvasWrapper.style.transform = 'translate(0px, 0px)';
    }

    // 3. Phase 5: Thunder Strike Trigger (0.72 - 0.82)
    if (p >= 0.72 && p <= 0.80) {
      if (!this.hasStruck) {
        this.hasStruck = true;
        this.triggerFlashEffect();
        if (window.multiverseAudio) {
          window.multiverseAudio.playThunderStrike();
        }
      }
    } else if (p < 0.68 || p > 0.85) {
      this.hasStruck = false;
    }

    // 4. Phase 6 (0.82 - 0.92): HAMMER DEPARTURE - Accelerates away into the sky!
    if (p >= 0.82 && p <= 0.93) {
      const departureProgress = (p - 0.82) / 0.11; // 0 to 1
      const easeVelocity = Math.pow(departureProgress, 2.2);
      const translateY = -easeVelocity * window.innerHeight * 1.6;
      const scale = 1 - easeVelocity * 0.4;
      const blur = easeVelocity * 14;
      if (this.canvas) {
        this.canvas.style.transform = `translateY(${translateY}px) scale(${scale})`;
        this.canvas.style.filter = `blur(${blur}px) brightness(${1 + easeVelocity * 1.5})`;
        this.canvas.style.opacity = '1';
      }
    } else if (p > 0.93) {
      if (this.canvas) {
        this.canvas.style.transform = `translateY(-200vh) scale(0.5)`;
        this.canvas.style.opacity = '0';
        this.canvas.style.filter = 'none';
      }
    } else {
      if (this.canvas) {
        this.canvas.style.transform = 'none';
        this.canvas.style.filter = 'none';
        this.canvas.style.opacity = '1';
      }
    }

    // 5. Phase 7: Residual Energy & Navbar Fade (0.90 - 1.00)
    const navbar = document.getElementById('main-nav');
    const hudIndicator = document.getElementById('scroll-indicator-hud');
    const hudControls = document.querySelector('.hud-controls-top');

    if (p > 0.82) {
      if (hudIndicator) hudIndicator.style.opacity = '0';
    } else {
      if (hudIndicator) hudIndicator.style.opacity = '1';
    }

    const openingActive = document.body.classList.contains('opening-intro-active');
    if (p > 0.90 && !openingActive) {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.inert = false;
        mainContent.classList.add('event-reveal-in');
      }
      if (navbar) {
        navbar.classList.add('nav-visible');
      }
      if (hudControls) hudControls.classList.add('hud-dismissed');
    } else {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.inert = true;
        mainContent.classList.remove('event-reveal-in');
      }
      if (navbar) {
        navbar.classList.remove('nav-visible');
      }
      if (hudControls) hudControls.classList.remove('hud-dismissed');
    }
  }

  interpolateOpacity(elem, p, enterStart, enterEnd, exitStart, exitEnd) {
    if (!elem) return;
    let opacity = 0;
    let translateY = 20;

    if (p >= enterStart && p <= enterEnd) {
      const norm = (p - enterStart) / (enterEnd - enterStart);
      opacity = norm;
      translateY = 20 * (1 - norm);
    } else if (p > enterEnd && p < exitStart) {
      opacity = 1;
      translateY = 0;
    } else if (p >= exitStart && p <= exitEnd) {
      const norm = 1 - (p - exitStart) / (exitEnd - exitStart);
      opacity = norm;
      translateY = -20 * (1 - norm);
    } else {
      opacity = 0;
      translateY = p < enterStart ? 20 : -20;
    }

    elem.style.opacity = opacity.toFixed(3);
    elem.style.transform = `translate(-50%, calc(-50% + ${translateY.toFixed(1)}px))`;
    elem.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
  }

  triggerFlashEffect() {
    if (!this.flashOverlay) return;
    this.flashOverlay.classList.remove('flash-active');
    void this.flashOverlay.offsetWidth;
    this.flashOverlay.classList.add('flash-active');
  }

  skipSequence(behavior = 'smooth') {
    const mainSection = document.getElementById('main-content');
    if (mainSection) {
      mainSection.scrollIntoView({ behavior });
    }
  }

}

window.HammerSequenceController = HammerSequenceController;
