import { describe, it, expect } from 'vitest';
import {
  buildCarriedMarker,
  buildGarageRoom,
  GarageAvatarView,
  GarageStationMarker,
} from '../../src/game/art/GarageScene';
import { stepGarageAvatar } from '../../src/game/garageScene/GarageAvatar';
import type { GarageConfig } from '../../src/data/types';

const CFG: GarageConfig = {
  walkSpeed: 3,
  bounds: { x: 8, z: 6 },
  cameraLerp: 4,
  interactRange: 1.6,
  stationInset: 1.2,
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

  it('S3: dresses the room with trim, light fixtures, floor markings, and a garage door - without adding any more walls/floors', () => {
    const group = buildGarageRoom(CFG);
    const dressing = group.getObjectByName('garage-room-dressing')!;
    expect(dressing).toBeDefined();
    expect(dressing.children.filter((c) => c.name === 'room-trim').length).toBe(4);
    expect(dressing.children.filter((c) => c.name === 'light-fixture').length).toBeGreaterThan(0);
    expect(dressing.children.filter((c) => c.name === 'floor-marking').length).toBe(4);
    expect(dressing.getObjectByName('garage-door')).toBeDefined();
    // still exactly one floor and four walls - the dressing must not touch the room-shape tests
    expect(group.children.filter((c) => c.name === 'wall')).toHaveLength(4);
    expect(group.children.filter((c) => c.name === 'floor')).toHaveLength(1);
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

describe('R2 station marker + carried marker', () => {
  it('a station marker changes material when its owned state toggles', () => {
    const marker = new GarageStationMarker();
    const unowned = marker.mesh.material;
    marker.setOwned(true);
    expect(marker.mesh.material).not.toBe(unowned);
    marker.setOwned(false);
    expect(marker.mesh.material).toBe(unowned);
  });

  it('the carried marker sits above head height, ready to parent onto the avatar', () => {
    const marker = buildCarriedMarker();
    expect(marker.position.y).toBeGreaterThan(1);
  });

  it("T7: every marker shares one geometry instance, so rebuilding the dropped-parts group (Object3D.clear() doesn't dispose) can't leak GPU geometry buffers", () => {
    const a = new GarageStationMarker();
    const b = new GarageStationMarker();
    expect(b.mesh.geometry).toBe(a.mesh.geometry);
  });
});
