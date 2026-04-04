class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = false;

  constructor() {
    // Lazy init on first user interaction usually, but we can set up the structure
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Low volume default
      this.enabled = true;
    } catch (e) {
      console.warn("AudioContext not supported");
    }
  }

  setEnabled(on: boolean) {
    if (on && !this.ctx) this.init();
    this.enabled = on;
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol: number = 1) {
    if (!this.enabled || !this.ctx || !this.masterGain) {
        // Try init if not ready (might be blocked by browser policy until click)
        this.init();
        if(!this.enabled) return;
    }
    
    // Safety check for suspended context
    if (this.ctx!.state === 'suspended') {
        this.ctx!.resume();
    }

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

    gain.gain.setValueAtTime(vol, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();
    osc.stop(this.ctx!.currentTime + duration);
  }

  // Preset Sounds
  playClick() {
    this.playTone(800, 'sine', 0.1, 0.5);
  }

  playHover() {
    this.playTone(200, 'sine', 0.05, 0.2);
  }

  playAlert() {
    // Double beep
    this.playTone(440, 'square', 0.1, 0.4);
    setTimeout(() => this.playTone(440, 'square', 0.1, 0.4), 150);
  }

  playTransform() {
    // Mechanical slide
    if (!this.ctx || !this.masterGain) { this.init(); if(!this.ctx) return; }
    
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.frequency.setValueAtTime(100, this.ctx!.currentTime);
    osc.frequency.linearRampToValueAtTime(300, this.ctx!.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.5, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.3);
  }

  playScan() {
    // High pitch random blips
    this.playTone(1200 + Math.random() * 500, 'sine', 0.05, 0.1);
  }

  playJamming() {
      // Noise-like effect (simulated with multiple dissonant oscillators)
      for(let i=0; i<5; i++) {
          this.playTone(100 + Math.random() * 1000, 'sawtooth', 0.5, 0.2);
      }
  }
}

export const soundEngine = new SoundEngine();
