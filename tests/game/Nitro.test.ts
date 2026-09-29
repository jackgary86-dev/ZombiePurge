import { describe, it, expect } from 'vitest';
import { DEFAULT_NITRO, Nitro } from '../../src/game/vehicle';

const DT = 1 / 60;

describe('D13 nitro', () => {
  it('does nothing without the upgrade', () => {
    const n = new Nitro(0);
    n.update(DT, true);
    expect(n.boosting).toBe(false);
    expect(n.accelerationMultiplier).toBe(1);
    expect(n.topSpeedBonus).toBe(0);
    expect(n.fraction).toBe(0); // no capacity to divide by, not NaN/Infinity
  });

  it('a first purchase starts full rather than inheriting a 0/0 fill fraction', () => {
    const n = new Nitro(0);
    n.setCapacity(8);
    expect(n.capacitySeconds).toBe(8);
    expect(n.charge).toBe(8);
    expect(n.fraction).toBe(1);
  });

  it('boosts while held, drains the charge, and stops when empty', () => {
    const n = new Nitro(3);
    let boostedSteps = 0;
    for (let i = 0; i < 60 * 3 + 2; i++) {
      n.update(DT, true);
      if (n.boosting) boostedSteps++;
    }
    expect(boostedSteps).toBeGreaterThanOrEqual(60 * 3 - 2);
    expect(boostedSteps).toBeLessThanOrEqual(60 * 3 + 2);
    expect(n.charge).toBeLessThan(0.01); // at most a step of trickle after the boost died
    expect(n.boosting).toBe(false);
    expect(n.accelerationMultiplier).toBe(1);
    // Still holding the button: it trickles back but can't restart until the threshold.
    for (let i = 0; i < 60 * 2; i++) n.update(DT, true);
    expect(n.boosting).toBe(false);
    expect(n.charge).toBeGreaterThan(0);
    expect(n.charge).toBeLessThan(3 * DEFAULT_NITRO.minStartFraction);
  });

  it('recharges slowly and needs a minimum charge to restart', () => {
    const n = new Nitro(6);
    for (let i = 0; i < 60 * 6; i++) n.update(DT, true);
    expect(n.charge).toBeCloseTo(0, 5);
    for (let i = 0; i < 60 * 4; i++) n.update(DT, false); // 4 s => 0.6 s of charge (10%)
    expect(n.charge).toBeCloseTo(4 * DEFAULT_NITRO.rechargePerSecond, 2);
    n.update(DT, true);
    expect(n.boosting).toBe(false); // below the 25% restart threshold
    for (let i = 0; i < 60 * 8; i++) n.update(DT, false);
    n.update(DT, true);
    expect(n.boosting).toBe(true);
    expect(n.accelerationMultiplier).toBeCloseTo(1 + DEFAULT_NITRO.accelerationBoost);
    expect(n.topSpeedBonus).toBe(DEFAULT_NITRO.topSpeedBoost);
  });

  it('keeps going below the threshold once started, and refills', () => {
    const n = new Nitro(4);
    for (let i = 0; i < 60 * 3.5; i++) n.update(DT, true); // down to 12.5%
    expect(n.boosting).toBe(true);
    n.refill();
    expect(n.fraction).toBe(1);
    n.setCapacity(6);
    expect(n.capacitySeconds).toBe(6);
    expect(n.charge).toBe(6);
  });
});
