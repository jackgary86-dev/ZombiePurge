import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSandboxOptions,
  sanitizeSandbox,
  sanitizeSettings,
  saveSandboxOptions,
  SETTINGS_STORAGE_KEY,
  SettingsStore,
  type SettingsStorage,
} from '../../src/data/settings';

class MemoryStorage implements SettingsStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('J10 settings store', () => {
  it('starts from defaults, persists changes, and notifies listeners', () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
    const seen: number[] = [];
    store.onChange((s) => seen.push(s.masterVolume));
    store.set({ masterVolume: 0.3, lowGore: true });
    expect(seen).toEqual([0.3]);
    const again = new SettingsStore(storage);
    expect(again.get().masterVolume).toBe(0.3);
    expect(again.get().lowGore).toBe(true);
    again.reset();
    expect(again.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps out-of-range values and ignores junk or outdated saves', () => {
    expect(
      sanitizeSettings({
        masterVolume: 7,
        drawDistanceScale: 0.1,
        cameraSensitivity: 99,
        graphicsQuality: 'ultra' as never,
      })
    ).toMatchObject({
      masterVolume: 1,
      drawDistanceScale: 0.5,
      cameraSensitivity: 3,
      graphicsQuality: 'medium',
    });
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, '{nope');
    expect(new SettingsStore(storage).get()).toEqual(DEFAULT_SETTINGS);
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 0, masterVolume: 0.1 }));
    expect(new SettingsStore(storage).get().masterVolume).toBe(DEFAULT_SETTINGS.masterVolume);
  });
});

describe('F1 sandbox options', () => {
  it('falls back to a known map and clamps density', () => {
    expect(
      sanitizeSandbox({ mapId: 'nope', zombieDensity: 4, noFail: 1 as never }, [
        'greybox',
        'openfield',
      ])
    ).toEqual({
      mapId: 'greybox',
      zombieDensity: 1,
      night: false,
      infiniteMoney: false,
      noFail: true,
    });
  });

  it('round-trips through storage', () => {
    const storage = new MemoryStorage();
    saveSandboxOptions(
      { mapId: 'openfield', zombieDensity: 0.4, night: true, infiniteMoney: true, noFail: false },
      storage
    );
    expect(loadSandboxOptions(['greybox', 'openfield'], storage)).toMatchObject({
      zombieDensity: 0.4,
      night: true,
      infiniteMoney: true,
    });
    storage.setItem('zombiepurge.sandbox', 'garbage');
    expect(loadSandboxOptions(['greybox'], storage).mapId).toBe('greybox');
  });
});
