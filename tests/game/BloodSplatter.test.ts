import { describe, it, expect } from 'vitest';
import { BloodSplatterView } from '../../src/game/art/BloodSplatter';
import type { BloodConfig, VehicleConfig } from '../../src/data/types';
import { DEFAULT_CONFIG } from '../../src/data/defaults';

const CFG: BloodConfig = { splattersPerKill: 2, maxSplatters: 5 };
const VEHICLE: VehicleConfig = DEFAULT_CONFIG.vehicle;

describe('BloodSplatterView (G2)', () => {
  it('adds splattersPerKill meshes to its group per kill', () => {
    const blood = new BloodSplatterView(CFG, VEHICLE);
    blood.addKill(false);
    expect(blood.count).toBe(2);
    expect(blood.group.children).toHaveLength(2);
  });

  it('does nothing when low-gore is on', () => {
    const blood = new BloodSplatterView(CFG, VEHICLE);
    blood.addKill(true);
    expect(blood.count).toBe(0);
    expect(blood.group.children).toHaveLength(0);
  });

  it('drops the oldest splatter past maxSplatters', () => {
    const blood = new BloodSplatterView(CFG, VEHICLE);
    for (let i = 0; i < 4; i++) blood.addKill(false); // 8 added, cap is 5
    expect(blood.count).toBe(CFG.maxSplatters);
    expect(blood.group.children).toHaveLength(CFG.maxSplatters);
  });

  it('reset() wipes every splatter', () => {
    const blood = new BloodSplatterView(CFG, VEHICLE);
    blood.addKill(false);
    blood.reset();
    expect(blood.count).toBe(0);
    expect(blood.group.children).toHaveLength(0);
  });
});
