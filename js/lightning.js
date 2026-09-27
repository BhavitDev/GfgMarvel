/**
 * Procedural Lightning & Plasma Particle Engine for Thor's Thunder Hammer
 * Generates dynamic electric arcs, branching bolts, and plasma field particles.
 */

class LightningEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.progress = 0; // 0 to 1
    this.particles = [];
    this.arcs = [];
    this.maxParticles = 80;
    this.hammerCenter = { x: 0.5, y: 0.5 };
    this.isStriking = false;
    this.strikeProgress = 0;
    this.initParticles();
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.002,
        vy: -Math.random() * 0.003 - 0.0005,
        size: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.7 + 0.2,
        baseAlpha: Math.random() * 0.7 + 0.2,
        hue: 190 + Math.random() * 30, // Cyan-blue range
        life: Math.random() * 100,
        maxLife: 80 + Math.random() * 100
      });
    }
  }

  updateProgress(p) {
    this.progress = p;
  }

  triggerStrike() {
    this.isStriking = true;
    this.strikeProgress = 1.0;
    this.strikeUntil = performance.now() + 480;
  }

  generateLightningPath(x1, y1, x2, y2, displacement, iterations) {
    if (iterations <= 0) {
      return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    }
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const normalX = -(y2 - y1);
    const normalY = x2 - x1;
    const len = Math.hypot(normalX, normalY) || 1;
    const d = (Math.random() - 0.5) * displacement;
    const offsetMidX = midX + (normalX / len) * d;
    const offsetMidY = midY + (normalY / len) * d;

    const left = this.generateLightningPath(x1, y1, offsetMidX, offsetMidY, displacement * 0.55, iterations - 1);
    const right = this.generateLightningPath(offsetMidX, offsetMidY, x2, y2, displacement * 0.55, iterations - 1);
    return left.slice(0, -1).concat(right);
  }

  drawBolt(points, color, width, glowColor, glowBlur) {
    if (points.length < 2) return;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.shadowColor = glowColor;
    this.ctx.shadowBlur = glowBlur;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
    this.ctx.restore();
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    const p = this.strikeUntil > performance.now() ? Math.max(this.progress, 0.48) : this.progress;
    const cx = this.width * this.hammerCenter.x;
    const cy = this.height * this.hammerCenter.y;

    // 1. Ambient & Charging Particles
    const activeParticleCount = Math.floor(15 + p * (this.maxParticles - 15));
    for (let i = 0; i < activeParticleCount; i++) {
      const pt = this.particles[i];
      pt.x += pt.vx * (1 + p * 2);
      pt.y += pt.vy * (1 + p * 2);
      pt.life++;

      if (pt.y < 0 || pt.x < 0 || pt.x > 1 || pt.life > pt.maxLife) {
        pt.x = this.hammerCenter.x + (Math.random() - 0.5) * (0.3 + p * 0.2);
        pt.y = this.hammerCenter.y + (Math.random() - 0.5) * (0.3 + p * 0.2);
        pt.life = 0;
      }

      const px = pt.x * this.width;
      const py = pt.y * this.height;
      const alpha = pt.alpha * (0.3 + p * 0.7) * (1 - Math.abs(p - 0.75) * 0.5);

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(px, py, pt.size * (1 + p * 0.8), 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${pt.hue}, 100%, 75%, ${alpha})`;
      this.ctx.shadowColor = `hsl(${pt.hue}, 100%, 65%)`;
      this.ctx.shadowBlur = 8 * (1 + p);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Phase 1 (0-0.15): Dormant, minimal energy
    if (p < 0.15) {
      return;
    }

    // Phase 2 (0.15-0.30): Subtle Awakening Arcs
    if (p >= 0.15 && p < 0.30) {
      const phase2Norm = (p - 0.15) / 0.15;
      if (Math.random() < 0.25 + phase2Norm * 0.3) {
        const angle = Math.random() * Math.PI * 2;
        const rad = (30 + Math.random() * 60) * (this.width / 1200);
        const x1 = cx + Math.cos(angle) * rad;
        const y1 = cy + Math.sin(angle) * rad;
        const x2 = cx + Math.cos(angle + 0.6) * (rad + 20);
        const y2 = cy + Math.sin(angle + 0.6) * (rad + 20);

        const path = this.generateLightningPath(x1, y1, x2, y2, 20, 3);
        this.drawBolt(path, 'rgba(180, 230, 255, 0.8)', 1.2, '#00d2ff', 10);
      }
      return;
    }

    // Phase 3 (0.30-0.50): Power Building
    if (p >= 0.30 && p < 0.50) {
      const phase3Norm = (p - 0.30) / 0.20;
      const arcCount = Math.floor(1 + phase3Norm * 3);
      for (let i = 0; i < arcCount; i++) {
        if (Math.random() < 0.6) {
          const angle = Math.random() * Math.PI * 2;
          const dist = (50 + Math.random() * 120) * (this.width / 1200);
          const x1 = cx + (Math.random() - 0.5) * 60;
          const y1 = cy + (Math.random() - 0.5) * 60;
          const x2 = cx + Math.cos(angle) * dist;
          const y2 = cy + Math.sin(angle) * dist;

          const path = this.generateLightningPath(x1, y1, x2, y2, 35, 4);
          this.drawBolt(path, 'rgba(210, 245, 255, 0.9)', 1.8, '#00F0FF', 14);
        }
      }
      return;
    }

    // Phase 4 (0.50-0.70): Maximum Charge - Intense Multi-branch Cage
    if (p >= 0.50 && p < 0.72) {
      const phase4Norm = (p - 0.50) / 0.22;
      const arcCount = Math.floor(3 + phase4Norm * 6);
      for (let i = 0; i < arcCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = (80 + Math.random() * 260) * (this.width / 1200);
        const x1 = cx + (Math.random() - 0.5) * 80;
        const y1 = cy + (Math.random() - 0.5) * 80;
        const x2 = cx + Math.cos(angle) * dist;
        const y2 = cy + Math.sin(angle) * dist;

        const path = this.generateLightningPath(x1, y1, x2, y2, 50, 4);
        this.drawBolt(path, 'rgba(255, 255, 255, 0.95)', 2.2 + Math.random() * 1.5, '#38BDF8', 22);

        // Sub-branches
        if (Math.random() < 0.45 && path.length > 4) {
          const branchIdx = Math.floor(path.length * 0.5);
          const bx1 = path[branchIdx].x;
          const by1 = path[branchIdx].y;
          const bx2 = bx1 + (Math.random() - 0.5) * 80;
          const by2 = by1 + (Math.random() - 0.5) * 80;
          const branchPath = this.generateLightningPath(bx1, by1, bx2, by2, 25, 3);
          this.drawBolt(branchPath, 'rgba(180, 220, 255, 0.8)', 1.2, '#00d2ff', 12);
        }
      }
      return;
    }

    // Phase 5 (0.72-0.82): Thunder Strike Climax
    if (p >= 0.72 && p < 0.84) {
      const strikeStrength = 1 - Math.abs(p - 0.77) / 0.08;
      const numBolts = Math.floor(6 + strikeStrength * 10);

      // Mega central bolts shooting from sky across screen
      for (let i = 0; i < numBolts; i++) {
        const topX = cx + (Math.random() - 0.5) * this.width * 0.6;
        const topY = 0;
        const botX = cx + (Math.random() - 0.5) * this.width * 0.4;
        const botY = this.height;

        const path = this.generateLightningPath(topX, topY, botX, botY, 80, 5);
        this.drawBolt(path, 'rgba(255, 255, 255, 1)', 3.5 + Math.random() * 2, '#00F0FF', 35);
      }
      return;
    }

    // Phase 6 (0.84-0.90): Hammer Acceleration Trail Arcs
    if (p >= 0.84 && p < 0.92) {
      if (Math.random() < 0.5) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 100;
        const x1 = cx + (Math.random() - 0.5) * 40;
        const y1 = cy + (Math.random() - 0.5) * 40;
        const x2 = cx + Math.cos(angle) * dist;
        const y2 = cy + Math.sin(angle) * dist;

        const path = this.generateLightningPath(x1, y1, x2, y2, 30, 3);
        this.drawBolt(path, 'rgba(140, 210, 255, 0.7)', 1.5, '#00d2ff', 14);
      }
      return;
    }

    // Phase 7 (0.92-1.00): Residual Dissipating Energy
    if (p >= 0.92) {
      const residualFade = 1 - (p - 0.92) / 0.08;
      if (Math.random() < 0.25 * residualFade) {
        const x1 = cx + (Math.random() - 0.5) * 80;
        const y1 = cy + (Math.random() - 0.5) * 80;
        const x2 = x1 + (Math.random() - 0.5) * 50;
        const y2 = y1 + (Math.random() - 0.5) * 50;

        const path = this.generateLightningPath(x1, y1, x2, y2, 15, 2);
        this.drawBolt(path, `rgba(100, 200, 255, ${0.5 * residualFade})`, 1.0, '#00F0FF', 10);
      }
    }
  }
}

window.LightningEngine = LightningEngine;
