export type SoundCue = 'archer' | 'cannon' | 'magic' | 'explosion' | 'death' | 'purchase' | 'upgrade' | 'victory' | 'defeat';

const tones: Record<SoundCue, readonly number[]> = {
  archer: [880, 330], cannon: [110, 40], magic: [440, 880], explosion: [65, 25],
  death: [240, 90], purchase: [523, 659], upgrade: [523, 659, 784],
  victory: [523, 659, 784, 1047], defeat: [330, 262, 196],
};

export class GameAudio {
  volume = 0.35;
  muted = false;
  private context?: AudioContext;
  private master?: GainNode;
  private voices = new Set<OscillatorNode>();
  private lastPlayed = new Map<SoundCue, number>();
  private disposed = false;

  constructor(private createContext: () => AudioContext = () => new AudioContext()) {}

  async unlock() {
    if (this.disposed) return;
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.applyVolume();
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* Audio is optional; unavailable devices must not stop the game. */ }
  }

  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    this.applyVolume();
  }

  setMuted(value: boolean) {
    this.muted = value;
    if (value) this.stopAll();
    this.applyVolume();
  }

  private applyVolume() {
    try { if (this.master) this.master.gain.value = this.muted ? 0 : this.volume; } catch { /* Device disconnected. */ }
  }

  play(cue: SoundCue) {
    const context = this.context;
    if (this.disposed || this.muted || this.volume === 0 || !context || !this.master || context.state !== 'running') return;
    const now = context.currentTime;
    if (now - (this.lastPlayed.get(cue) ?? -1) < 0.06) return;
    this.lastPlayed.set(cue, now);
    const notes = tones[cue];
    const melodic = cue === 'purchase' || cue === 'upgrade' || cue === 'victory' || cue === 'defeat';
    try {
      for (let i = 0; i < (melodic ? notes.length : 1); i++) {
        if (this.voices.size >= 12) break;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + i * 0.09;
        const duration = cue === 'explosion' ? 0.32 : melodic ? 0.2 : 0.1;
        oscillator.type = cue === 'cannon' || cue === 'explosion' ? 'sawtooth' : 'triangle';
        oscillator.frequency.setValueAtTime(notes[i], start);
        if (!melodic) oscillator.frequency.exponentialRampToValueAtTime(notes[1], start + duration);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(cue === 'explosion' ? 0.12 : 0.18, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(gain);
        gain.connect(this.master);
        this.voices.add(oscillator);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
      }
    } catch { this.stopAll(); }
  }

  stopAll() {
    for (const voice of this.voices) {
      try { voice.stop(); voice.disconnect(); } catch { /* Already ended. */ }
    }
    this.voices.clear();
    this.lastPlayed.clear();
  }

  dispose() {
    this.disposed = true;
    this.stopAll();
    try { void this.context?.close().catch(() => {}); } catch { /* Already closed. */ }
  }
}
