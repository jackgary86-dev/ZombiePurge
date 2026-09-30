import type { Garage } from '../shop';
import type { SnapZoneDef, UpgradeCategory, WeaponSlot } from '../../data/types';

/** The one thing R3 needs to know about a carried part to check it against a zone. `category`
 *  is only unset for an id the catalog doesn't recognise, which should never happen in
 *  practice - it simply never matches any zone rather than risk matching the wrong one. */
export interface CarriedPartInfo {
  id: string;
  slot?: WeaponSlot;
  category?: UpgradeCategory;
}

/** A zone accepts a part by its fixed mount slot (weapon/engineType/ram/melee upgrades all
 *  have one) or, for passive upgrades with no slot, by category. */
export function zoneAccepts(zone: SnapZoneDef, part: CarriedPartInfo): boolean {
  if (zone.slot) return part.slot === zone.slot;
  return part.category !== undefined && zone.category === part.category;
}

/** Every passive (unslotted) category has exactly one upgrade id sharing its own name, so the
 *  category name doubles as that id - see `SnapZoneDef`'s own doc comment. */
export function categoryZoneOccupant(zone: SnapZoneDef, installed: string[]): string | null {
  if (!zone.category) return null;
  return installed.includes(zone.category) ? zone.category : null;
}

/** Whichever id currently occupies `zone`, or null if it's empty. Slotted zones defer to the
 *  Garage's own `equipped` map (the single source of truth weapons/engine types already use);
 *  category zones use the parallel `installed` list R3 introduces for passive upgrades. */
export function zoneOccupant(
  zone: SnapZoneDef,
  garage: Pick<Garage, 'equippedIn'>,
  installed: string[]
): string | null {
  if (zone.slot) return garage.equippedIn(zone.slot)?.id ?? null;
  return categoryZoneOccupant(zone, installed);
}

interface WorldZone {
  zone: SnapZoneDef;
  x: number;
  z: number;
}

/** The nearest empty zone that accepts `part`, within `range` of the avatar. Occupied zones -
 *  even ones that would otherwise accept this part - never match; swapping a zone's occupant
 *  is R4's job, not R3's. */
export function nearestValidEmptyZone(
  part: CarriedPartInfo,
  zones: WorldZone[],
  garage: Pick<Garage, 'equippedIn'>,
  installed: string[],
  avatarX: number,
  avatarZ: number,
  range: number
): SnapZoneDef | null {
  let best: SnapZoneDef | null = null;
  let bestDist = Infinity;
  for (const { zone, x, z } of zones) {
    if (!zoneAccepts(zone, part)) continue;
    if (zoneOccupant(zone, garage, installed) !== null) continue;
    const d = Math.hypot(x - avatarX, z - avatarZ);
    if (d <= range && d < bestDist) {
      best = zone;
      bestDist = d;
    }
  }
  return best;
}

/** The nearest occupied zone in range, regardless of what's carried - used when nothing is
 *  being carried, to let the avatar walk up and pick an installed part back up. */
export function nearestOccupiedZone(
  zones: WorldZone[],
  garage: Pick<Garage, 'equippedIn'>,
  installed: string[],
  avatarX: number,
  avatarZ: number,
  range: number
): { zone: SnapZoneDef; occupantId: string } | null {
  let best: { zone: SnapZoneDef; occupantId: string } | null = null;
  let bestDist = Infinity;
  for (const { zone, x, z } of zones) {
    const occupantId = zoneOccupant(zone, garage, installed);
    if (occupantId === null) continue;
    const d = Math.hypot(x - avatarX, z - avatarZ);
    if (d <= range && d < bestDist) {
      best = { zone, occupantId };
      bestDist = d;
    }
  }
  return best;
}
