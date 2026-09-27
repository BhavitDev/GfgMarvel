/**
 * SoundFX & Procedural Audio Engine for GFG Multiverse
 * Synthesizes cinematic thunder, electric crackle, plasma hum, and shockwave impacts
 * using the Web Audio API without requiring external audio downloads.
 */

class MultiverseAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.hasInitialized = false;
    this.masterGain = null;
    this.ambientGain = null;
    this.droneOsc = null;
    this.lastScrollY = 0;
    this.lastScrollTime = Date.now();
    this.lastStaticTime = 0;
  }

  init() {
    if (this.hasInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startAmbientDrone();
      this.hasInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  toggleMute() {
    if (!this.hasInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 0.5;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    }
    return !this.isMuted;
  }

  playIntroThunder() {
    if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
    const time = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(72, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.7);
    gain.gain.setValueAtTime(0.045, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(time);
    oscillator.stop(time + 0.82);
  }

  playIntroZap() {
    if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
    const time = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(920, time);
    oscillator.frequency.exponentialRampToValueAtTime(260, time + 0.11);
    gain.gain.setValueAtTime(0.035, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(time);
    oscillator.stop(time + 0.17);
  }

  startAmbientDrone() {
    if (!this.ctx) return;
    
    // Low frequency sub drone
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    this.ambientGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(45, this.ctx.currentTime); // 45Hz sub

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(45.6, this.ctx.currentTime); // subtle beat frequency

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, this.ctx.currentTime);

    this.ambientGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    osc1.start();
    osc2.start();
  }

  /**
   * Play an electric spark / arc crackle
   * @param {number} intensity - 0 to 1
   */
  playArcCrackle(intensity = 0.5) {
    if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
    const now = Date.now();
    if (now - this.lastStaticTime < 45) return; // rate limit
    this.lastStaticTime = now;

    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Noise burst with random micro spikes
      const envelope = Math.exp(-i / (bufferSize * 0.4));
      const spike = Math.random() > 0.92 ? (Math.random() * 2 - 1) * 1.5 : (Math.random() * 2 - 1) * 0.3;
      data[i] = spike * envelope;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500 + Math.random() * 3500, this.ctx.currentTime);
    filter.Q.setValueAtTime(4 + intensity * 6, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const gainVal = Math.min(0.25, 0.05 + intensity * 0.2);
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseNode.start();
    noiseNode.stop(this.ctx.currentTime + 0.07);
  }

  /**
   * Play high-voltage rising charge pulse
   * @param {number} progress - scroll sequence progress 0 to 1
   */
  updateChargeHum(progress) {
    if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
    if (this.ambientGain) {
      // Adjust drone intensity and frequency with charge
      const targetGain = 0.06 + progress * 0.18;
      this.ambientGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Climax thunder strike explosion & shockwave
   */
  playThunderStrike() {
    if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;

    // 1. Initial High Voltage Transient Zap
    const zapOsc = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zapOsc.type = 'triangle';
    zapOsc.frequency.setValueAtTime(2400, t);
    zapOsc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    zapGain.gain.setValueAtTime(0.5, t);
    zapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    zapOsc.connect(zapGain);
    zapGain.connect(this.masterGain);
    zapOsc.start(t);
    zapOsc.stop(t + 0.16);

    // 2. Heavy Sub-Bass Kinetic Impact Boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(32, t + 0.8);
    subGain.gain.setValueAtTime(0.8, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 1.7);

    // 3. Rolling Thunder Noise Decay
    const duration = 2.4;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise integration for heavy thunder roll
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      const progress = i / bufferSize;
      const envelope = Math.pow(1 - progress, 2.2);
      data[i] = lastOut * 3.5 * envelope;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(180, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration);
  }

  /**
   * UI Click / Card Hover Audio
   */
  playHoverTick() {
    if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.03);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.035);
  }
}

// Global singleton instance
window.multiverseAudio = new MultiverseAudioEngine();
