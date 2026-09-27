class BackgroundLightning {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.particles = [];
    this.bolt = null;
    this.intensity = 0;
    this.stormFlashAt = 0;
    this.nextBoltAt = 0;
    this.frameId = 0;
    this.lastFrameAt = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    this.resize();
    this.createParticles();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => this.onVisibilityChange());
    this.reducedMotion.addEventListener('change', () => this.onMotionPreferenceChange());

    if (!this.reducedMotion.matches && !document.hidden) {
      this.scheduleBolt();
      this.frameId = requestAnimationFrame((time) => this.render(time));
    } else {
      this.renderParticles(0);
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.createParticles();
  }

  createParticles() {
    const count = this.width < 600 ? 14 : 24;
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius: 0.6 + Math.random() * 1.2,
      alpha: 0.12 + Math.random() * 0.26,
      speedX: (Math.random() - 0.5) * 5,
      speedY: -1.5 - Math.random() * 5,
      phase: Math.random() * Math.PI * 2
    }));
  }

  scheduleBolt() {
    const delay = 4000 - this.intensity * 1200 + Math.random() * (2600 - this.intensity * 1000);
    this.nextBoltAt = performance.now() + delay;
  }

  setIntensity(progress) {
    this.intensity = Math.max(0, Math.min(1, progress));
  }

  triggerStormFlash() {
    if (this.reducedMotion.matches || document.hidden) return;
    const now = performance.now();
    this.intensity = 1;
    this.createBolt(now);
    this.bolt.duration = 460;
    this.stormFlashAt = now;
  }

  makePath(startX, startY, endX, endY, segments, spread) {
    const points = [{ x: startX, y: startY }];
    for (let index = 1; index < segments; index++) {
      const progress = index / segments;
      points.push({
        x: startX + (endX - startX) * progress + (Math.random() - 0.5) * spread,
        y: startY + (endY - startY) * progress
      });
    }
    points.push({ x: endX, y: endY });
    return points;
  }

  createBolt(now) {
    const startX = this.width * (0.16 + Math.random() * 0.68);
    const endX = Math.max(18, Math.min(this.width - 18, startX + (Math.random() - 0.5) * this.width * 0.36));
    const endY = this.height * (0.24 + Math.random() * 0.36);
    const mainPath = this.makePath(startX, -12, endX, endY, 13, Math.min(58, this.width * 0.12));
    const paths = [mainPath];

    for (let branch = 0; branch < 2; branch++) {
      const source = mainPath[4 + Math.floor(Math.random() * 7)];
      const direction = Math.random() < 0.5 ? -1 : 1;
      paths.push(this.makePath(
        source.x,
        source.y,
        source.x + direction * (24 + Math.random() * 58),
        source.y + 30 + Math.random() * 70,
        6,
        24
      ));
    }

    this.bolt = { paths, startedAt: now, duration: 240 + this.intensity * 140 };
    this.scheduleBolt();
  }

  drawBolt(now) {
    if (!this.bolt) return;
    const elapsed = now - this.bolt.startedAt;
    if (elapsed > this.bolt.duration) {
      this.bolt = null;
      return;
    }

    const flash = (elapsed < 55 || (elapsed > 105 && elapsed < 145)) ? 1 : 0.24;
    this.ctx.save();
    this.ctx.globalAlpha = flash * (0.34 + this.intensity * 0.36);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = '#55c7ff';
    this.ctx.shadowBlur = 14 + this.intensity * 20;

    this.bolt.paths.forEach((path, index) => {
      this.ctx.beginPath();
      this.ctx.moveTo(path[0].x, path[0].y);
      path.slice(1).forEach((point) => this.ctx.lineTo(point.x, point.y));
      this.ctx.strokeStyle = index === 0 ? '#bdeaff' : '#55c7ff';
      this.ctx.lineWidth = index === 0 ? 1.6 + this.intensity * 1.8 : 0.9 + this.intensity * 0.7;
      this.ctx.stroke();
    });

    this.ctx.restore();
  }

  renderParticles(deltaSeconds) {
    this.particles.forEach((particle) => {
      particle.x += particle.speedX * deltaSeconds;
      particle.y += particle.speedY * deltaSeconds;
      if (particle.y < -4) {
        particle.y = this.height + 4;
        particle.x = Math.random() * this.width;
      }
      if (particle.x < -4) particle.x = this.width + 4;
      if (particle.x > this.width + 4) particle.x = -4;

      const shimmer = 0.72 + Math.sin(performance.now() / 900 + particle.phase) * 0.28;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(132, 211, 255, ${particle.alpha * shimmer * (0.85 + this.intensity * 0.55)})`;
      this.ctx.fill();
    });
  }

  render(now) {
    if (document.hidden || this.reducedMotion.matches) return;
    const deltaSeconds = this.lastFrameAt ? Math.min((now - this.lastFrameAt) / 1000, 0.04) : 0;
    this.lastFrameAt = now;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.renderParticles(deltaSeconds);

    if (!this.bolt && now >= this.nextBoltAt) this.createBolt(now);
    this.drawBolt(now);
    this.frameId = requestAnimationFrame((time) => this.render(time));
  }

  onVisibilityChange() {
    cancelAnimationFrame(this.frameId);
    this.lastFrameAt = 0;
    if (!document.hidden && !this.reducedMotion.matches) {
      this.scheduleBolt();
      this.frameId = requestAnimationFrame((time) => this.render(time));
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  onMotionPreferenceChange() {
    cancelAnimationFrame(this.frameId);
    this.lastFrameAt = 0;
    if (this.reducedMotion.matches) {
      this.bolt = null;
      this.ctx.clearRect(0, 0, this.width, this.height);
    } else if (!document.hidden) {
      this.scheduleBolt();
      this.frameId = requestAnimationFrame((time) => this.render(time));
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('background-lightning');
  if (canvas && canvas.getContext) window.backgroundLightning = new BackgroundLightning(canvas);
});