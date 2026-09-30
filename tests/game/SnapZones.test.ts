import { describe, it, expect, beforeEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/data/config';
import { Wallet } from '../../src/game/economy';
import { Garage } from '../../src/game/shop';
import {
  categoryZoneOccupant,
  nearestOccupiedZone,
  nearestValidEmptyZone,
  nearestValidOccupiedZone,
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
    expect(nearestValidEmptyZone(part, world, garage, [], -0.9, 0)?.id).toBe('armor_left');
    expect(nearestValidEmptyZone(part, world, garage, ['armor'], -0.9, 0)).toBeNull();
  });

  it('never proposes a zone that does not accept the carried part, however close', () => {
    const world = [{ zone: ARMOR, x: 0, z: 0 }];
    const wrongPart = { id: 'tires', category: 'tires' as const };
    expect(nearestValidEmptyZone(wrongPart, world, garage, [], 0, 0)).toBeNull();
  });

  it('finds the nearest occupied zone regardless of category, for picking a part back up', () => {
    const world = [
      { zone: ROOF, x: 0, z: 0.2 },
      { zone: ARMOR, x: -0.9, z: 0 },
    ];
    wallet.add(10000);
    garage.buy('machinegun');
    expect(nearestOccupiedZone(world, garage, [], 0, 0.2)?.occupantId).toBe('machinegun');
    expect(nearestOccupiedZone(world, garage, ['armor'], -0.9, 0)?.occupantId).toBe('armor');
  });

  it('returns null when nothing occupied is in range', () => {
    const world = [{ zone: ARMOR, x: -0.9, z: 0 }];
    expect(nearestOccupiedZone(world, garage, [], -0.9, 0)).toBeNull();
  });

  it('bug found in verification: a zone’s own radius gates reach, not one blanket distance', () => {
    // A wheel zone (radius 0.6 in the real config) accepts tires from close up, but a much
    // larger radius (like the roof/front mounts' 0.9) would wrongly still match at the same
    // distance if every zone shared one flat range instead of its own configured radius.
    const smallZone: SnapZoneDef = {
      id: 'wheel_fl',
      category: 'tires',
      offset: { x: 0, y: 0, z: 0 },
      radius: 0.3,
    };
    const world = [{ zone: smallZone, x: 0, z: 0 }];
    const part = { id: 'tires', category: 'tires' as const };
    expect(nearestValidEmptyZone(part, world, garage, [], 0, 0.2)?.id).toBe('wheel_fl'); // inside 0.3
    expect(nearestValidEmptyZone(part, world, garage, [], 0, 0.5)).toBeNull(); // outside 0.3
  });
});

describe('R4 multi-mount parts and swapping', () => {
  const REAR: SnapZoneDef = {
    id: 'rear_weapon',
    slot: 'rear',
    offset: { x: 0, y: 0.6, z: -2.1 },
    radius: 1,
  };
  let garage: Garage;
  let wallet: Wallet;

  beforeEach(() => {
    resetConfig();
    wallet = new Wallet(getConfig().rewards, null);
    garage = new Garage(getConfig().upgrades, wallet, 1, null);
  });

  it('validSlots lets a part accept a zone beyond its own default slot', () => {
    expect(zoneAccepts(REAR, { id: 'machinegun', slot: 'roof' })).toBe(false); // no validSlots
    expect(
      zoneAccepts(REAR, { id: 'machinegun', slot: 'roof', validSlots: ['roof', 'front', 'rear'] })
    ).toBe(true);
    expect(
      zoneAccepts(ROOF, { id: 'machinegun', slot: 'roof', validSlots: ['roof', 'front', 'rear'] })
    ).toBe(true); // its own default slot still matches too
  });

  it('nearestValidOccupiedZone finds a zone the part accepts that something else already holds', () => {
    wallet.add(10000);
    garage.buy('machinegun'); // auto-equips to 'roof'
    const world = [{ zone: ROOF, x: 0, z: 0.2 }];
    const rockets = { id: 'rockets', slot: 'roof' as const };
    const found = nearestValidOccupiedZone(rockets, world, garage, [], 0, 0.2);
    expect(found?.occupantId).toBe('machinegun');
  });

  it('never proposes swapping a part into a zone that already holds itself', () => {
    wallet.add(10000);
    garage.buy('machinegun');
    const world = [{ zone: ROOF, x: 0, z: 0.2 }];
    const sameId = { id: 'machinegun', slot: 'roof' as const };
    expect(nearestValidOccupiedZone(sameId, world, garage, [], 0, 0.2)).toBeNull();
  });

  it('never proposes a swap into a zone the part is not accepted by', () => {
    wallet.add(10000);
    garage.buy('machinegun');
    const world = [{ zone: ROOF, x: 0, z: 0.2 }];
    const tires = { id: 'tires', category: 'tires' as const };
    expect(nearestValidOccupiedZone(tires, world, garage, [], 0, 0.2)).toBeNull();
  });
});
