(() => {
  const canvas = document.getElementById('ambient-particles');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  const particles = [];
  const repelRadius = 170;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let previousTime = 0;
  let frameId = 0;
  let pointer = null;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const targetCount = window.matchMedia('(max-width: 700px)').matches ? 28 : 54;
    while (particles.length < targetCount) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.8 + Math.random() * 1.6,
        alpha: 0.28 + Math.random() * 0.5,
        driftX: (Math.random() - 0.5) * 12,
        driftY: -3 - Math.random() * 10,
        velocityX: 0,
        velocityY: 0,
        phase: Math.random() * Math.PI * 2,
        frequency: 0.4 + Math.random() * 0.8
      });
    }
    particles.length = targetCount;
    draw();
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    for (const particle of particles) {
      const twinkle = reducedMotion ? 1 : 0.82 + Math.sin(particle.phase) * 0.18;
      context.beginPath();
      context.fillStyle = `rgba(98, 184, 255, ${particle.alpha * twinkle})`;
      context.shadowColor = 'rgba(66, 157, 255, 0.8)';
      context.shadowBlur = particle.radius * 5;
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.shadowBlur = 0;
  }

  function animate(time) {
    if (document.hidden) {
      frameId = 0;
      return;
    }

    const delta = Math.min((time - (previousTime || time)) / 1000, 0.05);
    previousTime = time;

    for (const particle of particles) {
      particle.phase += delta * particle.frequency;
      if (pointer) {
        const offsetX = particle.x - pointer.x;
        const offsetY = particle.y - pointer.y;
        const distance = Math.hypot(offsetX, offsetY);
        if (distance > 0 && distance < repelRadius) {
          const force = (1 - distance / repelRadius) * 520 * delta;
          particle.velocityX += (offsetX / distance) * force;
          particle.velocityY += (offsetY / distance) * force;
        }
      }
      particle.x += (particle.driftX + particle.velocityX + Math.sin(particle.phase) * 2) * delta;
      particle.y += (particle.driftY + particle.velocityY + Math.cos(particle.phase * 0.7) * 2) * delta;
      particle.velocityX *= Math.exp(-2.8 * delta);
      particle.velocityY *= Math.exp(-2.8 * delta);

      if (particle.x < -8) particle.x = width + 8;
      if (particle.x > width + 8) particle.x = -8;
      if (particle.y < -8) particle.y = height + 8;
      if (particle.y > height + 8) particle.y = -8;
    }

    draw();
    frameId = window.requestAnimationFrame(animate);
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' && !reducedMotion) {
      pointer = { x: event.clientX, y: event.clientY };
    }
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    pointer = null;
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    if (reducedMotion) return;

    for (const particle of particles) {
      const offsetX = particle.x - event.clientX;
      const offsetY = particle.y - event.clientY;
      const distance = Math.hypot(offsetX, offsetY);
      if (distance >= repelRadius) continue;

      const angle = distance ? Math.atan2(offsetY, offsetX) : Math.random() * Math.PI * 2;
      const force = (1 - distance / repelRadius) * (260 + Math.random() * 180);
      particle.velocityX += Math.cos(angle) * force;
      particle.velocityY += Math.sin(angle) * force;
    }

    if (!frameId && !document.hidden) frameId = window.requestAnimationFrame(animate);
  }, { passive: true });

  window.addEventListener('resize', resize, { passive: true });
  motionPreference.addEventListener('change', (event) => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      draw();
    } else if (!document.hidden && !frameId) {
      previousTime = 0;
      frameId = window.requestAnimationFrame(animate);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !reducedMotion && !frameId) {
      previousTime = 0;
      frameId = window.requestAnimationFrame(animate);
    }
  });

  resize();
  if (!reducedMotion) frameId = window.requestAnimationFrame(animate);
})();