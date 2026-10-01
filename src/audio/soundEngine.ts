// Procedural Web Audio API sound generator for Winter Snowball Fight
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private sharedNoiseBuffer: AudioBuffer | null = null;

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      // Pre-allocate 1-second reusable white noise buffer once
      const bufferSize = this.ctx.sampleRate;
      this.sharedNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } catch {
      // Audio context not available or blocked by autoplay
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.volume;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.value = this.volume;
    }
  }

  // Fast reusable noise buffer getter
  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.sharedNoiseBuffer && this.ctx) {
      const bufferSize = this.ctx.sampleRate;
      this.sharedNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    return this.sharedNoiseBuffer;
  }

  // Throw whoosh sound
  public playThrow(charge: number = 0) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400 + charge * 300, now);
    filter.frequency.exponentialRampToValueAtTime(1400 + charge * 600, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35 + charge * 0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.28);
  }

  // Snowball impact sound (fluffy splat or heavy thud)
  public playImpact(isCritical: boolean = false, isSnowCover: boolean = false) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Noise component (snow splat)
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isCritical ? 1800 : 700, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.23);

    // Tone component for punchy hit
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = isCritical ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isCritical ? 260 : (isSnowCover ? 120 : 160), now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);

    oscGain.gain.setValueAtTime(isCritical ? 0.45 : 0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);

    // If critical headshot, add a crisp metallic "ding!" (knocking off hat/bucket)
    if (isCritical) {
      const bell = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(1200, now);
      bell.frequency.exponentialRampToValueAtTime(950, now + 0.25);
      bellGain.gain.setValueAtTime(0.2, now);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      bell.connect(bellGain);
      bellGain.connect(this.masterGain);
      bell.start(now);
      bell.stop(now + 0.35);
    }
  }

  // Dash / Dodge swoosh
  public playDash() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Powerup collection chime
  public playPowerup() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const time = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(time);
      osc.stop(time + 0.36);
    });
  }

  // Snowball crafting / sculpting pat sound
  public playSculpt(progress: number = 0) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350 + progress * 600, now);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.09 + progress * 0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.11);
  }

  // Footstep crunch on snow
  public playFootstep() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 + Math.random() * 400, now);
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.09);
  }

  // Victory fanfare
  public playVictory() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const notes = [
      { f: 440, d: 0.15 },
      { f: 554.37, d: 0.15 },
      { f: 659.25, d: 0.18 },
      { f: 880, d: 0.45 },
    ];
    let start = this.ctx.currentTime;
    notes.forEach(note => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, start);

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.d);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + note.d);
      start += note.d * 0.9;
    });
  }

  // Defeat sound
  public playDefeat() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.6);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  // Ice skating slide sound
  public playIceSkate() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.linearRampToValueAtTime(1400, now + 0.16);
    filter.Q.value = 4.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.19);
  }

  // Sparkling festive coin collection sound
  public playCoin() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const notes = [987.77, 1318.51, 1567.98]; // B5, E6, G6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.07;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  // --- FESTIVE CHRISTMAS BACKGROUND MUSIC (JINGLE BELLS CHIME & MUSIC BOX) ---
  private bgmGain: GainNode | null = null;
  private isBgmActive: boolean = false;
  private bgmTimeoutId: any = null;

  public startBgm() {
    if (this.isBgmActive) return;
    this.resume();
    if (!this.ctx) return;

    this.isBgmActive = true;
    if (!this.bgmGain) {
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.isMuted ? 0 : 0.22;
      this.bgmGain.connect(this.ctx.destination);
    }

    this.playNextBgmLoop();
  }

  public stopBgm() {
    this.isBgmActive = false;
    if (this.bgmTimeoutId) {
      clearTimeout(this.bgmTimeoutId);
      this.bgmTimeoutId = null;
    }
  }

  public toggleBgm(): boolean {
    if (this.isBgmActive) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  }

  public isBgmRunning(): boolean {
    return this.isBgmActive;
  }

  private playNextBgmLoop() {
    if (!this.isBgmActive || !this.ctx || !this.bgmGain) return;

    const now = this.ctx.currentTime;
    const tempo = 0.24; // Quarter note beat in seconds

    // Jingle Bells Holiday melody notes { f: Hz, d: duration, p: pause }
    const melody = [
      // Jin-gle bells, jin-gle bells,
      { f: 659.25, d: 0.2, b: 1 },
      { f: 659.25, d: 0.2, b: 1 },
      { f: 659.25, d: 0.45, b: 2 },
      { f: 659.25, d: 0.2, b: 1 },
      { f: 659.25, d: 0.2, b: 1 },
      { f: 659.25, d: 0.45, b: 2 },
      // Jin-gle all the way!
      { f: 659.25, d: 0.2, b: 1 },
      { f: 783.99, d: 0.2, b: 1 },
      { f: 523.25, d: 0.2, b: 1 },
      { f: 587.33, d: 0.2, b: 1 },
      { f: 659.25, d: 0.7, b: 3 },
      { f: 0, d: 0.1, b: 1 }, // rest
      // Oh what fun it is to ride,
      { f: 698.46, d: 0.2, b: 1 },
      { f: 698.46, d: 0.2, b: 1 },
      { f: 698.46, d: 0.25, b: 1 },
      { f: 698.46, d: 0.2, b: 1 },
      { f: 698.46, d: 0.2, b: 1 },
      // In a one-horse o-pen sleigh, hey!
      { f: 659.25, d: 0.2, b: 1 },
      { f: 659.25, d: 0.2, b: 1 },
      { f: 659.25, d: 0.2, b: 1 },
      { f: 783.99, d: 0.2, b: 1 },
      { f: 783.99, d: 0.2, b: 1 },
      { f: 698.46, d: 0.2, b: 1 },
      { f: 587.33, d: 0.2, b: 1 },
      { f: 523.25, d: 0.7, b: 3 },
      { f: 0, d: 0.1, b: 1 }, // rest
    ];

    let cursor = now + 0.05;
    let totalBeats = 0;

    melody.forEach((note) => {
      const beatLen = note.b * tempo;
      totalBeats += note.b;

      if (note.f > 0 && !this.isMuted) {
        // Celesta Bell primary oscillator
        const osc = this.ctx!.createOscillator();
        const osc2 = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, cursor);

        // Warm harmonic chime overtone
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(note.f * 2.0, cursor);

        gain.gain.setValueAtTime(0, cursor);
        gain.gain.linearRampToValueAtTime(0.18, cursor + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, cursor + note.d * 1.4);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.bgmGain!);

        osc.start(cursor);
        osc2.start(cursor);
        osc.stop(cursor + note.d * 1.5);
        osc2.stop(cursor + note.d * 1.5);

        // Soft sleigh-bell chime on key beats
        if (Math.random() < 0.65) {
          this.playSleighBell(cursor);
        }
      }

      cursor += beatLen;
    });

    const loopDurationMs = totalBeats * tempo * 1000;
    this.bgmTimeoutId = setTimeout(() => {
      if (this.isBgmActive) {
        this.playNextBgmLoop();
      }
    }, loopDurationMs - 100);
  }

  // Soft metallic sleigh bell chime
  private playSleighBell(time: number) {
    if (!this.ctx || !this.bgmGain || this.isMuted) return;

    const freqs = [2400, 3100, 4200];
    freqs.forEach((fr) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fr + Math.random() * 50, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.035, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.09);

      osc.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(time);
      osc.stop(time + 0.1);
    });
  }
}

export const sounds = new SoundEngine();
