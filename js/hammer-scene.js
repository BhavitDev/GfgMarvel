const HAMMER_MODEL_URL = new URL('../mjolnir_thors_hammer.glb', document.currentScript?.src || window.location.href).href;

class FloatingHammerScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.main = document.getElementById('main-content');
    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.active = false;
    this.loaded = false;
    this.started = false;
    this.frameId = 0;
    this.pivot = null;
    this.model = null;
    this.fitGroup = null;
    this.fitCenter = null;
    this.idleRotationY = 0.25;
    this.waypoints = this.createWaypoints();
    this.middleWaypointIndex = Math.floor(this.waypoints.length / 2);
    this.focusedWaypointIndex = -1;
    this.flipAnimation = null;
    this.reactionUntil = 0;
    this.climaxPulsePlayed = false;
    this.currentScale = 0;
    this.hasPose = false;
    this.scrollProgress = 0;
    this.pointerPreference = window.matchMedia('(hover: hover) and (pointer: fine)');
    this.pointerTarget = { x: 0, y: 0, active: false };
    this.reactiveOffset = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.dragPointer = null;
    this.dragReturn = null;
    this.suppressDragClick = false;
    this.hammerScreenPosition = null;
    this.cursorRing = document.getElementById('cursor-ring');
    this.registrationGuideTarget = null;
    this.registrationGuideCanvasPlaceholder = null;
    this.registrationGuideEntry = null;
    this.hoverTarget = null;
    this.finalLandingTriggered = false;
    this.finalLandingAt = 0;
    this.lastScrollY = window.scrollY;
    this.lastScrollAt = 0;
    this.scrollDirection = 0;
    this.scrollDelta = 0;
    this.clickReactionAt = 0;
    this.clickReactionStrength = 0;
    this.nextEnergyPulseAt = performance.now() + 3500 + Math.random() * 3500;

    if (window.ScrollTrigger) {
      this.journeyTrigger = window.ScrollTrigger.create({
        trigger: this.main,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (trigger) => {
          this.scrollProgress = trigger.progress;
          window.backgroundLightning?.setIntensity(trigger.progress);
        }
      });
    }

    this.waypoints.forEach((waypoint) => {
      waypoint.element.querySelector('[data-hammer-spin]')?.addEventListener('click', () => this.triggerFlip());
    });

    this.canvas.dataset.modelState = 'idle';
    window.addEventListener('resize', () => {
      this.resize();
      this.syncVisibility();
    });
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      this.scrollDelta = currentScrollY - this.lastScrollY;
      this.scrollDirection = Math.sign(this.scrollDelta);
      this.lastScrollY = currentScrollY;
      this.lastScrollAt = performance.now();
      this.syncVisibility();
    }, { passive: true });
    window.addEventListener('pointerdown', (event) => this.beginDrag(event), true);
    window.addEventListener('pointermove', (event) => this.moveDrag(event), true);
    window.addEventListener('pointerup', (event) => this.endDrag(event), true);
    window.addEventListener('pointercancel', (event) => this.endDrag(event), true);
    window.addEventListener('click', (event) => {
      if (!this.suppressDragClick) return;
      this.suppressDragClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    window.addEventListener('blur', () => this.endDrag());
    document.addEventListener('visibilitychange', () => this.onVisibilityChange());
    this.motionPreference.addEventListener('change', () => this.onMotionPreferenceChange());
    document.addEventListener('hammer:react', () => {
      this.reactionUntil = performance.now() + 520;
    });
    document.addEventListener('hammer:impact', (event) => this.triggerImpact(event.detail?.strength || 1));
    document.addEventListener('hammer:target', (event) => {
      const { element, kind, active } = event.detail || {};
      if (active) this.hoverTarget = { element, kind };
      else if (this.hoverTarget?.element === element) this.hoverTarget = null;
    });
    this.syncVisibility();
  }

  canDragHammer() {
    return this.active
      && this.loaded
      && !this.motionPreference.matches
      && this.focusedWaypointIndex === -1
      && !this.flipAnimation
      && !this.finalLandingTriggered;
  }

  isNearHammer(x, y) {
    if (!this.hammerScreenPosition) return false;
    const dx = x - this.hammerScreenPosition.x;
    const dy = y - this.hammerScreenPosition.y;
    const radius = window.innerWidth < 600 ? 76 : 108;
    return dx * dx + dy * dy <= radius * radius;
  }

  beginDrag(event) {
    if (event.button !== 0 || event.pointerType === 'touch' || !this.canDragHammer()) return;
    if (!this.isNearHammer(event.clientX, event.clientY)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    this.suppressDragClick = true;
    this.dragPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.dragReturn = null;
    this.cursorRing?.classList.remove('cursor-grab');
    this.cursorRing?.classList.add('cursor-grabbing');
  }

  moveDrag(event) {
    if (this.dragPointer) {
      if (event.pointerId !== this.dragPointer.id) return;
      event.preventDefault();
      event.stopPropagation();
      this.dragOffset.x += event.clientX - this.dragPointer.x;
      this.dragOffset.y += event.clientY - this.dragPointer.y;
      this.dragPointer.x = event.clientX;
      this.dragPointer.y = event.clientY;
      return;
    }

    const canGrab = event.pointerType === 'mouse'
      && this.canDragHammer()
      && this.isNearHammer(event.clientX, event.clientY);
    this.cursorRing?.classList.toggle('cursor-grab', canGrab);
  }

  endDrag(event) {
    if (!this.dragPointer || (event?.pointerId !== undefined && event.pointerId !== this.dragPointer.id)) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.dragPointer = null;
    this.dragReturn = {
      x: this.dragOffset.x,
      y: this.dragOffset.y,
      startedAt: performance.now()
    };
    this.cursorRing?.classList.remove('cursor-grabbing');
    window.setTimeout(() => { this.suppressDragClick = false; }, 0);
  }

  setPointer(x, y) {
    if (!this.pointerPreference.matches || this.motionPreference.matches) return;
    this.pointerTarget.x = (x / window.innerWidth) * 2 - 1;
    this.pointerTarget.y = (y / window.innerHeight) * 2 - 1;
    this.pointerTarget.active = true;
  }

  setRegistrationGuideTarget(element) {
    if (!element) return;

    if (!this.registrationGuideTarget) {
      const startPosition = this.hammerScreenPosition || {
        x: window.innerWidth * 0.86,
        y: window.innerHeight * 0.39
      };
      const guideScale = window.innerWidth < 600 ? 0.5 : 0.62;
      const startScale = this.motionPreference.matches ? guideScale : 0.025;
      this.registrationGuideCanvasPlaceholder = document.createComment('hammer-canvas-home');
      this.canvas.parentNode?.insertBefore(this.registrationGuideCanvasPlaceholder, this.canvas);
      document.body.append(this.canvas);
      this.canvas.classList.add('hammer-guide-overlay');
      this.flipAnimation = null;
      this.currentScale = startScale;
      this.registrationGuideEntry = this.motionPreference.matches ? null : {
        startedAt: performance.now(),
        fromX: Math.max(36, Math.min(window.innerWidth - 36,
          startPosition.x + Math.min(140, window.innerWidth * 0.14))),
        fromY: Math.max(48, startPosition.y - Math.min(180, window.innerHeight * 0.2)),
        fromScale: startScale
      };
    }

    this.registrationGuideTarget = element;
    if (this.motionPreference.matches) {
      this.hasPose = false;
      this.lastPoseTime = undefined;
    }
    this.startRender();
  }

  clearRegistrationGuideTarget() {
    this.registrationGuideTarget = null;
    this.registrationGuideEntry = null;
    this.canvas.classList.remove('hammer-guide-overlay');

    const placeholder = this.registrationGuideCanvasPlaceholder;
    if (placeholder?.parentNode) {
      placeholder.parentNode.insertBefore(this.canvas, placeholder.nextSibling);
      placeholder.remove();
    }
    this.registrationGuideCanvasPlaceholder = null;
    if (this.motionPreference.matches) {
      this.hasPose = false;
      this.lastPoseTime = undefined;
    }
    this.startRender();
  }

  createWaypoints() {
    const points = [];
    const addMarker = (element, kind = 'section') => {
      const marker = document.createElement('span');
      marker.className = `hammer-journey-anchor hammer-anchor-${kind}`;
      marker.setAttribute('aria-hidden', 'true');
      element.append(marker);
      points.push({ element, marker, kind });
    };

    ['#event-hero', '#about', '#tracks', '#intel', '#faqs', '#footer'].forEach((selector) => {
      const section = this.main.querySelector(selector);
      if (section) addMarker(section);
    });
    this.main.querySelectorAll('.highlight-row').forEach((row) => addMarker(row, 'highlight'));
    this.main.querySelectorAll('.timeline-item').forEach((item) => addMarker(item, 'timeline'));
    this.main.querySelectorAll('[data-hammer-stage]').forEach((element) => {
      const marker = element.querySelector('.hammer-stage-anchor');
      if (marker) points.push({ element, marker, kind: 'showcase' });
    });

    const cta = this.main.querySelector('#final-cta');
    const ctaButton = cta?.querySelector('[data-open-modal="register"]');
    if (cta && ctaButton) points.push({ element: cta, marker: ctaButton, kind: 'climax' });

    return points.sort((left, right) => {
      const relation = left.element.compareDocumentPosition(right.element);
      return relation & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  syncVisibility() {
    const bounds = this.main.getBoundingClientRect();
    const isVisible = bounds.top < window.innerHeight * 0.75 && bounds.bottom > 0;
    if (isVisible === this.active) return;

    this.active = isVisible;
    this.main.classList.toggle('event-page-active', isVisible);
    this.main.classList.toggle('hammer-scene-active', isVisible && this.loaded);

    if (isVisible) {
      this.loadModel();
      this.startRender();
    } else {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  loadModel() {
    if (this.started) return;
    this.started = true;

    if (!window.THREE?.GLTFLoader) {
      this.canvas.dataset.modelState = 'unavailable';
      return;
    }

    try {
      this.canvas.dataset.modelState = 'loading';
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;

      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
      this.camera.position.set(0, 0, 24);
      this.camera.lookAt(0, 0, 0);
      this.pivot = new THREE.Group();
        this.pivot.rotation.y = 0.25;
      this.scene.add(this.pivot);

      this.scene.add(new THREE.HemisphereLight(0xd8efff, 0x142337, 2.2));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
      keyLight.position.set(-4, 7, 10);
      this.scene.add(keyLight);
      const rimLight = new THREE.PointLight(0x55c7ff, 10, 20);
      rimLight.position.set(4, 1, 7);
      this.scene.add(rimLight);
      const reflectedLight = new THREE.PointLight(0xc6eeff, 2.2, 13);
      reflectedLight.position.set(-2, -2, 8);
      this.scene.add(reflectedLight);
      const rearRimLight = new THREE.PointLight(0x277dff, 12, 22);
      rearRimLight.position.set(-4, 1, -6);
      this.scene.add(rearRimLight);

      this.resize();
      new THREE.GLTFLoader().load(
        HAMMER_MODEL_URL,
        (gltf) => this.onModelLoaded(gltf),
        undefined,
        () => { this.canvas.dataset.modelState = 'error'; }
      );
    } catch {
      this.canvas.dataset.modelState = 'error';
    }
  }

  onModelLoaded(gltf) {
    this.model = gltf.scene;

    const bounds = new THREE.Box3().setFromObject(this.model);
    const size = bounds.getSize(new THREE.Vector3());
    this.fitCenter = bounds.getCenter(new THREE.Vector3());
    this.fitGroup = new THREE.Group();
    this.fitGroup.add(this.model);
    this.pivot.add(this.fitGroup);
    this.modelHeight = Math.max(size.x, size.y, size.z);
    this.fitModel();
    this.loaded = true;
    this.canvas.dataset.modelState = 'ready';
    this.main.classList.toggle('hammer-scene-active', this.active);
    this.startRender();
  }

  fitModel() {
    if (!this.fitGroup || !this.fitCenter || !this.modelHeight) return;
    const targetHeight = window.innerWidth < 600 ? 1.8 : 3.4;
    const scale = targetHeight / this.modelHeight;
    this.fitGroup.scale.setScalar(scale);
    this.fitGroup.position.copy(this.fitCenter).multiplyScalar(-scale);
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const aspect = window.innerWidth / window.innerHeight;
    const halfHeight = 4.9;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.fitModel();
  }

  startRender() {
    if (!this.active || !this.loaded || document.hidden || this.frameId) return;
    if (this.motionPreference.matches) {
      this.updatePose(0);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.frameId = requestAnimationFrame((time) => this.render(time));
  }

  render(time) {
    this.frameId = 0;
    if (!this.active || document.hidden || !this.loaded || this.motionPreference.matches) return;

    this.updatePose(time);
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame((nextTime) => this.render(nextTime));
  }

  updatePose(time) {
    const viewportCenter = window.innerHeight * 0.5;
    const closestWaypoint = this.waypoints.reduce((closest, waypoint, index) => {
      if (!waypoint.marker) return closest;
      const rect = waypoint.marker.getBoundingClientRect();
      const anchorY = waypoint.kind === 'climax' ? rect.top + rect.height / 2 : rect.top;
      const distance = Math.abs(anchorY - viewportCenter);
      return distance < closest.distance ? { ...waypoint, index, distance, rect, anchorY } : closest;
    }, { index: -1, marker: null, distance: Infinity, kind: 'section', anchorY: viewportCenter });
    const isMobile = window.innerWidth < 600;
    const focusDistance = window.innerHeight * 0.52;
    const linearFocus = Math.max(0, 1 - closestWaypoint.distance / focusDistance);
    const focus = linearFocus * linearFocus * (3 - 2 * linearFocus);
    const finalCta = this.main.querySelector('#final-cta');
    const finalCtaRect = finalCta?.getBoundingClientRect();
    const finalButtonRect = finalCta?.querySelector('[data-open-modal="register"]')?.getBoundingClientRect();
    const landingProgress = finalCtaRect
      ? Math.min(1, Math.max(0, (window.innerHeight * 0.92 - finalCtaRect.top) / (window.innerHeight * 0.82)))
      : 0;
    const landingMotionEnabled = !this.motionPreference.matches;

    this.main.classList.toggle('hammer-final-approach', landingProgress >= 0.06 && landingProgress < 0.58);
    this.main.classList.toggle('hammer-final-suspending', landingProgress >= 0.58 && landingProgress < 0.82);
    if (landingProgress >= 0.82 && !this.finalLandingTriggered) {
      this.finalLandingTriggered = true;
      this.finalLandingAt = time;
      this.triggerFinalLanding(finalButtonRect, finalCtaRect);
    } else if (landingProgress < 0.82) {
      this.finalLandingTriggered = false;
      this.finalLandingAt = 0;
    }
    this.main.classList.toggle('hammer-final-landed', landingProgress >= 0.82 && this.finalLandingTriggered);

    if (focus > 0.48 && closestWaypoint.index !== this.focusedWaypointIndex) {
      this.focusedWaypointIndex = closestWaypoint.index;
      this.main.dataset.hammerWaypoint = closestWaypoint.kind;
      if (closestWaypoint.kind === 'showcase') this.triggerFlip();
      else if (closestWaypoint.index === this.middleWaypointIndex) this.triggerFlip(0.62, 820);
      if (closestWaypoint.kind === 'climax') {
        this.main.classList.add('hammer-climax-active');
        if (!this.climaxPulsePlayed) {
          this.climaxPulsePlayed = true;
          window.backgroundLightning?.triggerStormFlash();
        }
      }
    } else if (focus < 0.14) {
      this.focusedWaypointIndex = -1;
      delete this.main.dataset.hammerWaypoint;
    }
    if (closestWaypoint.kind !== 'climax' && landingProgress < 0.52) this.main.classList.remove('hammer-climax-active');

    const halfHeight = this.camera.top;
    const halfWidth = this.camera.right;
    const restX = window.innerWidth * (isMobile ? 0.84 : 0.86);
    const restY = window.innerHeight * 0.39;
    const stageRect = closestWaypoint.rect;
    const finalOffsetX = isMobile ? 62 : Math.min(320, Math.max(210, window.innerWidth * 0.19));
    const finalStageX = finalButtonRect
      ? Math.min(window.innerWidth * 0.86, finalButtonRect.left + finalButtonRect.width / 2 + finalOffsetX)
      : window.innerWidth * (isMobile ? 0.82 : 0.72);
    const finalStageY = finalButtonRect
      ? Math.min(window.innerHeight * 0.72, Math.max(window.innerHeight * 0.22, finalButtonRect.top + finalButtonRect.height / 2 - (isMobile ? 56 : 84)))
      : window.innerHeight * 0.56;
    const approachingFinal = landingMotionEnabled && landingProgress >= 0.06;
    const stageX = approachingFinal
      ? finalStageX
      : closestWaypoint.kind === 'timeline'
      ? window.innerWidth * (isMobile ? 0.82 : 0.85)
      : closestWaypoint.kind === 'climax'
        ? (landingMotionEnabled ? finalStageX : window.innerWidth * (isMobile ? 0.82 : 0.72))
        : stageRect?.left ?? restX;
    const stageY = approachingFinal
      ? finalStageY
      : closestWaypoint.kind === 'climax'
        ? (landingMotionEnabled ? finalStageY : isMobile ? closestWaypoint.anchorY - 68 : closestWaypoint.anchorY)
        : closestWaypoint.anchorY;
    const landingFocus = landingMotionEnabled ? Math.max(focus, landingProgress * 0.96) : focus;
    let targetScreenX = restX + (stageX - restX) * landingFocus;
    let targetScreenY = restY + (stageY - restY) * landingFocus;
    let landingOffsetY = 0;
    if (landingMotionEnabled && landingProgress >= 0.58 && landingProgress < 0.82) {
      landingOffsetY = -38;
    } else if (landingMotionEnabled && this.finalLandingAt) {
      const landingElapsed = time - this.finalLandingAt;
      if (landingElapsed < 130) {
        const dropProgress = landingElapsed / 130;
        landingOffsetY = -38 * (1 - (1 - Math.pow(1 - dropProgress, 3)));
      } else {
        const bounceTime = landingElapsed - 130;
        landingOffsetY = -6 * Math.exp(-bounceTime / 170) * Math.sin(bounceTime / 38);
      }
    }
    targetScreenY += landingOffsetY * landingFocus;
    const idleMotion = (1 - focus) * (1 - landingProgress * 0.82) + (landingProgress >= 0.82 ? 0.12 : 0);
    const idleSeconds = time / 1000;
    const scrollAge = this.lastScrollAt ? Math.max(0, time - this.lastScrollAt) : Infinity;
    const scrollImpulse = scrollAge < 1200 ? Math.min(Math.abs(this.scrollDelta) / 50, 1) * Math.exp(-scrollAge / 280) : 0;
    const scrollParallax = scrollAge < 1200 ? Math.max(-12, Math.min(12, this.scrollDelta * 0.1)) * Math.exp(-scrollAge / 260) : 0;
    targetScreenX += Math.sin(idleSeconds * 0.34) * 4 * idleMotion;
    targetScreenY += Math.sin(idleSeconds * 0.48 + 0.8) * 8 * idleMotion
      - this.scrollDirection * scrollImpulse * 8
      - scrollParallax;
    if (this.dragReturn) {
      const progress = Math.min((time - this.dragReturn.startedAt) / 480, 1);
      const remaining = Math.pow(1 - progress, 3);
      this.dragOffset.x = this.dragReturn.x * remaining;
      this.dragOffset.y = this.dragReturn.y * remaining;
      if (progress >= 1) {
        this.dragOffset.x = 0;
        this.dragOffset.y = 0;
        this.dragReturn = null;
      }
    }
    targetScreenX += this.dragOffset.x;
    targetScreenY += this.dragOffset.y;
    const registrationTargetRect = this.registrationGuideTarget?.getBoundingClientRect();
    const guideEntry = this.registrationGuideEntry;
    const guideProgress = guideEntry
      ? Math.min((time - guideEntry.startedAt) / 850, 1)
      : 1;
    const guideEase = 1 - Math.pow(1 - guideProgress, 3);
    if (registrationTargetRect) {
      const rightSpace = window.innerWidth - registrationTargetRect.right;
      const leftSpace = registrationTargetRect.left;
      const side = rightSpace >= 120 || (leftSpace < 120 && rightSpace >= leftSpace) ? 1 : -1;
      const gap = Math.min(96, Math.max(42, Math.max(rightSpace, leftSpace) * 0.34));
      const orbit = time * 0.0011;
      const baseX = side > 0
        ? registrationTargetRect.right + gap
        : registrationTargetRect.left - gap;
      const guideX = Math.max(24, Math.min(window.innerWidth - 24, baseX + Math.sin(orbit) * 12));
      const guideY = Math.max(42, Math.min(window.innerHeight - 42,
        registrationTargetRect.top + registrationTargetRect.height / 2 + Math.cos(orbit * 0.78) * 18));
      targetScreenX = guideEntry ? guideEntry.fromX + (guideX - guideEntry.fromX) * guideEase : guideX;
      targetScreenY = guideEntry ? guideEntry.fromY + (guideY - guideEntry.fromY) * guideEase : guideY;
    }
    if (time >= this.nextEnergyPulseAt && !this.motionPreference.matches) {
      window.backgroundLightning?.triggerInteractionPulse(targetScreenX, targetScreenY, 0.8);
      this.nextEnergyPulseAt = time + 8000 + Math.random() * 6500;
    }
    const elapsed = this.lastPoseTime === undefined || time <= this.lastPoseTime
      ? 50
      : Math.min(time - this.lastPoseTime, 50);
    const easing = this.hasPose ? 1 - Math.exp(-elapsed * 0.008) : 1;
    const hoverRect = this.hoverTarget?.element?.getBoundingClientRect();
    const pointerX = hoverRect
      ? hoverRect.left + hoverRect.width / 2
      : (this.pointerTarget.x + 1) * window.innerWidth / 2;
    const pointerY = hoverRect
      ? hoverRect.top + hoverRect.height / 2
      : (this.pointerTarget.y + 1) * window.innerHeight / 2;
    const hasReactiveTarget = Boolean(hoverRect || this.pointerTarget.active);
    const reactiveDx = pointerX - targetScreenX;
    const reactiveDy = pointerY - targetScreenY;
    const reactiveDistance = Math.hypot(reactiveDx, reactiveDy) || 1;
    const pointerProximity = Math.max(0, 1 - reactiveDistance / 240);
    const reactiveRange = this.motionPreference.matches ? 0 : hoverRect ? 15 : 10 * pointerProximity;
    const reactiveMagnitude = hasReactiveTarget && (hoverRect || pointerProximity > 0)
      ? Math.min(reactiveRange, reactiveDistance * 0.08)
      : 0;
    const targetReactiveX = reactiveDx / reactiveDistance * reactiveMagnitude;
    const targetReactiveY = reactiveDy / reactiveDistance * reactiveMagnitude;
    this.reactiveOffset.x += (targetReactiveX - this.reactiveOffset.x) * easing;
    this.reactiveOffset.y += (targetReactiveY - this.reactiveOffset.y) * easing;
    let targetX = (targetScreenX / window.innerWidth * 2 - 1) * halfWidth
      + Math.sin(idleSeconds * 0.38) * 0.07 * idleMotion
      + this.reactiveOffset.x * 2 * halfWidth / window.innerWidth;
    let targetY = (1 - targetScreenY / window.innerHeight * 2) * halfHeight
      + Math.sin(idleSeconds * 0.52 + 0.8) * 0.09 * idleMotion
      - this.reactiveOffset.y * 2 * halfHeight / window.innerHeight;
    const restScale = isMobile ? 0.46 : 0.51;
    const stageScale = closestWaypoint.kind === 'climax'
      ? (isMobile ? 0.58 : 1.22)
      : closestWaypoint.kind === 'showcase'
        ? (isMobile ? 0.96 : 1.04)
        : (isMobile ? 0.52 : 0.61);
    let targetScale = restScale + (stageScale - restScale) * focus;
    if (registrationTargetRect) {
      const guideScale = isMobile ? 0.5 : 0.62;
      targetScale = guideEntry
        ? guideEntry.fromScale + (guideScale - guideEntry.fromScale) * guideEase
        : guideScale;
      targetX = (targetScreenX / window.innerWidth * 2 - 1) * halfWidth;
      targetY = (1 - targetScreenY / window.innerHeight * 2) * halfHeight;
      if (guideEntry && guideProgress >= 1) this.registrationGuideEntry = null;
    }
    this.lastPoseTime = time;
    this.hasPose = true;
    this.pivot.position.x += (targetX - this.pivot.position.x) * easing;
    this.pivot.position.y += (targetY - this.pivot.position.y) * easing;
    const projectedPosition = this.pivot.position.clone().project(this.camera);
    this.hammerScreenPosition = {
      x: (projectedPosition.x + 1) * window.innerWidth / 2,
      y: (1 - projectedPosition.y) * window.innerHeight / 2
    };
    this.currentScale += (targetScale - this.currentScale) * easing;
    this.pivot.scale.setScalar(this.currentScale);

    if (this.flipAnimation) {
      const progress = Math.min((time - this.flipAnimation.startedAt) / this.flipAnimation.duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      this.pivot.rotation.y = this.flipAnimation.startRotation + Math.PI * 2 * this.flipAnimation.turns * easedProgress;
      if (progress >= 1) {
        this.idleRotationY = this.pivot.rotation.y % (Math.PI * 2);
        this.flipAnimation = null;
      }
    } else {
      const reaction = Math.max(0, (this.reactionUntil - time) / 520);
      const guideMotion = registrationTargetRect ? 1 : idleMotion;
      const clickElapsed = this.clickReactionAt ? Math.max(0, time - this.clickReactionAt) : Infinity;
      const clickPulse = clickElapsed < 480
        ? Math.sin(clickElapsed / 24) * Math.exp(-clickElapsed / 150) * this.clickReactionStrength
        : 0;
      this.pivot.rotation.y = this.idleRotationY + Math.sin(idleSeconds * 0.42) * 0.09 * guideMotion + reaction * 0.1;
      this.pivot.rotation.x = Math.sin(idleSeconds * 0.34 + 0.7) * 0.032 * guideMotion + reaction * 0.035;
      this.pivot.rotation.z = Math.sin(idleSeconds * 0.31) * 0.05 * guideMotion
        - this.reactiveOffset.x * 0.0007
        + this.scrollDirection * scrollImpulse * 0.026
        + clickPulse * 0.035;
      if (clickPulse) this.pivot.rotation.x += clickPulse * 0.025;
    }
  }

  triggerFlip(turns = 1, duration = 1050) {
    if (!this.pivot) return;
    this.flipAnimation = {
      startedAt: performance.now(),
      startRotation: this.pivot.rotation.y,
      turns,
      duration
    };
  }

  triggerImpact(strength = 1) {
    this.clickReactionAt = performance.now();
    this.clickReactionStrength = strength;
    if (!this.active) return;
    const mobile = window.innerWidth < 600;
    const amplitude = this.motionPreference.matches ? 0 : mobile ? (strength > 1.2 ? 2 : 0.8) : (strength > 1.2 ? 3 : 1.5);
    this.main.style.setProperty('--hammer-impact-amplitude', `${amplitude}px`);
    this.main.classList.add('hammer-click-reacting');
    window.clearTimeout(this.clickReactionTimeout);
    this.clickReactionTimeout = window.setTimeout(() => {
      this.main.classList.remove('hammer-click-reacting');
      this.main.style.removeProperty('--hammer-impact-amplitude');
    }, 420);
  }

  triggerFinalLanding(buttonRect, ctaRect) {
    if (!buttonRect || !ctaRect) return;
    const impactX = buttonRect.left + buttonRect.width / 2 + (window.innerWidth < 600 ? 62 : Math.min(320, Math.max(210, window.innerWidth * 0.19)));
    const impactY = buttonRect.top + buttonRect.height / 2 - (window.innerWidth < 600 ? 56 : 84);
    this.main.style.setProperty('--impact-x', `${Math.min(98, Math.max(2, (impactX - ctaRect.left) / ctaRect.width * 100))}%`);
    this.main.style.setProperty('--impact-y', `${Math.min(92, Math.max(8, (impactY - ctaRect.top) / ctaRect.height * 100))}%`);
    this.main.classList.add('hammer-final-impact', 'hammer-final-landed');
    window.backgroundLightning?.triggerInteractionPulse(impactX, impactY, 2);
    window.setTimeout(() => this.main.classList.remove('hammer-final-impact'), this.motionPreference.matches ? 80 : 620);
  }

  onVisibilityChange() {
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.startRender();
  }

  onMotionPreferenceChange() {
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.startRender();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('hammer-model-canvas');
  if (canvas && window.THREE) window.hammerScene = new FloatingHammerScene(canvas);
});