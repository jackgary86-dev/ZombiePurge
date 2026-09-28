import type { PickupKind } from '../../data/types';

export interface PickupState {
  kind: PickupKind;
  x: number;
  z: number;
  taken: boolean;
}

export const PICKUP_RADIUS = 5;

/**
 * E9: proximity pickup detection, pure and deterministic — `main.ts` calls this every
 * fixed step with the car's position and applies each collected pickup's effect
 * (refuel/repair/coins/ammo) itself, since that's the only part that needs the rest
 * of the game's live state.
 */
export function collectPickups(
  spots: PickupState[],
  carX: number,
  carZ: number,
  radius = PICKUP_RADIUS
): PickupState[] {
  const collected: PickupState[] = [];
  const r2 = radius * radius;
  for (const p of spots) {
    if (p.taken) continue;
    const dx = p.x - carX;
    const dz = p.z - carZ;
    if (dx * dx + dz * dz <= r2) {
      p.taken = true;
      collected.push(p);
    }
  }
  return collected;
}

/** A fresh run puts every pickup back on the map. */
export function resetPickups(spots: PickupState[]): void {
  for (const p of spots) p.taken = false;
}
