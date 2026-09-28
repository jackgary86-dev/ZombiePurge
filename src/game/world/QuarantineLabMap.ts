import { Group } from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import {
  buildKitColliders,
  buildKitMeshes,
  mulberry32,
  type KitLayout,
  type KitPiece,
} from './PlaceholderMapKit';

const WALL_HEIGHT = 6;
const WALL_THICKNESS = 1;
const RINGS = [90, 160, 230, 300];
const GAP_HALF = 7;
/** Which side of each ring (by index) is left open, forcing a spiral path inward. */
const GAP_SIDE: ('+z' | '-x' | '-z' | '+x')[] = ['+z', '-x', '-z', '+x'];

/**
 * E8/I7: Map 5, the finale. Concentric ringed corridors around a central
 * containment chamber — each ring's one doorway rotates, so reaching the
 * chamber (and the boss in it) means spiralling almost all the way around
 * every ring. Deterministic; the seed only jitters containment-pod placement.
 */
export function generateQuarantineLab(seed: number, size = 900): KitLayout {
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

  // Each ring is four wall sides around a square of half-size `r`; every side is one
  // solid piece except the ring's gap side, which is two stubs with a doorway between.
  for (let i = 0; i < RINGS.length; i++) {
    const r = RINGS[i];
    const gapSide = GAP_SIDE[i % GAP_SIDE.length];
    const sides: {
      face: '+z' | '-z' | '+x' | '-x';
      center: { x: number; z: number };
      yaw: number;
    }[] = [
      { face: '+z', center: { x: 0, z: r }, yaw: 0 },
      { face: '-z', center: { x: 0, z: -r }, yaw: 0 },
      { face: '+x', center: { x: r, z: 0 }, yaw: Math.PI / 2 },
      { face: '-x', center: { x: -r, z: 0 }, yaw: Math.PI / 2 },
    ];
    for (const s of sides) {
      if (s.face === gapSide) {
        const stub = (r - GAP_HALF) / 2;
        const along = s.yaw === 0 ? 'x' : 'z';
        for (const sign of [-1, 1]) {
          const offset = sign * (GAP_HALF + stub);
          pieces.push({
            kind: 'labWall',
            position: {
              x: along === 'x' ? offset : s.center.x,
              y: WALL_HEIGHT / 2,
              z: along === 'z' ? offset : s.center.z,
            },
            halfExtents: { x: stub, y: WALL_HEIGHT / 2, z: WALL_THICKNESS / 2 },
            yaw: s.yaw,
            pitch: 0,
          });
        }
      } else {
        pieces.push({
          kind: 'labWall',
          position: { x: s.center.x, y: WALL_HEIGHT / 2, z: s.center.z },
          halfExtents: { x: r, y: WALL_HEIGHT / 2, z: WALL_THICKNESS / 2 },
          yaw: s.yaw,
          pitch: 0,
        });
      }
    }
  }

  // Glowing containment pods, purely decorative — kept in the entry area and the
  // central chamber so they never block a ring's one doorway.
  const podSpots: { x: number; z: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    podSpots.push({ x: Math.cos(a) * 40, z: Math.sin(a) * 40 }); // inside the chamber
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    podSpots.push({ x: Math.cos(a) * (half - 30), z: (half - 30) * 0.4 + Math.sin(a) * 20 }); // entry area
  }
  for (const spot of podSpots) {
    pieces.push({
      kind: 'pod',
      position: { x: spot.x + (rng() - 0.5) * 4, y: 1, z: spot.z + (rng() - 0.5) * 4 },
      halfExtents: { x: 0.9, y: 1, z: 0.9 },
      yaw: rng() * Math.PI,
      pitch: 0,
    });
  }

  // The entrance/exit sits beyond the outermost ring's doorway.
  const outerGap = GAP_SIDE[(RINGS.length - 1) % GAP_SIDE.length];
  const dir: Record<string, { x: number; z: number }> = {
    '+z': { x: 0, z: 1 },
    '-z': { x: 0, z: -1 },
    '+x': { x: 1, z: 0 },
    '-x': { x: -1, z: 0 },
  };
  const d = dir[outerGap];
  const exit = { x: d.x * (half - 15), z: d.z * (half - 15) };
  const spawn = { x: -d.x * (half - 20), y: 1.2, z: -d.z * (half - 20) };

  return { size, spawn, pieces, trees: [], roads: [], exit };
}

const PALETTE = {
  ground: 0xd8e4e0,
  pieces: {
    wall: 0x8a9490,
    labWall: 0xc8d4d0,
    pod: 0x3fd88a,
  },
};

export function buildQuarantineLabColliders(physics: PhysicsWorld, layout: KitLayout): number {
  return buildKitColliders(physics, layout);
}

export function buildQuarantineLabMeshes(layout: KitLayout): Group {
  const group = buildKitMeshes(layout, PALETTE, (piece, mesh, _group, material) => {
    if (piece.kind !== 'pod') return;
    // A brighter, glossier cap so the pods read as lit/glowing against the sterile walls.
    mesh.material = material('pod-glow', 0x6dffb0, 0.15);
  });
  group.name = 'quarantine-lab';
  return group;
}
