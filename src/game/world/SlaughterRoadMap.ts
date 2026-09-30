import { Group } from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import {
  buildKitColliders,
  buildKitMeshes,
  type KitLayout,
  type KitPiece,
} from './PlaceholderMapKit';

const WALL_HEIGHT = 3.5;
export const SLAUGHTER_ROAD_WIDTH = 12;

/**
 * Q1: Slaughtermode's map - one long, narrow, dead-straight road with no branches, no open
 * ground to roam. Continuous walls flank the road its whole length (unlike the open highway
 * of Desert Highway) so the car - and the horde spawned via `spawnerTuning`/`spawnZones` onto
 * the same narrow strip - both stay confined to the gauntlet. Deterministic; `_seed` is unused
 * for now (the layout has no scattered props) but kept in the signature for parity with the
 * other generators, in case decoration is added later.
 */
export function generateSlaughterRoad(_seed: number, size = 2200): KitLayout {
  const half = size / 2;
  const pieces: KitPiece[] = [];
  const wallX = SLAUGHTER_ROAD_WIDTH / 2 + 0.5;

  // Continuous flanking walls the full length of the road - thin in X, long in Z.
  for (const x of [-wallX, wallX]) {
    pieces.push({
      kind: 'wall',
      position: { x, y: WALL_HEIGHT / 2, z: 0 },
      halfExtents: { x: 0.5, y: WALL_HEIGHT / 2, z: half },
      yaw: 0,
      pitch: 0,
    });
  }
  // A backstop at the far end - thin in Z, spanning the road's width.
  pieces.push({
    kind: 'wall',
    position: { x: 0, y: WALL_HEIGHT / 2, z: half + 0.5 },
    halfExtents: { x: SLAUGHTER_ROAD_WIDTH / 2 + 1, y: WALL_HEIGHT / 2, z: 0.5 },
    yaw: 0,
    pitch: 0,
  });

  const roads = [{ x1: 0, z1: -half, x2: 0, z2: half, width: SLAUGHTER_ROAD_WIDTH }];
  const exit = { x: 0, z: half - 15 };
  return {
    size,
    spawn: { x: 0, y: 1.2, z: -half + 15 },
    pieces,
    trees: [],
    roads,
    exit,
  };
}

const PALETTE = {
  ground: 0x2a2622,
  pieces: {
    wall: 0x555250,
  },
  road: 0x1c1a18,
};

export function buildSlaughterRoadColliders(physics: PhysicsWorld, layout: KitLayout): number {
  return buildKitColliders(physics, layout);
}

export function buildSlaughterRoadMeshes(layout: KitLayout): Group {
  const group = buildKitMeshes(layout, PALETTE);
  group.name = 'slaughter-road';
  return group;
}
