import { describe, it, expect } from 'vitest';
import {
  distanceXZ,
  engineFrequency,
  groanVolume,
  pickGroanVoices,
  skidActive,
} from '../../src/game/audio/AudioLogic';
import type { EngineAudioConfig } from '../../src/data/types';

const ENGINE: EngineAudioConfig = { idleHz: 60, maxHz: 260, nitroPitchBoost: 1.5 };

describe('AudioLogic (G3)', () => {
  it('engineFrequency ramps from idle to max with speed, and boosts with nitro', () => {
    expect(engineFrequency(0, ENGINE, false)).toBe(60);
    expect(engineFrequency(1, ENGINE, false)).toBe(260);
    expect(engineFrequency(0.5, ENGINE, false)).toBeCloseTo(160);
    expect(engineFrequency(1, ENGINE, true)).toBeCloseTo(260 * 1.5);
  });

  it('engineFrequency clamps out-of-range speed fractions', () => {
    expect(engineFrequency(-1, ENGINE, false)).toBe(60);
    expect(engineFrequency(2, ENGINE, false)).toBe(260);
  });

  it('groanVolume falls off linearly to zero at maxDistance', () => {
    expect(groanVolume(0, 40)).toBe(1);
    expect(groanVolume(20, 40)).toBeCloseTo(0.5);
    expect(groanVolume(40, 40)).toBe(0);
    expect(groanVolume(100, 40)).toBe(0);
  });

  it('pickGroanVoices keeps only the closest maxVoices candidates', () => {
    const zombies = [{ distance: 30 }, { distance: 5 }, { distance: 15 }, { distance: 2 }];
    const picked = pickGroanVoices(zombies, 2);
    expect(picked).toEqual([{ distance: 2 }, { distance: 5 }]);
  });

  it('pickGroanVoices tolerates fewer candidates than voices', () => {
    expect(pickGroanVoices([{ distance: 1 }], 4)).toEqual([{ distance: 1 }]);
  });

  it('skidActive requires both the handbrake and enough speed', () => {
    expect(skidActive(10, true, 6)).toBe(true);
    expect(skidActive(2, true, 6)).toBe(false);
    expect(skidActive(10, false, 6)).toBe(false);
  });

  it('distanceXZ ignores height and matches the 2D distance formula', () => {
    expect(distanceXZ(0, 0, 3, 4)).toBeCloseTo(5);
    expect(distanceXZ(10, 10, 10, 10)).toBe(0);
  });
});
