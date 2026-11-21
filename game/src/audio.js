// Neon Rooftop Infiltration — every sound is synthesised live with WebAudio.
// No audio files ship with the game; the drone hum, footsteps, alarm and
// pickup chimes are all oscillators shaped in code.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.humOsc = null;
    this.humGain = null;
    this.alarmOsc = null;
    this.alarmGain = null;
    this.stepFlip = false;
  }

  // Browsers only allow audio after a user gesture; call from a key/click.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startHum();
  }

  startHum() {
    // A low twin-oscillator drone hum whose loudness follows the nearest drone.
    this.humOsc = this.ctx.createOscillator();
    this.humOsc.type = 'sawtooth';
    this.humOsc.frequency.value = 55;
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 110.5;
    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = 0.0;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 320;
    this.humOsc.connect(filt);
    sub.connect(filt);
    filt.connect(this.humGain);
    this.humGain.connect(this.master);
    this.humOsc.start();
    sub.start();
    this.humSub = sub;
  }

  setHum(distance01) {
    if (!this.ctx || !this.humGain) return;
    const target = this.muted ? 0 : 0.015 + 0.06 * (1 - distance01);
    this.humGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
  }

  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  step(sneaking) {
    // Soft alternating footfalls; sneaking is quieter and lower.
    this.stepFlip = !this.stepFlip;
    const f = this.stepFlip ? 190 : 160;
    this.blip(f, 0.07, 'triangle', sneaking ? 0.05 : 0.12, f * 0.6);
  }

  jump() { this.blip(280, 0.16, 'sine', 0.14, 520); }
  land() { this.blip(120, 0.09, 'triangle', 0.16, 70); }
  pickup() {
    this.blip(880, 0.1, 'sine', 0.16);
    setTimeout(() => this.blip(1318, 0.14, 'sine', 0.16), 70);
  }

  alarmStart() {
    if (!this.ctx || this.muted) return;
    if (this.alarmOsc) return;
    const t = this.ctx.currentTime;
    this.alarmOsc = this.ctx.createOscillator();
    this.alarmOsc.type = 'square';
    this.alarmOsc.frequency.value = 620;
    this.alarmGain = this.ctx.createGain();
    this.alarmGain.gain.setValueAtTime(0.0001, t);
    this.alarmGain.gain.exponentialRampToValueAtTime(0.05, t + 0.1);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 2.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(this.alarmOsc.frequency);
    this.alarmOsc.connect(this.alarmGain);
    this.alarmGain.connect(this.master);
    this.alarmOsc.start();
    lfo.start();
    this.alarmLfo = lfo;
  }

  alarmStop() {
    if (!this.alarmOsc) return;
    const t = this.ctx.currentTime;
    this.alarmGain.gain.setTargetAtTime(0.0001, t, 0.08);
    const osc = this.alarmOsc;
    const lfo = this.alarmLfo;
    setTimeout(() => { try { osc.stop(); lfo.stop(); } catch (e) { /* already stopped */ } }, 400);
    this.alarmOsc = null;
    this.alarmLfo = null;
    this.alarmGain = null;
  }

  caught() {
    this.blip(420, 0.5, 'sawtooth', 0.16, 60);
    this.alarmStop();
  }

  clear() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.18, 'sine', 0.15), i * 90);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    if (this.muted) this.alarmStop();
    return this.muted;
  }
}
