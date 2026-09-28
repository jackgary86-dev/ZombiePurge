import { Group } from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import {
  buildKitColliders,
  buildKitMeshes,
  mulberry32,
  type KitLayout,
  type KitPiece,
} from './PlaceholderMapKit';
import type { RoadStrip, TreeSpot } from './OpenFieldMap';

const WALL_HEIGHT = 5;
const ROAD_WIDTH = 11;

/**
 * E7/I7: Map 4. A dense pine forest split by one road up to the mountain pass
 * (the exit) with a side branch to a clearing, boulders scattered through the
 * trees, and a boss courtyard kept clear near the pass. Deterministic; the
 * seed only jitters tree/boulder placement.
 */
export function generateFrozenForest(seed: number, size = 1400): KitLayout {
  const rng = mulberry32(seed);
  const half = size / 2;
  const pieces: KitPiece[] = [];
  const trees: TreeSpot[] = [];

  const wall = (x: number, z: number, yaw: number) =>
    pieces.push({
      kind: 'wall',
      position: { x, y: WALL_HEIGHT / 2, z },
      halfExtents: { x: half + 1, y: WALL_HEIGHT / 2, z: 0.5 },
      yaw,
      pitch: 0,
    });
  wall(0, half + 0.5, 0);
  wall(0, -half - 0.5, 0);
  wall(half + 0.5, 0, Math.PI / 2);
  wall(-half - 0.5, 0, Math.PI / 2);

  const branchZ = 40;
  const roads: RoadStrip[] = [
    { x1: 0, z1: -half, x2: 0, z2: half - 30, width: ROAD_WIDTH },
    { x1: 0, z1: branchZ, x2: half * 0.55, z2: branchZ, width: 9 },
  ];

  // The boss courtyard near the pass, and the clearing at the end of the side branch,
  // both stay clear of trees/boulders.
  const clearings: { x: number; z: number; radius: number }[] = [
    { x: 0, z: half - 60, radius: 90 },
    { x: half * 0.55, z: branchZ, radius: 70 },
  ];
  const inClearing = (x: number, z: number) =>
    clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius);
  const nearRoad = (x: number, z: number) =>
    (Math.abs(x) < ROAD_WIDTH / 2 + 5 && z < half - 30) ||
    (Math.abs(z - branchZ) < 9 && x > -5 && x < half * 0.55 + 5);

  const treeCount = Math.round((size * size) / 5500);
  for (let i = 0; i < treeCount; i++) {
    const x = (rng() * 2 - 1) * (half - 10);
    const z = (rng() * 2 - 1) * (half - 10);
    if (nearRoad(x, z) || inClearing(x, z)) continue;
    trees.push({ x, z, height: 6 + rng() * 6, canopy: 2.2 + rng() * 2.2 });
  }

  for (let i = 0; i < size / 30; i++) {
    const x = (rng() * 2 - 1) * (half - 15);
    const z = (rng() * 2 - 1) * (half - 15);
    if (nearRoad(x, z) || inClearing(x, z)) continue;
    const s = 1 + rng() * 1.6;
    pieces.push({
      kind: 'boulder',
      position: { x, y: s / 2, z },
      halfExtents: { x: s, y: s / 2, z: s * 0.9 },
      yaw: rng() * Math.PI,
      pitch: 0,
    });
  }

  const exit = { x: 0, z: half - 15 };
  return {
    size,
    spawn: { x: 6, y: 1.2, z: -half + 20 },
    pieces,
    trees,
    roads,
    exit,
  };
}

const PALETTE = {
  ground: 0xe8eef2,
  pieces: { wall: 0x5a6068, boulder: 0x6a7078 },
  road: 0x8a95a0,
  treeTrunk: 0x4a3a2a,
  treeCanopy: 0xdcefe6,
};

export function buildFrozenForestColliders(physics: PhysicsWorld, layout: KitLayout): number {
  return buildKitColliders(physics, layout);
}

export function buildFrozenForestMeshes(layout: KitLayout): Group {
  const group = buildKitMeshes(layout, PALETTE);
  group.name = 'frozen-forest';
  return group;
}
