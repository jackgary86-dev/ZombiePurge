import type { Garage, PurchaseFailure } from '../shop';
import type { SnapZoneDef } from '../../data/types';
import {
  nearestOccupiedZone,
  nearestValidEmptyZone,
  nearestValidOccupiedZone,
  type CarriedPartInfo,
} from './SnapZones';

/** R2: one physical, walk-up-able location per top-level catalog entry (`garage.upgrades`),
 *  not per individual tier or cosmetic variant - see the R2 ticket's scoping discussion. */
export interface GarageStation {
  id: string;
  x: number;
  z: number;
}

/** A part the player dropped somewhere other than its home station. */
export interface DroppedPart {
  id: string;
  x: number;
  z: number;
}

/** A snap zone at its current world position (the car's own position/orientation applied to
 *  its car-local `SnapZoneDef.offset` - computed by the caller once per frame, since this
 *  module has no Three.js dependency of its own). */
export interface WorldZone {
  zone: SnapZoneDef;
  x: number;
  z: number;
}

export interface GarageShoppingState {
  /** The one part currently carried, or null - only one at a time. */
  heldId: string | null;
  dropped: DroppedPart[];
  /** R3: ids of passive (unslotted) upgrades currently snapped onto the car. Slotted upgrades
   *  (weapon/engineType/ram/melee) don't need an entry here - `Garage.equippedIn()` is
   *  already the single source of truth for those. */
  installed: string[];
}

export function createShoppingState(): GarageShoppingState {
  return { heldId: null, dropped: [], installed: [] };
}

/**
 * Places one station per id evenly along the room's two long (Z) walls, split into two
 * rows and inset from the walls by `stationInset` - purely a function of the room's own
 * `bounds` and how many parts there are, so it never needs hand-authored per-item coordinates.
 */
export function layoutStations(
  ids: string[],
  bounds: { x: number; z: number },
  stationInset: number
): GarageStation[] {
  if (ids.length === 0) return [];
  const farRowCount = Math.ceil(ids.length / 2);
  const nearRowCount = ids.length - farRowCount;
  const span = Math.max(0, bounds.x * 2 - stationInset * 2);
  const wallZ = Math.max(0, bounds.z - stationInset);

  const rowX = (index: number, count: number): number =>
    count <= 1 ? 0 : -bounds.x + stationInset + (span * index) / (count - 1);

  return ids.map((id, i) => {
    const onFarWall = i < farRowCount;
    const rowIndex = onFarWall ? i : i - farRowCount;
    const rowCount = onFarWall ? farRowCount : nearRowCount;
    return { id, x: rowX(rowIndex, rowCount), z: onFarWall ? -wallZ : wallZ };
  });
}

function distance(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

/** The closest station within `range`, or null. Ties favour the first in list order. */
export function nearestStation(
  avatarX: number,
  avatarZ: number,
  stations: GarageStation[],
  range: number
): GarageStation | null {
  let best: GarageStation | null = null;
  let bestDist = Infinity;
  for (const s of stations) {
    const d = distance(avatarX, avatarZ, s.x, s.z);
    if (d <= range && d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

/** The closest dropped part within `range`, or null. */
export function nearestDropped(
  avatarX: number,
  avatarZ: number,
  dropped: DroppedPart[],
  range: number
): DroppedPart | null {
  let best: DroppedPart | null = null;
  let bestDist = Infinity;
  for (const d of dropped) {
    const dist = distance(avatarX, avatarZ, d.x, d.z);
    if (dist <= range && dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

export type InteractOutcome =
  | { type: 'snapped'; id: string }
  /** R4: `id` went onto the zone, `displacedId` came off it into the player's hands. */
  | { type: 'swapped'; id: string; displacedId: string }
  | { type: 'pickedUpFromZone'; id: string }
  | { type: 'dropped'; id: string }
  | { type: 'bought'; id: string }
  | { type: 'pickedUpFromStation'; id: string }
  | { type: 'pickedUpDropped'; id: string }
  | { type: 'blocked'; id: string; reason: PurchaseFailure }
  | { type: 'noop' };

export interface InteractContext {
  avatarX: number;
  avatarZ: number;
  stations: GarageStation[];
  range: number;
  /** R3: the car's snap zones at their current world position. Omit (or pass []) on a screen
   *  with no car to snap parts onto - R2's buy/pick-up/drop behaviour is unaffected either way. */
  zones?: WorldZone[];
}

export type InteractPreview =
  | { type: 'snap'; id: string }
  | { type: 'swap'; id: string; displacedId: string }
  | { type: 'drop'; id: string }
  | { type: 'pickupZone'; id: string }
  | { type: 'pickupDropped'; id: string }
  | { type: 'buy'; id: string }
  | { type: 'pickupStation'; id: string }
  | { type: 'none' };

type GarageForInteract = Pick<
  Garage,
  'get' | 'ownedTier' | 'buy' | 'equip' | 'unequip' | 'equippedIn'
>;

function carriedPartInfo(garage: GarageForInteract, id: string): CarriedPartInfo {
  const def = garage.get(id);
  return { id, slot: def?.slot, validSlots: def?.validSlots, category: def?.category };
}

/**
 * Side-effect-free preview of what the next E-press would do, for a live HUD prompt that
 * has to update every frame as the avatar walks around - mirrors `interact()`'s own
 * priority order exactly, without spending coins or mutating anything.
 */
export function previewInteract(
  garage: GarageForInteract,
  state: GarageShoppingState,
  ctx: InteractContext
): InteractPreview {
  if (state.heldId !== null) {
    const zones = ctx.zones ?? [];
    const part = carriedPartInfo(garage, state.heldId);
    const zone = nearestValidEmptyZone(
      part,
      zones,
      garage,
      state.installed,
      ctx.avatarX,
      ctx.avatarZ
    );
    if (zone) return { type: 'snap', id: state.heldId };
    const occupied = nearestValidOccupiedZone(
      part,
      zones,
      garage,
      state.installed,
      ctx.avatarX,
      ctx.avatarZ
    );
    if (occupied) return { type: 'swap', id: state.heldId, displacedId: occupied.occupantId };
    return { type: 'drop', id: state.heldId };
  }

  const dropped = nearestDropped(ctx.avatarX, ctx.avatarZ, state.dropped, ctx.range);
  if (dropped) return { type: 'pickupDropped', id: dropped.id };

  const occupied = nearestOccupiedZone(
    ctx.zones ?? [],
    garage,
    state.installed,
    ctx.avatarX,
    ctx.avatarZ
  );
  if (occupied) return { type: 'pickupZone', id: occupied.occupantId };

  const station = nearestStation(ctx.avatarX, ctx.avatarZ, ctx.stations, ctx.range);
  if (!station) return { type: 'none' };

  return garage.ownedTier(station.id) === 0
    ? { type: 'buy', id: station.id }
    : { type: 'pickupStation', id: station.id };
}

/**
 * Resolves a single E-press. Priority order: (1) carrying something near a valid, empty snap
 * zone for it snaps it onto the car; (2) carrying something near a valid zone that's already
 * occupied by something else swaps them - the old occupant comes off into the player's now-
 * empty hands; (3) carrying something with no valid zone in reach at all drops it right here
 * instead - only one part can ever be carried, so the player must snap, swap or drop before
 * starting a new interaction; (4) pick up a dropped part in range; (5) empty-handed and
 * standing at an occupied zone picks that part back up; (6) buy (if unowned) or pick up (if
 * owned) the nearest station in range; (7) otherwise nothing is in range.
 */
export function interact(
  garage: GarageForInteract,
  state: GarageShoppingState,
  ctx: InteractContext
): { state: GarageShoppingState; outcome: InteractOutcome } {
  if (state.heldId !== null) {
    const heldId = state.heldId;
    const part = carriedPartInfo(garage, heldId);
    const zones = ctx.zones ?? [];
    const zone = nearestValidEmptyZone(
      part,
      zones,
      garage,
      state.installed,
      ctx.avatarX,
      ctx.avatarZ
    );
    if (zone) {
      if (zone.slot) garage.equip(heldId, zone.slot);
      const installed = zone.category ? [...state.installed, heldId] : state.installed;
      return {
        state: { ...state, heldId: null, installed },
        outcome: { type: 'snapped', id: heldId },
      };
    }
    const occupied = nearestValidOccupiedZone(
      part,
      zones,
      garage,
      state.installed,
      ctx.avatarX,
      ctx.avatarZ
    );
    if (occupied) {
      const { zone: occZone, occupantId } = occupied;
      if (occZone.slot) {
        garage.unequip(occZone.slot);
        garage.equip(heldId, occZone.slot);
      }
      const installed = occZone.category
        ? [...state.installed.filter((id) => id !== occupantId), heldId]
        : state.installed;
      return {
        state: { ...state, heldId: occupantId, installed },
        outcome: { type: 'swapped', id: heldId, displacedId: occupantId },
      };
    }
    const part2: DroppedPart = { id: heldId, x: ctx.avatarX, z: ctx.avatarZ };
    return {
      state: { ...state, heldId: null, dropped: [...state.dropped, part2] },
      outcome: { type: 'dropped', id: heldId },
    };
  }

  const droppedHere = nearestDropped(ctx.avatarX, ctx.avatarZ, state.dropped, ctx.range);
  if (droppedHere) {
    return {
      state: {
        ...state,
        heldId: droppedHere.id,
        dropped: state.dropped.filter((d) => d !== droppedHere),
      },
      outcome: { type: 'pickedUpDropped', id: droppedHere.id },
    };
  }

  const occupied = nearestOccupiedZone(
    ctx.zones ?? [],
    garage,
    state.installed,
    ctx.avatarX,
    ctx.avatarZ
  );
  if (occupied) {
    const { zone, occupantId } = occupied;
    if (zone.slot) garage.unequip(zone.slot);
    const installed = zone.category
      ? state.installed.filter((id) => id !== occupantId)
      : state.installed;
    return {
      state: { ...state, heldId: occupantId, installed },
      outcome: { type: 'pickedUpFromZone', id: occupantId },
    };
  }

  const station = nearestStation(ctx.avatarX, ctx.avatarZ, ctx.stations, ctx.range);
  if (!station) return { state, outcome: { type: 'noop' } };

  if (garage.ownedTier(station.id) === 0) {
    const result = garage.buy(station.id);
    if (!result.ok) {
      return { state, outcome: { type: 'blocked', id: station.id, reason: result.reason! } };
    }
    return { state, outcome: { type: 'bought', id: station.id } };
  }

  // A weapon/engineType part auto-equips the instant it's first bought (Garage.buy()'s own
  // long-standing behaviour) - picking it straight back up here must undo that, or it'd be
  // both "carried" and "installed" at once, self-blocking the very zone it came from.
  const stationDef = garage.get(station.id);
  if (stationDef?.slot && garage.equippedIn(stationDef.slot)?.id === station.id) {
    garage.unequip(stationDef.slot);
  }
  return {
    state: { ...state, heldId: station.id },
    outcome: { type: 'pickedUpFromStation', id: station.id },
  };
}
