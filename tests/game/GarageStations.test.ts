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
    const carrying = { heldId: 'tires', dropped: [] };
    const farFromAnything = { avatarX: 3, avatarZ: 3, stations, range: 1.6 };
    const { state, outcome } = interact(garage, carrying, farFromAnything);
    expect(outcome).toEqual({ type: 'dropped', id: 'tires' });
    expect(state.heldId).toBeNull();
    expect(state.dropped).toEqual([{ id: 'tires', x: 3, z: 3 }]);
  });

  it('picks a dropped part back up, removing it from the dropped list', () => {
    const onTheGround = { heldId: null, dropped: [{ id: 'tires', x: 3, z: 3 }] };
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
    const carrying = { heldId: 'something-else', dropped: [] };
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
    const carrying = { heldId: 'tires', dropped: [] };
    const farAway = { avatarX: 100, avatarZ: 100, stations, range: 1.6 };
    expect(previewInteract(garage, carrying, farAway)).toEqual({ type: 'drop', id: 'tires' });
  });

  it('previews picking a dropped part back up', () => {
    const onGround = { heldId: null, dropped: [{ id: 'tires', x: 0, z: -7.8 }] };
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
