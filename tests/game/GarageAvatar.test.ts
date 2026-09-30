import { describe, it, expect } from 'vitest';
import {
  GARAGE_AVATAR_START,
  stepGarageAvatar,
  type GarageAvatarState,
} from '../../src/game/garageScene/GarageAvatar';
import type { GarageConfig } from '../../src/data/types';

const CFG: GarageConfig = {
  walkSpeed: 2,
  bounds: { x: 5, z: 5 },
  cameraLerp: 4,
};

const START: GarageAvatarState = { x: 0, z: 0, facing: 0 };

describe('R1 GarageAvatar', () => {
  it('walks in the direction pressed, at exactly walkSpeed * dt', () => {
    const next = stepGarageAvatar(START, 0, 1, 0.5, CFG);
    expect(next.x).toBeCloseTo(0);
    expect(next.z).toBeCloseTo(1); // 2 m/s * 0.5 s
    expect(next.facing).toBeCloseTo(0); // facing +Z
  });

  it('normalizes diagonal input so it never moves faster than walkSpeed', () => {
    const next = stepGarageAvatar(START, 1, 1, 0.5, CFG);
    const dist = Math.hypot(next.x - START.x, next.z - START.z);
    expect(dist).toBeCloseTo(1, 5); // same speed as a single-axis press
    expect(next.facing).toBeCloseTo(Math.PI / 4);
  });

  it('faces the direction of travel', () => {
    expect(stepGarageAvatar(START, 1, 0, 0.1, CFG).facing).toBeCloseTo(Math.PI / 2); // +X
    expect(stepGarageAvatar(START, -1, 0, 0.1, CFG).facing).toBeCloseTo(-Math.PI / 2); // -X
    expect(stepGarageAvatar(START, 0, -1, 0.1, CFG).facing).toBeCloseTo(Math.PI); // -Z
  });

  it('leaves position and facing untouched on idle (no snapping to face the car)', () => {
    const leaning: GarageAvatarState = { x: 1.5, z: -2, facing: 1.2 };
    expect(stepGarageAvatar(leaning, 0, 0, 0.5, CFG)).toEqual(leaning);
    expect(stepGarageAvatar(leaning, 0.01, 0, 0.5, CFG)).not.toBe(leaning); // still real input
  });

  it('clamps to the configured bounds instead of walking through the walls', () => {
    const nearEdge: GarageAvatarState = { x: 4.9, z: 0, facing: 0 };
    const next = stepGarageAvatar(nearEdge, 1, 0, 1, CFG); // would overshoot without clamping
    expect(next.x).toBe(CFG.bounds.x);
    const negEdge: GarageAvatarState = { x: -4.9, z: 0, facing: 0 };
    expect(stepGarageAvatar(negEdge, -1, 0, 1, CFG).x).toBe(-CFG.bounds.x);
  });

  it('GARAGE_AVATAR_START sits inside the default bounds, facing back toward the car', () => {
    expect(Math.abs(GARAGE_AVATAR_START.x)).toBeLessThan(CFG.bounds.x);
    expect(Math.abs(GARAGE_AVATAR_START.z)).toBeLessThan(10); // sane distance from the pad
    expect(GARAGE_AVATAR_START.facing).toBeCloseTo(Math.PI); // facing -Z, back toward the car
  });
});
