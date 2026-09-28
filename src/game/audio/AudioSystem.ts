import type { AudioConfig, MapMusicConfig } from '../../data/types';
import type { GameSettings, SettingsStore } from '../../data/settings';
import { distanceXZ, engineFrequency, groanVolume, pickGroanVoices } from './AudioLogic';

type WeaponSfx = 'machinegun' | 'shotgun' | 'rockets';

/** The second drone oscillator's frequency ratio to the first, picked per mood. */
const MOOD_RATIO: Record<MapMusicConfig['mood'], number> = {
  calm: 1.5, // a plain, restful fifth
  tense: 1.2, // a minor third reads as uneasy
  dread: 1.414, // a tritone, as ominous as a two-oscillator drone gets
};

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(
    1,
    Math.max(1, Math.floor(ctx.sampleRate * seconds)),
    ctx.sampleRate
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * G3: procedural placeholder audio (no asset pipeline yet, I2) built on the Web Audio API.
 * Every sound is synthesized, matching the rest of the game's placeholder-art philosophy (I12).
 * All the *decisions* (what pitch, what volume, which voices play) live in the pure, tested
 * AudioLogic.ts; this class only owns the actual nodes.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private skidSource: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;
  private flameSource: AudioBufferSourceNode | null = null;
  private flameGain: GainNode | null = null;
  private groanVoices: { osc: OscillatorNode; gain: GainNode }[] = [];
  private readonly groanScratch: { distance: number }[] = [];
  private musicOscA: OscillatorNode | null = null;
  private musicOscB: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private currentMusicKey: string | null = null;
  private pendingMusic: MapMusicConfig | null = null;
  private pendingVolumes: GameSettings;

  constructor(
    private readonly cfg: AudioConfig,
    settings: SettingsStore
  ) {
    this.pendingVolumes = settings.get();
    settings.onChange((s) => this.applyVolumes(s));
  }

  /** Must be called from a user gesture (browsers block audio otherwise); safe to call many times. */
  resume(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return; // no Web Audio support: the game stays fully playable, just silent
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes(this.pendingVolumes);
      this.buildLoopedNodes();
      if (this.pendingMusic) this.startMusic(this.pendingMusic);
    }
    void this.ctx.resume();
  }

  private applyVolumes(s: GameSettings): void {
    this.pendingVolumes = s;
    const now = this.ctx?.currentTime ?? 0;
    this.master?.gain.setTargetAtTime(s.masterVolume, now, 0.05);
    this.musicBus?.gain.setTargetAtTime(s.musicVolume, now, 0.05);
    this.sfxBus?.gain.setTargetAtTime(s.sfxVolume, now, 0.05);
  }

  private buildLoopedNodes(): void {
    const ctx = this.ctx!;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineGain).connect(this.sfxBus!);
    this.engineOsc.start();

    const skidBuffer = noiseBuffer(ctx, 1);
    this.skidSource = ctx.createBufferSource();
    this.skidSource.buffer = skidBuffer;
    this.skidSource.loop = true;
    this.skidGain = ctx.createGain();
    this.skidGain.gain.value = 0;
    const skidFilter = ctx.createBiquadFilter();
    skidFilter.type = 'highpass';
    skidFilter.frequency.value = 900;
    this.skidSource.connect(skidFilter).connect(this.skidGain).connect(this.sfxBus!);
    this.skidSource.start();

    const flameBuffer = noiseBuffer(ctx, 1);
    this.flameSource = ctx.createBufferSource();
    this.flameSource.buffer = flameBuffer;
    this.flameSource.loop = true;
    this.flameGain = ctx.createGain();
    this.flameGain.gain.value = 0;
    const flameFilter = ctx.createBiquadFilter();
    flameFilter.type = 'lowpass';
    flameFilter.frequency.value = 1400;
    this.flameSource.connect(flameFilter).connect(this.flameGain).connect(this.sfxBus!);
    this.flameSource.start();

    for (let i = 0; i < this.cfg.zombieGroan.maxVoices; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55 + Math.random() * 25;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(this.sfxBus!);
      osc.start();
      this.groanVoices.push({ osc, gain });
    }
  }

  /** Engine pitch/level from the car's own speed (G3). Call once per Playing tick. */
  setEngine(speedFraction: number, nitroBoosting: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const freq = engineFrequency(speedFraction, this.cfg.engine, nitroBoosting);
    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(freq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(0.1 + 0.05 * speedFraction, now, 0.1);
  }

  /** Silences the engine/skid/flame loops when the car isn't being driven (menus, garage). */
  stopEngine(): void {
    const now = this.ctx?.currentTime ?? 0;
    this.engineGain?.gain.setTargetAtTime(0, now, 0.1);
    this.skidGain?.gain.setTargetAtTime(0, now, 0.1);
  }

  setSkid(active: boolean): void {
    if (!this.ctx || !this.skidGain) return;
    this.skidGain.gain.setTargetAtTime(active ? 0.2 : 0, this.ctx.currentTime, 0.05);
  }

  setFlame(active: boolean): void {
    if (!this.ctx || !this.flameGain) return;
    this.flameGain.gain.setTargetAtTime(active ? 0.25 : 0, this.ctx.currentTime, 0.05);
  }

  /** A thump scaled 0..1 by hit strength: a zombie attack landing, or the car ramming one. */
  impact(strength: number): void {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 90;
    const gain = ctx.createGain();
    const level = 0.15 + 0.3 * Math.min(1, strength);
    gain.gain.setValueAtTime(level, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(this.sfxBus);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  weaponFire(kind: WeaponSfx): void {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = kind === 'machinegun' ? 1100 : kind === 'shotgun' ? 500 : 140;
    osc.type = kind === 'rockets' ? 'sawtooth' : 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + (kind === 'rockets' ? 0.3 : 0.06)
    );
    osc.connect(gain).connect(this.sfxBus);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  /**
   * Distance-falloff groans (G3): call once per Playing tick with the whole zombie pool (a plain
   * iterable, so `pool.active()`'s generator can be passed straight through) and the car's
   * position. Gathers nearby zombies in one pass into a reused scratch array - H1's profiling
   * pass found the previous call site building four whole-pool arrays here every tick.
   */
  updateZombieGroans(
    zombies: Iterable<{ alive: boolean; x: number; z: number }>,
    carX: number,
    carZ: number
  ): void {
    if (!this.ctx) return;
    const maxDistance = this.cfg.zombieGroan.maxDistance;
    this.groanScratch.length = 0;
    for (const z of zombies) {
      if (!z.alive) continue;
      const distance = distanceXZ(z.x, z.z, carX, carZ);
      if (distance <= maxDistance) this.groanScratch.push({ distance });
    }
    const now = this.ctx.currentTime;
    const picked = pickGroanVoices(this.groanScratch, this.groanVoices.length);
    for (let i = 0; i < this.groanVoices.length; i++) {
      const target = picked[i];
      const gain = target
        ? 0.18 * groanVolume(target.distance, this.cfg.zombieGroan.maxDistance)
        : 0;
      this.groanVoices[i].gain.gain.setTargetAtTime(gain, now, 0.3);
    }
  }

  /** Crossfades to this map's ambient drone; a no-op if it's already playing. Remembered even
   * before the audio context exists (the first user gesture), and applied once it does. */
  playMapMusic(music: MapMusicConfig): void {
    this.pendingMusic = music;
    if (this.ctx) this.startMusic(music);
  }

  private startMusic(music: MapMusicConfig): void {
    if (!this.ctx || !this.musicBus) return;
    const key = `${music.baseHz}:${music.mood}`;
    if (key === this.currentMusicKey) return;
    this.currentMusicKey = key;
    const ctx = this.ctx;

    this.musicOscA?.stop();
    this.musicOscB?.stop();
    this.musicGain?.disconnect();

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.musicBus);
    const a = ctx.createOscillator();
    a.type = 'sine';
    a.frequency.value = music.baseHz;
    const b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.value = music.baseHz * MOOD_RATIO[music.mood];
    a.connect(gain);
    b.connect(gain);
    a.start();
    b.start();
    gain.gain.setTargetAtTime(0.06, ctx.currentTime, 1.5);
    this.musicOscA = a;
    this.musicOscB = b;
    this.musicGain = gain;
  }

  menuClick(): void {
    this.blip(220, 0.05);
  }

  menuHover(): void {
    this.blip(440, 0.03);
  }

  private blip(freq: number, gainLevel: number): void {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(this.sfxBus);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }
}
