import type { Garage, PurchaseFailure } from '../shop';

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

export interface GarageShoppingState {
  /** The one part currently carried, or null - only one at a time. */
  heldId: string | null;
  dropped: DroppedPart[];
}

export function createShoppingState(): GarageShoppingState {
  return { heldId: null, dropped: [] };
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
}

export type InteractPreview =
  | { type: 'drop'; id: string }
  | { type: 'pickupDropped'; id: string }
  | { type: 'buy'; id: string }
  | { type: 'pickupStation'; id: string }
  | { type: 'none' };

/**
 * Side-effect-free preview of what the next E-press would do, for a live HUD prompt that
 * has to update every frame as the avatar walks around - mirrors `interact()`'s own
 * priority order exactly, without spending coins or mutating anything.
 */
export function previewInteract(
  garage: Pick<Garage, 'ownedTier'>,
  state: GarageShoppingState,
  ctx: InteractContext
): InteractPreview {
  if (state.heldId !== null) return { type: 'drop', id: state.heldId };

  const dropped = nearestDropped(ctx.avatarX, ctx.avatarZ, state.dropped, ctx.range);
  if (dropped) return { type: 'pickupDropped', id: dropped.id };

  const station = nearestStation(ctx.avatarX, ctx.avatarZ, ctx.stations, ctx.range);
  if (!station) return { type: 'none' };

  return garage.ownedTier(station.id) === 0
    ? { type: 'buy', id: station.id }
    : { type: 'pickupStation', id: station.id };
}

/**
 * Resolves a single E-press. Priority order: (1) carrying something always drops it right
 * here first - only one part can be carried at a time, so the player must drop before
 * starting a new interaction; (2) pick up a dropped part in range; (3) buy (if unowned) or
 * pick up (if owned) the nearest station in range; (4) otherwise nothing is in range.
 */
export function interact(
  garage: Pick<Garage, 'ownedTier' | 'buy'>,
  state: GarageShoppingState,
  ctx: InteractContext
): { state: GarageShoppingState; outcome: InteractOutcome } {
  if (state.heldId !== null) {
    const part: DroppedPart = { id: state.heldId, x: ctx.avatarX, z: ctx.avatarZ };
    return {
      state: { heldId: null, dropped: [...state.dropped, part] },
      outcome: { type: 'dropped', id: part.id },
    };
  }

  const droppedHere = nearestDropped(ctx.avatarX, ctx.avatarZ, state.dropped, ctx.range);
  if (droppedHere) {
    return {
      state: { heldId: droppedHere.id, dropped: state.dropped.filter((d) => d !== droppedHere) },
      outcome: { type: 'pickedUpDropped', id: droppedHere.id },
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

  return {
    state: { ...state, heldId: station.id },
    outcome: { type: 'pickedUpFromStation', id: station.id },
  };
}
