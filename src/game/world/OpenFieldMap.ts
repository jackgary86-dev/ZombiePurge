import type { GreyboxPiece } from './GreyboxMap';

export interface RoadStrip {
  /** Centre line from (x1,z1) to (x2,z2); roads are axis-aligned. */
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
}

export interface TreeSpot {
  x: number;
  z: number;
  height: number;
  canopy: number;
}

export interface ChunkData {
  /** Chunk grid coordinates (integers, may be negative). */
  cx: number;
  cz: number;
  pieces: GreyboxPiece[];
  trees: TreeSpot[];
  roads: RoadStrip[];
}

export interface ChunkedLayout {
  size: number;
  chunkSize: number;
  chunks: Map<string, ChunkData>;
  spawn: { x: number; y: number; z: number };
  roads: RoadStrip[];
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/** Chunk grid coordinate for a world position. */
export function chunkCoord(v: number, chunkSize: number): number {
  return Math.floor(v / chunkSize);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROAD_SPACING = 250;
const ROAD_WIDTH = 10;

/**
 * E1: deterministic 2 km-class open map. A road grid every 250 m, blocks of
 * buildings near intersections, scattered trees, wrecked cars and the odd ramp,
 * all bucketed into chunks so the streamer can load only what's near the car.
 */
export function generateOpenField(seed: number, size: number, chunkSize: number): ChunkedLayout {
  const rng = mulberry32(seed);
  const half = size / 2;
  const chunks = new Map<string, ChunkData>();
  const chunkOf = (x: number, z: number): ChunkData => {
    const cx = chunkCoord(x, chunkSize);
    const cz = chunkCoord(z, chunkSize);
    const key = chunkKey(cx, cz);
    let c = chunks.get(key);
    if (!c) {
      c = { cx, cz, pieces: [], trees: [], roads: [] };
      chunks.set(key, c);
    }
    return c;
  };
  const inside = (x: number, z: number, margin = 6) =>
    Math.abs(x) < half - margin && Math.abs(z) < half - margin;

  // Perimeter walls.
  const wallH = 4;
  const wall = (x: number, z: number, yaw: number) =>
    chunkOf(x, z).pieces.push({
      kind: 'wall',
      position: { x, y: wallH / 2, z },
      halfExtents: { x: half + 1, y: wallH / 2, z: 0.5 },
      yaw,
      pitch: 0,
    });
  wall(0, half + 0.5, 0);
  wall(0, -half - 0.5, 0);
  wall(half + 0.5, 0, Math.PI / 2);
  wall(-half - 0.5, 0, Math.PI / 2);

  // Road grid (visual strips; the ground collider is flat so roads need no physics).
  const roads: RoadStrip[] = [];
  for (let k = -half; k <= half; k += ROAD_SPACING) {
    roads.push({ x1: k, z1: -half, x2: k, z2: half, width: ROAD_WIDTH });
    roads.push({ x1: -half, z1: k, x2: half, z2: k, width: ROAD_WIDTH });
  }
  // Each chunk keeps the road segments crossing it, clipped to its bounds.
  for (const road of roads) {
    const vertical = road.x1 === road.x2;
    const from = vertical ? road.z1 : road.x1;
    const to = vertical ? road.z2 : road.x2;
    const fixed = vertical ? road.x1 : road.z1;
    for (let c = chunkCoord(from, chunkSize); c <= chunkCoord(to - 1e-6, chunkSize); c++) {
      const a = Math.max(from, c * chunkSize);
      const b = Math.min(to, (c + 1) * chunkSize);
      const cx = vertical ? chunkCoord(Math.min(fixed, half - 1e-6), chunkSize) : c;
      const cz = vertical ? c : chunkCoord(Math.min(fixed, half - 1e-6), chunkSize);
      const chunk = chunkOf(cx * chunkSize + 1, cz * chunkSize + 1);
      chunk.roads.push(
        vertical
          ? { x1: fixed, z1: a, x2: fixed, z2: b, width: road.width }
          : { x1: a, z1: fixed, x2: b, z2: fixed, width: road.width }
      );
    }
  }

  // Building blocks clustered around intersections.
  for (let ix = -half + ROAD_SPACING; ix < half; ix += ROAD_SPACING) {
    for (let iz = -half + ROAD_SPACING; iz < half; iz += ROAD_SPACING) {
      const buildings = 3 + Math.floor(rng() * 5);
      for (let b = 0; b < buildings; b++) {
        const sx = rng() < 0.5 ? -1 : 1;
        const sz = rng() < 0.5 ? -1 : 1;
        const x = ix + sx * (ROAD_WIDTH + 8 + rng() * 60);
        const z = iz + sz * (ROAD_WIDTH + 8 + rng() * 60);
        if (!inside(x, z, 20)) continue;
        const w = 6 + rng() * 10;
        const d = 6 + rng() * 10;
        const h = 4 + rng() * 10;
        chunkOf(x, z).pieces.push({
          kind: 'box',
          position: { x, y: h / 2, z },
          halfExtents: { x: w / 2, y: h / 2, z: d / 2 },
          yaw: rng() < 0.3 ? rng() * 0.4 - 0.2 : 0,
          pitch: 0,
        });
      }
    }
  }

  // Trees in the open, away from roads.
  const treeCount = Math.round((size * size) / 12000);
  for (let t = 0; t < treeCount; t++) {
    const x = (rng() * 2 - 1) * (half - 10);
    const z = (rng() * 2 - 1) * (half - 10);
    const nearRoad =
      Math.abs(((x + half) % ROAD_SPACING) - 0) < ROAD_WIDTH ||
      Math.abs(((z + half) % ROAD_SPACING) - 0) < ROAD_WIDTH;
    if (nearRoad) continue;
    chunkOf(x, z).trees.push({ x, z, height: 4 + rng() * 5, canopy: 2 + rng() * 2.5 });
  }

  // Wrecked cars on the roads and a few ramps.
  for (let i = 0; i < size / 40; i++) {
    const alongX = rng() < 0.5;
    const line = Math.round((rng() * 2 - 1) * (half / ROAD_SPACING)) * ROAD_SPACING;
    const along = (rng() * 2 - 1) * (half - 20);
    const x = alongX ? along : line + (rng() - 0.5) * 6;
    const z = alongX ? line + (rng() - 0.5) * 6 : along;
    if (!inside(x, z, 12)) continue;
    chunkOf(x, z).pieces.push({
      kind: 'box',
      position: { x, y: 0.7, z },
      halfExtents: { x: alongX ? 2 : 0.9, y: 0.7, z: alongX ? 0.9 : 2 },
      yaw: (rng() - 0.5) * 0.6,
      pitch: 0,
    });
  }
  for (let i = 0; i < size / 200; i++) {
    const x = (rng() * 2 - 1) * (half - 60);
    const z = (rng() * 2 - 1) * (half - 60);
    const yaw = Math.floor(rng() * 4) * (Math.PI / 2);
    chunkOf(x, z).pieces.push({
      kind: 'ramp',
      position: { x, y: 1.7, z },
      halfExtents: { x: 4, y: 0.5, z: 8 },
      yaw,
      pitch: Math.atan2(4, 16),
    });
  }

  return { size, chunkSize, chunks, spawn: { x: 5, y: 1.2, z: 5 }, roads };
}
