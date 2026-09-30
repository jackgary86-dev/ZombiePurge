import { describe, it, expect, beforeEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/data/config';
import { Wallet } from '../../src/game/economy';
import { Garage } from '../../src/game/shop';
import {
  categoryZoneOccupant,
  nearestOccupiedZone,
  nearestValidEmptyZone,
  zoneAccepts,
  zoneOccupant,
} from '../../src/game/garageScene/SnapZones';
import type { SnapZoneDef } from '../../src/data/types';

const ROOF: SnapZoneDef = { id: 'roof', slot: 'roof', offset: { x: 0, y: 0.8, z: 0.2 }, radius: 1 };
const ARMOR: SnapZoneDef = {
  id: 'armor_left',
  category: 'armor',
  offset: { x: -0.9, y: 0, z: 0 },
  radius: 1,
};

describe('R3 zone coverage (acceptance criteria: every category has at least one zone)', () => {
  beforeEach(() => resetConfig());

  it('every upgrade in the real catalog is accepted by at least one real zone', () => {
    const cfg = getConfig();
    for (const upgrade of cfg.upgrades) {
      const part = { id: upgrade.id, slot: upgrade.slot, category: upgrade.category };
      const accepted = cfg.snapZones.some((zone) => zoneAccepts(zone, part));
      expect(accepted, `no snap zone accepts "${upgrade.id}" (${upgrade.category})`).toBe(true);
    }
  });
});

describe('R3 zone acceptance', () => {
  it('a slotted zone only accepts a part whose own slot matches', () => {
    expect(zoneAccepts(ROOF, { id: 'machinegun', slot: 'roof' })).toBe(true);
    expect(zoneAccepts(ROOF, { id: 'flamethrower', slot: 'front' })).toBe(false);
  });

  it('a category zone only accepts a part whose own category matches', () => {
    expect(zoneAccepts(ARMOR, { id: 'armor', category: 'armor' })).toBe(true);
    expect(zoneAccepts(ARMOR, { id: 'tires', category: 'tires' })).toBe(false);
  });

  it('a part the catalog has no info for never matches any zone', () => {
    expect(zoneAccepts(ROOF, { id: 'unknown' })).toBe(false);
    expect(zoneAccepts(ARMOR, { id: 'unknown' })).toBe(false);
  });

  it('categoryZoneOccupant reads the category name as the installed id', () => {
    expect(categoryZoneOccupant(ARMOR, [])).toBeNull();
    expect(categoryZoneOccupant(ARMOR, ['armor'])).toBe('armor');
    expect(categoryZoneOccupant(ARMOR, ['tires'])).toBeNull();
  });
});

describe('R3 zone occupancy + proximity', () => {
  let garage: Garage;
  let wallet: Wallet;

  beforeEach(() => {
    resetConfig();
    wallet = new Wallet(getConfig().rewards, null);
    garage = new Garage(getConfig().upgrades, wallet, 1, null);
  });

  it('a slotted zone defers to Garage.equippedIn, not the installed list', () => {
    wallet.add(10000);
    garage.buy('machinegun'); // auto-equips to 'roof' on first purchase
    expect(zoneOccupant(ROOF, garage, [])).toBe('machinegun');
    garage.unequip('roof');
    expect(zoneOccupant(ROOF, garage, [])).toBeNull();
  });

  it('a category zone defers to the installed list', () => {
    expect(zoneOccupant(ARMOR, garage, [])).toBeNull();
    expect(zoneOccupant(ARMOR, garage, ['armor'])).toBe('armor');
  });

  it('finds the nearest empty zone that accepts the carried part, skipping occupied ones', () => {
    const world = [{ zone: ARMOR, x: -0.9, z: 0 }];
    const part = { id: 'armor', category: 'armor' as const };
    expect(nearestValidEmptyZone(part, world, garage, [], -0.9, 0, 1)?.id).toBe('armor_left');
    expect(nearestValidEmptyZone(part, world, garage, ['armor'], -0.9, 0, 1)).toBeNull();
  });

  it('never proposes a zone that does not accept the carried part, however close', () => {
    const world = [{ zone: ARMOR, x: 0, z: 0 }];
    const wrongPart = { id: 'tires', category: 'tires' as const };
    expect(nearestValidEmptyZone(wrongPart, world, garage, [], 0, 0, 5)).toBeNull();
  });

  it('finds the nearest occupied zone regardless of category, for picking a part back up', () => {
    const world = [
      { zone: ROOF, x: 0, z: 0.2 },
      { zone: ARMOR, x: -0.9, z: 0 },
    ];
    wallet.add(10000);
    garage.buy('machinegun');
    expect(nearestOccupiedZone(world, garage, [], 0, 0.2, 1)?.occupantId).toBe('machinegun');
    expect(nearestOccupiedZone(world, garage, ['armor'], -0.9, 0, 1)?.occupantId).toBe('armor');
  });

  it('returns null when nothing occupied is in range', () => {
    const world = [{ zone: ARMOR, x: -0.9, z: 0 }];
    expect(nearestOccupiedZone(world, garage, [], -0.9, 0, 1)).toBeNull();
  });
});
