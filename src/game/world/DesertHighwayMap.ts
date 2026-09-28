import { Group } from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import {
  buildKitColliders,
  buildKitMeshes,
  mulberry32,
  type KitLayout,
  type KitPiece,
} from './PlaceholderMapKit';

const WALL_HEIGHT = 5;
const HIGHWAY_WIDTH = 16;
const STATION_SPACING = 350;

/**
 * E5/I7: Map 2. One long highway the length of the map, gas stations every few
 * hundred metres, frequent jump ramps, and a scatter of cacti and rocks instead
 * of trees. Deterministic; the seed only jitters prop placement.
 */
export function generateDesertHighway(seed: number, size = 1600): KitLayout {
  const rng = mulberry32(seed);
  const half = size / 2;
  const pieces: KitPiece[] = [];

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

  const roads = [{ x1: 0, z1: -half, x2: 0, z2: half, width: HIGHWAY_WIDTH }];
  // A couple of minor cross streets for variety; the highway stays the spine.
  for (const z of [-half * 0.4, half * 0.5]) {
    roads.push({ x1: -half, z1: z, x2: half, z2: z, width: 9 });
  }

  // Gas stations alternate sides of the highway every STATION_SPACING metres.
  let side = 1;
  for (let z = -half + STATION_SPACING * 0.7; z < half - 60; z += STATION_SPACING) {
    const x = side * (HIGHWAY_WIDTH / 2 + 14);
    pieces.push({
      kind: 'station',
      position: { x, y: 3, z },
      halfExtents: { x: 8, y: 3, z: 6 },
      yaw: 0,
      pitch: 0,
    });
    for (const dz of [-4, 4]) {
      pieces.push({
        kind: 'pump',
        position: { x: x - 10, y: 1, z: z + dz },
        halfExtents: { x: 0.6, y: 1, z: 0.6 },
        yaw: 0,
        pitch: 0,
      });
    }
    side *= -1;
  }

  // Big jump ramps along the highway, alternating direction.
  const rampLength = 20;
  const rampPitch = Math.atan2(6, rampLength);
  let rampFacing = 0;
  for (let z = -half + 180; z < half - 100; z += 260) {
    pieces.push({
      kind: 'ramp',
      position: { x: 0, y: 2.2, z },
      halfExtents: { x: 6, y: 0.6, z: rampLength / 2 },
      yaw: rampFacing,
      pitch: rampPitch,
    });
    rampFacing = rampFacing === 0 ? Math.PI : 0;
  }

  // Cacti and rocks scattered off the highway.
  const propCount = Math.round(size / 12);
  for (let i = 0; i < propCount; i++) {
    const x = (rng() * 2 - 1) * (half - 20);
    const z = (rng() * 2 - 1) * (half - 20);
    if (Math.abs(x) < HIGHWAY_WIDTH / 2 + 6) continue; // keep the highway clear
    if (rng() < 0.6) {
      const h = 1.6 + rng() * 1.8;
      pieces.push({
        kind: 'cactus',
        position: { x, y: h / 2, z },
        halfExtents: { x: 0.35, y: h / 2, z: 0.35 },
        yaw: rng() * Math.PI,
        pitch: 0,
      });
    } else {
      const s = 0.8 + rng() * 1.2;
      pieces.push({
        kind: 'rock',
        position: { x, y: s / 2, z },
        halfExtents: { x: s, y: s / 2, z: s * 0.8 },
        yaw: rng() * Math.PI,
        pitch: 0,
      });
    }
  }

  const exit = { x: 0, z: half - 12 };
  return {
    size,
    spawn: { x: 6, y: 1.2, z: -half + 20 },
    pieces,
    trees: [],
    roads,
    exit,
  };
}

const PALETTE = {
  ground: 0xc2a066,
  pieces: {
    wall: 0x5a5a5a,
    station: 0xd8d0b8,
    pump: 0xc8402e,
    ramp: 0x8a8060,
    cactus: 0x4a7a3a,
    rock: 0x8a7a68,
  },
  road: 0x353028,
};

export function buildDesertHighwayColliders(physics: PhysicsWorld, layout: KitLayout): number {
  return buildKitColliders(physics, layout);
}

export function buildDesertHighwayMeshes(layout: KitLayout): Group {
  const group = buildKitMeshes(layout, PALETTE);
  group.name = 'desert-highway';
  return group;
}
