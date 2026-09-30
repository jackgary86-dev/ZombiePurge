import { describe, it, expect } from 'vitest';
import { buildGarageRoom, GarageAvatarView } from '../../src/game/art/GarageScene';
import { stepGarageAvatar } from '../../src/game/garageScene/GarageAvatar';
import type { GarageConfig } from '../../src/data/types';

const CFG: GarageConfig = {
  walkSpeed: 3,
  bounds: { x: 8, z: 6 },
  cameraLerp: 4,
};

describe('R1 Garage room + avatar view', () => {
  it('builds a floor and four walls sized to the configured bounds', () => {
    const group = buildGarageRoom(CFG);
    expect(group.getObjectByName('floor')).toBeDefined();
    const walls = group.children.filter((c) => c.name === 'wall');
    expect(walls).toHaveLength(4);
    // Every wall sits just past the bounds' own edge (its own half-thickness beyond it),
    // never out in the middle of the walkable area.
    for (const wall of walls) {
      const pastXEdge = Math.abs(wall.position.x) - CFG.bounds.x;
      const pastZEdge = Math.abs(wall.position.z) - CFG.bounds.z;
      const atXEdge = pastXEdge > -0.01 && pastXEdge < 1;
      const atZEdge = pastZEdge > -0.01 && pastZEdge < 1;
      expect(atXEdge || atZEdge).toBe(true);
    }
    // Two side walls run the bounds' full depth; two end walls run its full width.
    const sideWalls = walls.filter((w) => Math.abs(w.position.x) > CFG.bounds.x - 0.01);
    const endWalls = walls.filter((w) => Math.abs(w.position.z) > CFG.bounds.z - 0.01);
    expect(sideWalls).toHaveLength(2);
    expect(endWalls).toHaveLength(2);
  });

  it('the avatar view tracks state at the build pad world offset, facing included', () => {
    const view = new GarageAvatarView();
    view.sync({ x: 2, z: -1, facing: Math.PI / 2 }, 100, 50);
    expect(view.group.position.x).toBeCloseTo(102);
    expect(view.group.position.z).toBeCloseTo(49);
    expect(view.group.rotation.y).toBeCloseTo(Math.PI / 2);
  });

  it('a full walk step never leaves the avatar visually outside the built room', () => {
    const state = stepGarageAvatar({ x: 0, z: 0, facing: 0 }, 1, 1, 100, CFG); // absurdly long dt
    expect(Math.abs(state.x)).toBeLessThanOrEqual(CFG.bounds.x);
    expect(Math.abs(state.z)).toBeLessThanOrEqual(CFG.bounds.z);
  });
});
