import type { GarageConfig } from '../../data/types';

/**
 * R1: the player's position/facing while walking around the Garage scene. Local coordinates,
 * centred on the build pad (the car's own spawn point) - main.ts adds the world-space offset
 * when placing the view. Pure and deterministic so it's cheap to unit test; main.ts feeds it
 * a per-frame move vector read from the same WASD/gamepad axes the car itself drives with.
 */
export interface GarageAvatarState {
  x: number;
  z: number;
  /** Radians about world +Y, matching the car's own yaw convention (facing +Z is 0). */
  facing: number;
}

/** Where the avatar starts each time the Garage is entered: a few steps back from the car. */
export const GARAGE_AVATAR_START: GarageAvatarState = { x: 0, z: 4, facing: Math.PI };

/**
 * Advances one step given a raw (possibly diagonal, possibly longer than 1) move vector.
 * Idle input (both components ~0) leaves position and facing untouched - the avatar keeps
 * facing whichever way it last walked, rather than snapping to face the car.
 */
export function stepGarageAvatar(
  state: GarageAvatarState,
  moveX: number,
  moveZ: number,
  dt: number,
  cfg: GarageConfig
): GarageAvatarState {
  const len = Math.hypot(moveX, moveZ);
  if (len <= 1e-4) return state;
  const nx = moveX / len;
  const nz = moveZ / len;
  const dist = Math.min(1, len) * cfg.walkSpeed * dt;
  return {
    x: Math.max(-cfg.bounds.x, Math.min(cfg.bounds.x, state.x + nx * dist)),
    z: Math.max(-cfg.bounds.z, Math.min(cfg.bounds.z, state.z + nz * dist)),
    facing: Math.atan2(nx, nz),
  };
}
