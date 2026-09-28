import { describe, it, expect } from 'vitest';
import { SlowMo } from '../../src/game/vfx/SlowMo';
import type { SlowMoConfig } from '../../src/data/types';

const CFG: SlowMoConfig = {
  multiKillThreshold: 3,
  timeScale: 0.4,
  holdSeconds: 0.2,
  rampSeconds: 0.4,
};

describe('SlowMo (G2)', () => {
  it('does nothing below the multi-kill threshold', () => {
    const slow = new SlowMo(CFG);
    slow.trigger(2);
    expect(slow.active).toBe(false);
    expect(slow.update(0.016)).toBe(1);
  });

  it('drops to the configured time scale on a multi-kill and holds it', () => {
    const slow = new SlowMo(CFG);
    slow.trigger(3);
    expect(slow.active).toBe(true);
    expect(slow.update(0.05)).toBe(CFG.timeScale);
    expect(slow.update(0.1)).toBe(CFG.timeScale); // still within holdSeconds (0.2)
  });

  it('ramps back up to normal speed after the hold ends, then stays at 1', () => {
    const slow = new SlowMo(CFG);
    slow.trigger(5);
    slow.update(CFG.holdSeconds); // consume the whole hold
    const midRamp = slow.update(CFG.rampSeconds / 2);
    expect(midRamp).toBeGreaterThan(CFG.timeScale);
    expect(midRamp).toBeLessThan(1);
    slow.update(CFG.rampSeconds); // well past the ramp
    expect(slow.update(0.016)).toBe(1);
    expect(slow.active).toBe(false);
  });

  it('a later multi-kill re-triggers even mid-ramp', () => {
    const slow = new SlowMo(CFG);
    slow.trigger(3);
    slow.update(CFG.holdSeconds + CFG.rampSeconds / 2); // now mid-ramp
    slow.trigger(4);
    expect(slow.update(0.001)).toBe(CFG.timeScale);
  });
});
