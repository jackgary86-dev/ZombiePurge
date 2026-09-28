export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GameSettings {
  version: number;
  graphicsQuality: GraphicsQuality;
  /** Draw/fog distance as a fraction of the map's design distance (0.5..1.5). */
  drawDistanceScale: number;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  lowGore: boolean;
  cameraSensitivity: number;
  invertCameraY: boolean;
  showFps: boolean;
}

export const SETTINGS_VERSION = 1;
export const SETTINGS_STORAGE_KEY = 'zombiepurge.settings';

export const DEFAULT_SETTINGS: GameSettings = {
  version: SETTINGS_VERSION,
  graphicsQuality: 'medium',
  drawDistanceScale: 1,
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.9,
  lowGore: false,
  cameraSensitivity: 1,
  invertCameraY: false,
  showFps: true,
};

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): SettingsStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Clamps every field into its valid range and fills gaps from the defaults. */
export function sanitizeSettings(raw: Partial<GameSettings> | null | undefined): GameSettings {
  const s = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  return {
    version: SETTINGS_VERSION,
    graphicsQuality: ['low', 'medium', 'high'].includes(s.graphicsQuality)
      ? s.graphicsQuality
      : 'medium',
    drawDistanceScale: clamp(Number(s.drawDistanceScale) || 1, 0.5, 1.5),
    masterVolume: clamp(Number(s.masterVolume) || 0, 0, 1),
    musicVolume: clamp(Number(s.musicVolume) || 0, 0, 1),
    sfxVolume: clamp(Number(s.sfxVolume) || 0, 0, 1),
    lowGore: Boolean(s.lowGore),
    cameraSensitivity: clamp(Number(s.cameraSensitivity) || 1, 0.25, 3),
    invertCameraY: Boolean(s.invertCameraY),
    showFps: Boolean(s.showFps),
  };
}

/** J10: persisted player settings with change notifications. */
export class SettingsStore {
  private current: GameSettings;
  private readonly listeners = new Set<(s: GameSettings) => void>();

  constructor(private readonly storage: SettingsStorage | null = defaultStorage()) {
    this.current = this.load();
  }

  get(): GameSettings {
    return this.current;
  }

  set(patch: Partial<GameSettings>): GameSettings {
    this.current = sanitizeSettings({ ...this.current, ...patch });
    this.save();
    for (const l of this.listeners) l(this.current);
    return this.current;
  }

  reset(): GameSettings {
    return this.set({ ...DEFAULT_SETTINGS });
  }

  onChange(listener: (s: GameSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private load(): GameSettings {
    if (!this.storage) return { ...DEFAULT_SETTINGS };
    try {
      const raw = this.storage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      if (parsed.version !== SETTINGS_VERSION) return { ...DEFAULT_SETTINGS };
      return sanitizeSettings(parsed);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private save(): void {
    this.storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.current));
  }
}

/** F1: options chosen on the Sandbox setup screen for one session. */
export interface SandboxOptions {
  mapId: string;
  /** 0..1 fraction of the zombie pool kept alive. */
  zombieDensity: number;
  night: boolean;
  infiniteMoney: boolean;
  /** Free roam: the car can't be wrecked and never runs dry. */
  noFail: boolean;
}

export const DEFAULT_SANDBOX: SandboxOptions = {
  mapId: 'openfield',
  zombieDensity: 1,
  night: false,
  infiniteMoney: false,
  noFail: false,
};

export const SANDBOX_STORAGE_KEY = 'zombiepurge.sandbox';

export function sanitizeSandbox(
  raw: Partial<SandboxOptions> | null | undefined,
  knownMaps: string[]
): SandboxOptions {
  const s = { ...DEFAULT_SANDBOX, ...(raw ?? {}) };
  return {
    mapId: knownMaps.includes(s.mapId) ? s.mapId : (knownMaps[0] ?? DEFAULT_SANDBOX.mapId),
    zombieDensity: clamp(Number(s.zombieDensity) || 0, 0, 1),
    night: Boolean(s.night),
    infiniteMoney: Boolean(s.infiniteMoney),
    noFail: Boolean(s.noFail),
  };
}

export function loadSandboxOptions(
  knownMaps: string[],
  storage: SettingsStorage | null = defaultStorage()
): SandboxOptions {
  try {
    const raw = storage?.getItem(SANDBOX_STORAGE_KEY);
    return sanitizeSandbox(raw ? (JSON.parse(raw) as Partial<SandboxOptions>) : null, knownMaps);
  } catch {
    return sanitizeSandbox(null, knownMaps);
  }
}

export function saveSandboxOptions(
  options: SandboxOptions,
  storage: SettingsStorage | null = defaultStorage()
): void {
  storage?.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(options));
}
