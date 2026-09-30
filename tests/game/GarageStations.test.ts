import { describe, it, expect, beforeEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/data/config';
import { Wallet } from '../../src/game/economy';
import { Garage } from '../../src/game/shop';
import {
  createShoppingState,
  interact,
  layoutStations,
  nearestDropped,
  nearestStation,
  previewInteract,
  type GarageStation,
} from '../../src/game/garageScene/GarageStations';

const BOUNDS = { x: 9, z: 9 };
const INSET = 1.2;

describe('R2 station layout', () => {
  it('places every id exactly once, all inside the room bounds', () => {
    const ids = ['engine', 'tires', 'health', 'armor', 'fuel', 'machinegun', 'shotgun'];
    const stations = layoutStations(ids, BOUNDS, INSET);
    expect(stations.map((s) => s.id).sort()).toEqual([...ids].sort());
    for (const s of stations) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(BOUNDS.x);
      expect(Math.abs(s.z)).toBeLessThanOrEqual(BOUNDS.z);
    }
  });

  it('splits stations across both long walls rather than piling them on one', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `part${i}`);
    const stations = layoutStations(ids, BOUNDS, INSET);
    const farWall = stations.filter((s) => s.z < 0);
    const nearWall = stations.filter((s) => s.z > 0);
    expect(farWall.length).toBeGreaterThan(0);
    expect(nearWall.length).toBeGreaterThan(0);
  });

  it('never crashes on an empty catalog', () => {
    expect(layoutStations([], BOUNDS, INSET)).toEqual([]);
  });

  it('a single id sits centered on one wall, not off to a corner', () => {
    const stations = layoutStations(['engine'], BOUNDS, INSET);
    expect(stations).toHaveLength(1);
    expect(stations[0].x).toBeCloseTo(0);
  });
});

describe('R2 proximity lookups', () => {
  const stations: GarageStation[] = [
    { id: 'a', x: 0, z: -7.8 },
    { id: 'b', x: 5, z: -7.8 },
  ];

  it('finds the nearest station within range', () => {
    expect(nearestStation(0, -7, stations, 1.6)?.id).toBe('a');
  });

  it('returns null when nothing is in range', () => {
    expect(nearestStation(0, 0, stations, 1.6)).toBeNull();
  });

  it('breaks a tie in favour of the first station in list order', () => {
    const tied: GarageStation[] = [
      { id: 'first', x: 1, z: 0 },
      { id: 'second', x: -1, z: 0 },
    ];
    expect(nearestStation(0, 0, tied, 5)?.id).toBe('first');
  });

  it('nearestDropped works the same way for dropped parts', () => {
    const dropped = [{ id: 'x', x: 2, z: 2 }];
    expect(nearestDropped(2, 2.5, dropped, 1)?.id).toBe('x');
    expect(nearestDropped(10, 10, dropped, 1)).toBeNull();
  });
});

describe('R2 buy / pick up / drop interaction', () => {
  let garage: Garage;
  let wallet: Wallet;
  const stations: GarageStation[] = [{ id: 'tires', x: 0, z: -7.8 }];
  const rangeCtx = { avatarX: 0, avatarZ: -7.8, stations, range: 1.6 };

  beforeEach(() => {
    resetConfig();
    wallet = new Wallet(getConfig().rewards, null);
    garage = new Garage(getConfig().upgrades, wallet, 1, null);
  });

  it('buys an unowned part when in range and affordable', () => {
    wallet.add(10000);
    const { state, outcome } = interact(garage, createShoppingState(), rangeCtx);
    expect(outcome).toEqual({ type: 'bought', id: 'tires' });
    expect(garage.ownedTier('tires')).toBe(1);
    expect(state.heldId).toBeNull(); // buying doesn't also carry it - a second press does
  });

  it('is blocked with a reason when coins are short', () => {
    const { outcome } = interact(garage, createShoppingState(), rangeCtx);
    expect(outcome).toEqual({ type: 'blocked', id: 'tires', reason: 'coins' });
    expect(garage.ownedTier('tires')).toBe(0);
  });

  it('picks up an already-owned station part on the next press', () => {
    wallet.add(10000);
    garage.buy('tires');
    const { state, outcome } = interact(garage, createShoppingState(), rangeCtx);
    expect(outcome).toEqual({ type: 'pickedUpFromStation', id: 'tires' });
    expect(state.heldId).toBe('tires');
  });

  it('drops the carried part at the avatar position on the next press, regardless of range', () => {
    const carrying = { heldId: 'tires', dropped: [], installed: [] };
    const farFromAnything = { avatarX: 3, avatarZ: 3, stations, range: 1.6 };
    const { state, outcome } = interact(garage, carrying, farFromAnything);
    expect(outcome).toEqual({ type: 'dropped', id: 'tires' });
    expect(state.heldId).toBeNull();
    expect(state.dropped).toEqual([{ id: 'tires', x: 3, z: 3 }]);
  });

  it('picks a dropped part back up, removing it from the dropped list', () => {
    const onTheGround = { heldId: null, dropped: [{ id: 'tires', x: 3, z: 3 }], installed: [] };
    const { state, outcome } = interact(garage, onTheGround, {
      avatarX: 3,
      avatarZ: 3,
      stations,
      range: 1.6,
    });
    expect(outcome).toEqual({ type: 'pickedUpDropped', id: 'tires' });
    expect(state.heldId).toBe('tires');
    expect(state.dropped).toEqual([]);
  });

  it('carrying always takes priority - never picks up a second part', () => {
    wallet.add(10000);
    garage.buy('tires');
    const carrying = { heldId: 'something-else', dropped: [], installed: [] };
    const { outcome } = interact(garage, carrying, rangeCtx);
    expect(outcome).toEqual({ type: 'dropped', id: 'something-else' });
  });

  it('is a no-op with nothing in range and nothing carried', () => {
    const { state, outcome } = interact(garage, createShoppingState(), {
      avatarX: 100,
      avatarZ: 100,
      stations,
      range: 1.6,
    });
    expect(outcome).toEqual({ type: 'noop' });
    expect(state).toEqual(createShoppingState());
  });
});

describe('R2 interact preview (for the live HUD prompt)', () => {
  let garage: Garage;
  let wallet: Wallet;
  const stations: GarageStation[] = [{ id: 'tires', x: 0, z: -7.8 }];
  const rangeCtx = { avatarX: 0, avatarZ: -7.8, stations, range: 1.6 };

  beforeEach(() => {
    resetConfig();
    wallet = new Wallet(getConfig().rewards, null);
    garage = new Garage(getConfig().upgrades, wallet, 1, null);
  });

  it('previews a buy when unowned and in range', () => {
    expect(previewInteract(garage, createShoppingState(), rangeCtx)).toEqual({
      type: 'buy',
      id: 'tires',
    });
  });

  it('previews a station pickup once owned', () => {
    wallet.add(10000);
    garage.buy('tires');
    expect(previewInteract(garage, createShoppingState(), rangeCtx)).toEqual({
      type: 'pickupStation',
      id: 'tires',
    });
  });

  it('previews a drop whenever something is carried, regardless of range', () => {
    const carrying = { heldId: 'tires', dropped: [], installed: [] };
    const farAway = { avatarX: 100, avatarZ: 100, stations, range: 1.6 };
    expect(previewInteract(garage, carrying, farAway)).toEqual({ type: 'drop', id: 'tires' });
  });

  it('previews picking a dropped part back up', () => {
    const onGround = { heldId: null, dropped: [{ id: 'tires', x: 0, z: -7.8 }], installed: [] };
    expect(previewInteract(garage, onGround, rangeCtx)).toEqual({
      type: 'pickupDropped',
      id: 'tires',
    });
  });

  it('previews nothing out of range', () => {
    expect(
      previewInteract(garage, createShoppingState(), { ...rangeCtx, avatarX: 100, avatarZ: 100 })
    ).toEqual({ type: 'none' });
  });

  it('matches what interact() actually does for buy/pickup/drop cases', () => {
    const preview = previewInteract(garage, createShoppingState(), rangeCtx);
    expect(preview.type).toBe('buy');
    wallet.add(10000);
    const { outcome } = interact(garage, createShoppingState(), rangeCtx);
    expect(outcome).toEqual({ type: 'bought', id: 'tires' });
  });
});

describe('R3 snapping onto the car', () => {
  let garage: Garage;
  let wallet: Wallet;
  const roofZone = {
    zone: { id: 'roof', slot: 'roof' as const, offset: { x: 0, y: 0, z: 0 }, radius: 1 },
    x: 5,
    z: 5,
  };
  const armorZone = {
    zone: { id: 'armor_left', category: 'armor' as const, offset: { x: 0, y: 0, z: 0 }, radius: 1 },
    x: -5,
    z: -5,
  };
  const noStations: never[] = [];

  beforeEach(() => {
    resetConfig();
    wallet = new Wallet(getConfig().rewards, null);
    garage = new Garage(getConfig().upgrades, wallet, 1, null);
    wallet.add(10000);
  });

  it('snaps a carried slotted part onto its zone and equips it', () => {
    garage.buy('machinegun'); // auto-equips to 'roof' since it's free at purchase time
    garage.unequip('roof'); // pick it back up conceptually - not carried via a station here
    const carrying = { heldId: 'machinegun', dropped: [], installed: [] };
    const { state, outcome } = interact(garage, carrying, {
      avatarX: 5,
      avatarZ: 5,
      stations: noStations,
      range: 1,
      zones: [roofZone],
    });
    expect(outcome).toEqual({ type: 'snapped', id: 'machinegun' });
    expect(state.heldId).toBeNull();
    expect(garage.equippedIn('roof')?.id).toBe('machinegun');
  });

  it(
    'bug found in verification: picking a just-bought weapon up from its own station ' +
      'un-equips the auto-equip Garage.buy() applies, so it can snap right back into the ' +
      'same zone instead of finding it self-occupied',
    () => {
      // Station and zone sit far apart, so the first interact() is unambiguously a
      // station pickup, not a zone one - both already correctly un-equip on their own.
      const station = { id: 'machinegun', x: 50, z: 50 };
      garage.buy('machinegun'); // auto-equips to 'roof' since the slot was free
      expect(garage.equippedIn('roof')?.id).toBe('machinegun');
      const { state: afterPickup, outcome } = interact(garage, createShoppingState(), {
        avatarX: 50,
        avatarZ: 50,
        stations: [station],
        range: 1,
        zones: [roofZone],
      });
      expect(outcome).toEqual({ type: 'pickedUpFromStation', id: 'machinegun' });
      expect(garage.equippedIn('roof')).toBeNull(); // carrying it means it's off the car
      const { outcome: snapOutcome } = interact(garage, afterPickup, {
        avatarX: 5,
        avatarZ: 5,
        stations: [station],
        range: 1,
        zones: [roofZone],
      });
      expect(snapOutcome).toEqual({ type: 'snapped', id: 'machinegun' });
    }
  );

  it('snaps a carried passive part onto its category zone and tracks it as installed', () => {
    garage.buy('armor');
    const carrying = { heldId: 'armor', dropped: [], installed: [] };
    const { state, outcome } = interact(garage, carrying, {
      avatarX: -5,
      avatarZ: -5,
      stations: noStations,
      range: 1,
      zones: [armorZone],
    });
    expect(outcome).toEqual({ type: 'snapped', id: 'armor' });
    expect(state.installed).toEqual(['armor']);
  });

  it('falls back to a plain drop when no valid zone is in reach while carrying', () => {
    const carrying = { heldId: 'armor', dropped: [], installed: [] };
    const { state, outcome } = interact(garage, carrying, {
      avatarX: 100,
      avatarZ: 100,
      stations: noStations,
      range: 1,
      zones: [armorZone],
    });
    expect(outcome).toEqual({ type: 'dropped', id: 'armor' });
    expect(state.dropped).toEqual([{ id: 'armor', x: 100, z: 100 }]);
  });

  it('never snaps onto an already-occupied zone - occupied zones are invisible to snapping', () => {
    garage.buy('armor');
    const alreadyInstalled = { heldId: 'armor', dropped: [], installed: ['armor'] };
    // A second, different carried part of the SAME category has nowhere to go since the
    // only armor zone is occupied - it should fall back to a plain drop instead.
    const { outcome } = interact(garage, alreadyInstalled, {
      avatarX: -5,
      avatarZ: -5,
      stations: noStations,
      range: 1,
      zones: [armorZone],
    });
    expect(outcome).toEqual({ type: 'dropped', id: 'armor' });
  });

  it('picks a snapped slotted part back up, unequipping it', () => {
    garage.buy('machinegun');
    const empty = createShoppingState();
    const { state, outcome } = interact(garage, empty, {
      avatarX: 5,
      avatarZ: 5,
      stations: noStations,
      range: 1,
      zones: [roofZone],
    });
    expect(outcome).toEqual({ type: 'pickedUpFromZone', id: 'machinegun' });
    expect(state.heldId).toBe('machinegun');
    expect(garage.equippedIn('roof')).toBeNull();
  });

  it('picks a snapped passive part back up, clearing it from installed', () => {
    garage.buy('armor');
    const installed = { heldId: null, dropped: [], installed: ['armor'] };
    const { state, outcome } = interact(garage, installed, {
      avatarX: -5,
      avatarZ: -5,
      stations: noStations,
      range: 1,
      zones: [armorZone],
    });
    expect(outcome).toEqual({ type: 'pickedUpFromZone', id: 'armor' });
    expect(state.heldId).toBe('armor');
    expect(state.installed).toEqual([]);
  });

  it('preview says snap when a valid empty zone is in reach, drop otherwise', () => {
    const carrying = { heldId: 'armor', dropped: [], installed: [] };
    expect(
      previewInteract(garage, carrying, {
        avatarX: -5,
        avatarZ: -5,
        stations: noStations,
        range: 1,
        zones: [armorZone],
      })
    ).toEqual({ type: 'snap', id: 'armor' });
    expect(
      previewInteract(garage, carrying, {
        avatarX: 100,
        avatarZ: 100,
        stations: noStations,
        range: 1,
        zones: [armorZone],
      })
    ).toEqual({ type: 'drop', id: 'armor' });
  });

  it('preview says pickupZone when standing empty-handed at an occupied zone', () => {
    garage.buy('armor');
    const installed = { heldId: null, dropped: [], installed: ['armor'] };
    expect(
      previewInteract(garage, installed, {
        avatarX: -5,
        avatarZ: -5,
        stations: noStations,
        range: 1,
        zones: [armorZone],
      })
    ).toEqual({ type: 'pickupZone', id: 'armor' });
  });
});

describe('R4 swapping an occupied zone', () => {
  let garage: Garage;
  let wallet: Wallet;
  const roofZone = {
    zone: { id: 'roof', slot: 'roof' as const, offset: { x: 0, y: 0, z: 0 }, radius: 1 },
    x: 5,
    z: 5,
  };
  const rearZone = {
    zone: { id: 'rear_weapon', slot: 'rear' as const, offset: { x: 0, y: 0, z: 0 }, radius: 1 },
    x: 5,
    z: 5,
  };
  const frontZone = {
    zone: { id: 'front', slot: 'front' as const, offset: { x: 0, y: 0, z: 0 }, radius: 1 },
    x: 5,
    z: 5,
  };
  const noStations: never[] = [];

  beforeEach(() => {
    resetConfig();
    wallet = new Wallet(getConfig().rewards, null);
    garage = new Garage(getConfig().upgrades, wallet, 5, null); // every weapon's tiers unlocked
    wallet.add(10000);
  });

  it('swaps two ordinary same-slot weapons: the occupant comes off into the carrier’s hands', () => {
    garage.buy('machinegun'); // auto-equips to 'roof'
    garage.buy('rockets');
    garage.unequip('roof');
    garage.equip('rockets'); // simulate carrying rockets, having picked it up from elsewhere
    const carrying = { heldId: 'rockets', dropped: [], installed: [] };
    garage.equip('machinegun'); // machinegun re-occupies 'roof' for this scenario
    const { state, outcome } = interact(garage, carrying, {
      avatarX: 5,
      avatarZ: 5,
      stations: noStations,
      range: 1,
      zones: [roofZone],
    });
    expect(outcome).toEqual({ type: 'swapped', id: 'rockets', displacedId: 'machinegun' });
    expect(state.heldId).toBe('machinegun');
    expect(garage.equippedIn('roof')?.id).toBe('rockets');
  });

  it('R4: the multi-mount machine gun snaps onto the empty rear mount (its non-default slot)', () => {
    garage.buy('machinegun'); // auto-equips to its default, 'roof'
    garage.unequip('roof'); // simulate carrying it - not equipped anywhere right now
    const carrying = { heldId: 'machinegun', dropped: [], installed: [] };
    const { state, outcome } = interact(garage, carrying, {
      avatarX: 5,
      avatarZ: 5,
      stations: noStations,
      range: 1,
      zones: [rearZone],
    });
    expect(outcome).toEqual({ type: 'snapped', id: 'machinegun' });
    expect(state.heldId).toBeNull();
    expect(garage.equippedIn('rear')?.id).toBe('machinegun');
  });

  it('R4: the multi-mount machine gun can swap onto front, displacing whatever else is there', () => {
    garage.buy('flamethrower'); // occupies 'front'
    garage.buy('machinegun'); // auto-equips to 'roof'
    garage.unequip('roof'); // simulate carrying it, not equipped anywhere right now
    const carrying = { heldId: 'machinegun', dropped: [], installed: [] };
    const { state, outcome } = interact(garage, carrying, {
      avatarX: 5,
      avatarZ: 5,
      stations: noStations,
      range: 1,
      zones: [frontZone],
    });
    expect(outcome).toEqual({ type: 'swapped', id: 'machinegun', displacedId: 'flamethrower' });
    expect(state.heldId).toBe('flamethrower');
    expect(garage.equippedIn('front')?.id).toBe('machinegun');
  });

  it('preview matches: swap when a valid zone is occupied by something else', () => {
    garage.buy('machinegun');
    garage.buy('rockets');
    garage.unequip('roof');
    garage.equip('machinegun');
    const carrying = { heldId: 'rockets', dropped: [], installed: [] };
    expect(
      previewInteract(garage, carrying, {
        avatarX: 5,
        avatarZ: 5,
        stations: noStations,
        range: 1,
        zones: [roofZone],
      })
    ).toEqual({ type: 'swap', id: 'rockets', displacedId: 'machinegun' });
  });

  it('never swaps a part with itself, even if a state somehow marked it both carried and installed', () => {
    // Defensive guard, not a reachable gameplay state: every passive category has exactly
    // one id, so there is never a *different* part to swap it with - this only confirms
    // nearestValidOccupiedZone's own same-id guard rather than a real play scenario.
    garage.buy('armor');
    const armorZoneWorld = {
      zone: {
        id: 'armor_left',
        category: 'armor' as const,
        offset: { x: 0, y: 0, z: 0 },
        radius: 1,
      },
      x: 5,
      z: 5,
    };
    const carrying = { heldId: 'armor', dropped: [], installed: ['armor'] };
    const { outcome } = interact(garage, carrying, {
      avatarX: 5,
      avatarZ: 5,
      stations: noStations,
      range: 1,
      zones: [armorZoneWorld],
    });
    expect(outcome).toEqual({ type: 'dropped', id: 'armor' });
  });
});
