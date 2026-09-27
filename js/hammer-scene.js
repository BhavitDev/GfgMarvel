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
    this.focusedWaypointIndex = -1;
    this.flipAnimation = null;
    this.reactionUntil = 0;
    this.climaxPulsePlayed = false;
    this.currentScale = 0;
    this.hasPose = false;
    this.scrollProgress = 0;

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
    window.addEventListener('scroll', () => this.syncVisibility(), { passive: true });
    document.addEventListener('visibilitychange', () => this.onVisibilityChange());
    this.motionPreference.addEventListener('change', () => this.onMotionPreferenceChange());
    document.addEventListener('hammer:react', () => {
      this.reactionUntil = performance.now() + 520;
    });
    this.syncVisibility();
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
      this.renderer.toneMappingExposure = 1.15;

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
      const rimLight = new THREE.PointLight(0x42aaff, 8, 18);
      rimLight.position.set(4, 1, 7);
      this.scene.add(rimLight);

      this.resize();
      new THREE.GLTFLoader().load(
        'mjolnir_thors_hammer.glb',
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
    const targetHeight = window.innerWidth < 600 ? 1.35 : 3.4;
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

    if (focus > 0.48 && closestWaypoint.index !== this.focusedWaypointIndex) {
      this.focusedWaypointIndex = closestWaypoint.index;
      this.main.dataset.hammerWaypoint = closestWaypoint.kind;
      if (closestWaypoint.kind === 'showcase') this.triggerFlip();
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
    if (closestWaypoint.kind !== 'climax') this.main.classList.remove('hammer-climax-active');

    const halfHeight = this.camera.top;
    const halfWidth = this.camera.right;
    const restX = window.innerWidth * (isMobile ? 0.84 : 0.86);
    const restY = window.innerHeight * 0.39;
    const stageRect = closestWaypoint.rect;
    const stageX = closestWaypoint.kind === 'timeline'
      ? window.innerWidth * (isMobile ? 0.82 : 0.85)
      : closestWaypoint.kind === 'climax'
        ? window.innerWidth * (isMobile ? 0.82 : 0.72)
        : stageRect?.left ?? restX;
    const stageY = closestWaypoint.kind === 'climax' && isMobile
      ? closestWaypoint.anchorY - 68
      : closestWaypoint.anchorY;
    const targetScreenX = restX + (stageX - restX) * focus;
    const targetScreenY = restY + (stageY - restY) * focus;
    const idleMotion = 1 - focus;
    const idleSeconds = time / 1000;
    const targetX = (targetScreenX / window.innerWidth * 2 - 1) * halfWidth
      + Math.sin(idleSeconds * 0.38) * 0.055 * idleMotion;
    const targetY = (1 - targetScreenY / window.innerHeight * 2) * halfHeight
      + Math.sin(idleSeconds * 0.52 + 0.8) * 0.075 * idleMotion;
    const restScale = isMobile ? 0.42 : 0.46;
    const stageScale = closestWaypoint.kind === 'climax'
      ? (isMobile ? 0.54 : 1.18)
      : closestWaypoint.kind === 'showcase'
        ? (isMobile ? 0.92 : 0.98)
        : (isMobile ? 0.48 : 0.56);
    const targetScale = restScale + (stageScale - restScale) * focus;
    const elapsed = this.lastPoseTime === undefined || time <= this.lastPoseTime
      ? 50
      : Math.min(time - this.lastPoseTime, 50);
    const easing = this.hasPose ? 1 - Math.exp(-elapsed * 0.008) : 1;

    this.lastPoseTime = time;
    this.hasPose = true;
    this.pivot.position.x += (targetX - this.pivot.position.x) * easing;
    this.pivot.position.y += (targetY - this.pivot.position.y) * easing;
    this.currentScale += (targetScale - this.currentScale) * easing;
    this.pivot.scale.setScalar(this.currentScale);

    if (this.flipAnimation) {
      const progress = Math.min((time - this.flipAnimation.startedAt) / 1050, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      this.pivot.rotation.y = this.flipAnimation.startRotation + Math.PI * 2 * easedProgress;
      if (progress >= 1) {
        this.idleRotationY = this.pivot.rotation.y % (Math.PI * 2);
        this.flipAnimation = null;
      }
    } else {
      const reaction = Math.max(0, (this.reactionUntil - time) / 520);
      this.idleRotationY = (this.idleRotationY + elapsed * 0.00014 * idleMotion) % (Math.PI * 2);
      this.pivot.rotation.y = this.idleRotationY + reaction * 0.1;
      this.pivot.rotation.x = reaction * 0.035;
      this.pivot.rotation.z = Math.sin(idleSeconds * 0.31) * 0.025 * idleMotion;
    }
  }

  triggerFlip() {
    if (!this.pivot) return;
    this.flipAnimation = {
      startedAt: performance.now(),
      startRotation: this.pivot.rotation.y
    };
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