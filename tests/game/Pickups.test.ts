import { describe, it, expect } from 'vitest';
import { collectPickups, resetPickups, type PickupState } from '../../src/game/world/Pickups';

function spot(kind: PickupState['kind'], x: number, z: number): PickupState {
  return { kind, x, z, taken: false };
}

describe('E9 pickup collection', () => {
  it('collects a pickup within range and marks it taken', () => {
    const spots = [spot('gas', 10, 0)];
    const collected = collectPickups(spots, 8, 0);
    expect(collected).toEqual([spots[0]]);
    expect(spots[0].taken).toBe(true);
  });

  it('leaves a pickup out of range untouched', () => {
    const spots = [spot('repair', 100, 0)];
    const collected = collectPickups(spots, 0, 0);
    expect(collected).toHaveLength(0);
    expect(spots[0].taken).toBe(false);
  });

  it('never collects the same pickup twice', () => {
    const spots = [spot('coins', 0, 0)];
    expect(collectPickups(spots, 0, 0)).toHaveLength(1);
    expect(collectPickups(spots, 0, 0)).toHaveLength(0);
  });

  it('collects several pickups in one step and ignores an already-taken one', () => {
    const spots = [spot('gas', 0, 0), spot('ammo', 3, 0), { ...spot('coins', 0, 0), taken: true }];
    const collected = collectPickups(spots, 0, 0, 5);
    expect(collected.map((p) => p.kind)).toEqual(['gas', 'ammo']);
  });

  it('respects a custom radius', () => {
    const spots = [spot('gas', 6, 0)];
    expect(collectPickups(spots, 0, 0, 5)).toHaveLength(0);
    expect(collectPickups(spots, 0, 0, 7)).toHaveLength(1);
  });

  it('resetPickups puts everything back on the map', () => {
    const spots = [spot('gas', 0, 0), spot('repair', 1, 1)];
    collectPickups(spots, 0, 0, 10);
    expect(spots.every((p) => p.taken)).toBe(true);
    resetPickups(spots);
    expect(spots.every((p) => !p.taken)).toBe(true);
  });
});
