import { describe, it, expect } from 'vitest';
import { ScreenShake } from '../../src/game/vfx/ScreenShake';
import type { ScreenShakeConfig } from '../../src/data/types';

const CFG: ScreenShakeConfig = { perDamage: 0.01, perKill: 0.05, max: 0.5, decayPerSecond: 2 };

describe('ScreenShake (G2)', () => {
  it('accumulates from damage and kills, capped at max', () => {
    const shake = new ScreenShake(CFG);
    expect(shake.current).toBe(0);
    shake.addDamage(10); // +0.1
    expect(shake.current).toBeCloseTo(0.1);
    shake.addKill(); // +0.05
    expect(shake.current).toBeCloseTo(0.15);
    shake.addDamage(1000); // would blow way past max
    expect(shake.current).toBe(CFG.max);
  });

  it('ignores non-positive damage', () => {
    const shake = new ScreenShake(CFG);
    shake.addDamage(0);
    shake.addDamage(-5);
    expect(shake.current).toBe(0);
  });

  it('decays back to zero over time and update() reports the live magnitude', () => {
    const shake = new ScreenShake(CFG);
    shake.addKill(); // 0.05
    expect(shake.update(0.01)).toBeCloseTo(0.05 - CFG.decayPerSecond * 0.01);
    // Enough time passes that it bottoms out at zero, never negative.
    expect(shake.update(10)).toBe(0);
  });
});
