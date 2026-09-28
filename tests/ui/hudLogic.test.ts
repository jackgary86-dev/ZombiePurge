import { describe, it, expect } from 'vitest';
import {
  barFraction,
  isLow,
  hpBarState,
  fuelBarState,
  barColor,
  weaponReadout,
} from '../../src/ui/hudLogic';

describe('hudLogic (G1)', () => {
  it('barFraction clamps to 0..1 and treats a zero/negative max as empty', () => {
    expect(barFraction(50, 100)).toBe(0.5);
    expect(barFraction(150, 100)).toBe(1);
    expect(barFraction(-10, 100)).toBe(0);
    expect(barFraction(50, 0)).toBe(0);
  });

  it('isLow compares the fraction against a threshold', () => {
    expect(isLow(20, 100, 0.25)).toBe(true);
    expect(isLow(30, 100, 0.25)).toBe(false);
  });

  it('hpBarState/fuelBarState flag low once at/below the configured threshold', () => {
    expect(hpBarState(25, 100, { lowHpFraction: 0.25 })).toEqual({ fraction: 0.25, low: true });
    expect(hpBarState(26, 100, { lowHpFraction: 0.25 })).toEqual({ fraction: 0.26, low: false });
    expect(fuelBarState(10, 100, { lowFuelFraction: 0.2 }).low).toBe(true);
  });

  it('barColor runs from green (full) to red (empty)', () => {
    expect(barColor(1)).toBe('hsl(120, 75%, 45%)');
    expect(barColor(0)).toBe('hsl(0, 75%, 45%)');
  });

  it('weaponReadout: machine gun shows heat % or OVERHEATED', () => {
    expect(weaponReadout('machinegun', 0.5, false, null, false)).toEqual({
      text: '50%',
      warn: false,
    });
    expect(weaponReadout('machinegun', 1, true, null, false)).toEqual({
      text: 'OVERHEATED',
      warn: true,
    });
  });

  it('weaponReadout: shotgun/rockets show the magazine text and warn while reloading', () => {
    expect(weaponReadout('shotgun', null, false, '4/6', false)).toEqual({
      text: '4/6',
      warn: false,
    });
    expect(weaponReadout('rockets', null, false, 'reloading 1.2s', false)).toEqual({
      text: 'reloading 1.2s',
      warn: true,
    });
  });

  it('weaponReadout: flamethrower shows firing/ready; no weapon is null', () => {
    expect(weaponReadout('flamethrower', null, false, null, true)).toEqual({
      text: 'FIRING',
      warn: false,
    });
    expect(weaponReadout('flamethrower', null, false, null, false)).toEqual({
      text: 'ready',
      warn: false,
    });
    expect(weaponReadout(null, null, false, null, false)).toBeNull();
  });
});
