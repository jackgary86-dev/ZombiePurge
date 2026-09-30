import { BoxGeometry, CylinderGeometry, Group, Mesh, SphereGeometry } from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import {
  buildKitColliders,
  buildKitMeshes,
  mulberry32,
  type KitDecorator,
  type KitLayout,
  type KitPiece,
} from './PlaceholderMapKit';
import type { RoadStrip } from './OpenFieldMap';

const WALL_HEIGHT = 6;
const BLOCK = 90;
const STREET_WIDTH = 9;

/**
 * E6/I7: Map 3. A tight grid of warehouses with narrow streets between them, a
 * few ramps, and a fenced loading-dock exit. Deterministic; the seed only
 * jitters warehouse size/rotation and which blocks get a ramp or crates.
 */
export function generateIndustrialCity(seed: number, size = 1100): KitLayout {
  const rng = mulberry32(seed);
  const half = size / 2;
  const pieces: KitPiece[] = [];
  const roads: RoadStrip[] = [];

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

  for (let k = -half; k <= half; k += BLOCK) {
    roads.push({ x1: k, z1: -half, x2: k, z2: half, width: STREET_WIDTH });
    roads.push({ x1: -half, z1: k, x2: half, z2: k, width: STREET_WIDTH });
  }

  // One big warehouse per block, leaving the grid streets clear.
  for (let bx = -half + BLOCK / 2; bx < half; bx += BLOCK) {
    for (let bz = -half + BLOCK / 2; bz < half; bz += BLOCK) {
      if (Math.abs(bx) < BLOCK && Math.abs(bz) < BLOCK) continue; // keep the centre courtyard open for the boss
      const w = BLOCK - STREET_WIDTH - 6 + rng() * 8;
      const d = BLOCK - STREET_WIDTH - 6 + rng() * 8;
      const h = 6 + rng() * 6;
      pieces.push({
        kind: 'warehouse',
        position: { x: bx + (rng() - 0.5) * 4, y: h / 2, z: bz + (rng() - 0.5) * 4 },
        halfExtents: { x: w / 2, y: h / 2, z: d / 2 },
        yaw: rng() < 0.2 ? (rng() - 0.5) * 0.15 : 0,
        pitch: 0,
      });
      if (rng() < 0.5) {
        pieces.push({
          kind: 'crate',
          position: { x: bx + w / 2 + 3, y: 1, z: bz - d / 4 },
          halfExtents: { x: 1.2, y: 1, z: 1.2 },
          yaw: rng() * Math.PI,
          pitch: 0,
        });
      }
    }
  }

  // A few ramps in the wider streets for a quick escape from a mob.
  for (let i = 0; i < Math.round(size / 220); i++) {
    const gx = Math.round((rng() * 2 - 1) * (half / BLOCK - 1)) * BLOCK;
    const gz = Math.round((rng() * 2 - 1) * (half / BLOCK - 1)) * BLOCK;
    pieces.push({
      kind: 'ramp',
      position: { x: gx, y: 1.4, z: gz },
      halfExtents: { x: 3.5, y: 0.4, z: 7 },
      yaw: Math.floor(rng() * 4) * (Math.PI / 2),
      pitch: Math.atan2(3, 14),
    });
  }

  // A fenced loading-dock gate at the far edge — the exit.
  const exit = { x: half - 12, z: 0 };
  for (const s of [-1, 1]) {
    pieces.push({
      kind: 'gate',
      position: { x: exit.x, y: 3.5, z: s * (STREET_WIDTH / 2 + 1.5) },
      halfExtents: { x: 0.6, y: 3.5, z: 0.6 },
      yaw: 0,
      pitch: 0,
    });
  }

  return {
    size,
    spawn: { x: -half + 20, y: 1.2, z: 10 },
    pieces,
    trees: [],
    roads,
    exit,
  };
}

const PALETTE = {
  ground: 0x4a4842,
  pieces: {
    wall: 0x3a3a3a,
    warehouse: 0x7a6a5a,
    crate: 0x6a5a3a,
    ramp: 0x5a5a5a,
    gate: 0xffcc33,
  },
  road: 0x2a2a2a,
};

export function buildIndustrialCityColliders(physics: PhysicsWorld, layout: KitLayout): number {
  return buildKitColliders(physics, layout);
}

/** S4: purely visual toppers per piece kind - `buildKitColliders` never sees any of this. */
const decorate: KitDecorator = (piece, _mesh, group, material) => {
  switch (piece.kind) {
    case 'warehouse': {
      const roofCap = new Mesh(
        new BoxGeometry(piece.halfExtents.x * 2.1, 0.4, piece.halfExtents.z * 2.1),
        material('roof-cap', 0x4a4038, 0.7)
      );
      roofCap.position.set(
        piece.position.x,
        piece.position.y + piece.halfExtents.y + 0.2,
        piece.position.z
      );
      roofCap.castShadow = true;
      group.add(roofCap);

      const vent = new Mesh(new CylinderGeometry(0.6, 0.6, 1, 8), material('vent', 0x8a8a8a, 0.5));
      vent.position.set(
        piece.position.x + piece.halfExtents.x * 0.4,
        piece.position.y + piece.halfExtents.y + 0.9,
        piece.position.z - piece.halfExtents.z * 0.3
      );
      vent.castShadow = true;
      group.add(vent);
      break;
    }
    case 'crate': {
      const strap = new Mesh(
        new BoxGeometry(piece.halfExtents.x * 2.05, 0.15, piece.halfExtents.z * 2.05),
        material('crate-strap', 0x2a2418, 0.8)
      );
      strap.position.set(piece.position.x, piece.position.y, piece.position.z);
      strap.castShadow = true;
      group.add(strap);
      break;
    }
    case 'gate': {
      const lamp = new Mesh(new SphereGeometry(0.35, 8, 6), material('gate-lamp', 0xffee88, 0.3));
      lamp.position.set(
        piece.position.x,
        piece.position.y + piece.halfExtents.y + 0.35,
        piece.position.z
      );
      group.add(lamp);
      break;
    }
    default:
      break;
  }
};

export function buildIndustrialCityMeshes(layout: KitLayout): Group {
  const group = buildKitMeshes(layout, PALETTE, decorate);
  group.name = 'industrial-city';
  return group;
}
