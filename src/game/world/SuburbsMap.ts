import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { RoadStrip, TreeSpot } from './OpenFieldMap';

export type SuburbsPieceKind = 'wall' | 'house' | 'fence' | 'car' | 'gate' | 'bench' | 'fountain';

export interface SuburbsPiece {
  kind: SuburbsPieceKind;
  position: { x: number; y: number; z: number };
  halfExtents: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
}

export interface SuburbsLayout {
  size: number;
  spawn: { x: number; y: number; z: number };
  pieces: SuburbsPiece[];
  trees: TreeSpot[];
  roads: RoadStrip[];
  /** Where "reach the exit" points to (F2's E4 objective, and the minimap marker). */
  exit: { x: number; z: number };
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

const WALL_HEIGHT = 4;
const MAIN_ROAD_WIDTH = 12;
const STUB_ROAD_WIDTH = 9;
const TURNAROUND = 16;

/**
 * E4/I6: the tutorial map. Two cul-de-sacs of houses either side of a crossroads,
 * a park, and a signposted exit — small and readable enough to learn the game on.
 * Deterministic (the seed only jitters house size/position, never the layout shape).
 */
export function generateSuburbs(seed: number, size = 900): SuburbsLayout {
  const rng = mulberry32(seed);
  const half = size / 2;
  const pieces: SuburbsPiece[] = [];
  const trees: TreeSpot[] = [];
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

  // The crossroads: one road each way through the middle of the map.
  roads.push({ x1: 0, z1: -half, x2: 0, z2: half, width: MAIN_ROAD_WIDTH });
  roads.push({ x1: -half, z1: 0, x2: half, z2: 0, width: MAIN_ROAD_WIDTH });

  /** A dead-end residential stub off the crossroads, houses along both sides, a turnaround at the end. */
  function culDeSac(stubX: number, from: number, to: number, houses: number): void {
    roads.push({ x1: stubX, z1: from, x2: stubX, z2: to, width: STUB_ROAD_WIDTH });
    roads.push({
      x1: stubX - TURNAROUND,
      z1: to,
      x2: stubX + TURNAROUND,
      z2: to + TURNAROUND * 2,
      width: TURNAROUND * 2,
    });
    const side = stubX >= 0 ? 1 : -1;
    for (let i = 0; i < houses; i++) {
      const z = from + 20 + i * ((to - from - 20) / Math.max(1, houses - 1));
      for (const lane of [-1, 1]) {
        const hx = stubX + lane * side * (STUB_ROAD_WIDTH / 2 + 10 + rng() * 4);
        const w = 8 + rng() * 3;
        const d = 8 + rng() * 3;
        const h = 5 + rng() * 2;
        pieces.push({
          kind: 'house',
          position: { x: hx, y: h / 2, z },
          halfExtents: { x: w / 2, y: h / 2, z: d / 2 },
          yaw: lane * side < 0 ? Math.PI : 0,
          pitch: 0,
        });
        // A low front fence between the house and the street.
        const fenceZ = z - (lane * side < 0 ? -1 : 1) * (d / 2 + 3);
        pieces.push({
          kind: 'fence',
          position: { x: hx, y: 0.5, z: fenceZ },
          halfExtents: { x: w / 2 + 1, y: 0.5, z: 0.15 },
          yaw: 0,
          pitch: 0,
        });
      }
      // A parked car outside one house in three.
      if (i % 3 === 0) {
        pieces.push({
          kind: 'car',
          position: { x: stubX + side * (STUB_ROAD_WIDTH / 2 - 1.5), y: 0.7, z: z + 6 },
          halfExtents: { x: 0.9, y: 0.7, z: 2 },
          yaw: 0,
          pitch: 0,
        });
      }
    }
  }
  culDeSac(100, 40, 300, 4);
  culDeSac(-100, 40, 300, 4);

  // The park: open lawn in the +X/-Z quadrant, trees, benches and a fountain.
  const parkCx = half * 0.45;
  const parkCz = -half * 0.45;
  for (let i = 0; i < 14; i++) {
    const x = parkCx + (rng() * 2 - 1) * (half * 0.4);
    const z = parkCz + (rng() * 2 - 1) * (half * 0.4);
    trees.push({ x, z, height: 4 + rng() * 4, canopy: 2 + rng() * 2 });
  }
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    pieces.push({
      kind: 'bench',
      position: {
        x: parkCx + Math.cos(angle) * 20,
        y: 0.4,
        z: parkCz + Math.sin(angle) * 20,
      },
      halfExtents: { x: 1.6, y: 0.4, z: 0.5 },
      yaw: angle,
      pitch: 0,
    });
  }
  pieces.push({
    kind: 'fountain',
    position: { x: parkCx, y: 0.6, z: parkCz },
    halfExtents: { x: 2.5, y: 0.6, z: 2.5 },
    yaw: 0,
    pitch: 0,
  });

  // The exit: a signposted road stub out of the -X/-Z quadrant to the map edge.
  const exitZ = -half * 0.5;
  roads.push({ x1: -half, z1: exitZ, x2: -60, z2: exitZ, width: MAIN_ROAD_WIDTH });
  const exit = { x: -half + 6, z: exitZ };
  for (const s of [-1, 1]) {
    pieces.push({
      kind: 'gate',
      position: { x: exit.x, y: 3, z: exitZ + s * (MAIN_ROAD_WIDTH / 2 + 1.5) },
      halfExtents: { x: 0.6, y: 3, z: 0.6 },
      yaw: 0,
      pitch: 0,
    });
  }

  // A few street trees for atmosphere along the crossroads.
  for (let i = 0; i < 10; i++) {
    const x = (rng() * 2 - 1) * (half - 20);
    const z = (rng() * 2 - 1) * (half - 20);
    if (Math.abs(x) < 24 || Math.abs(z) < 24) continue; // keep the crossroads clear
    if (x > 20 && z < -20) continue; // keep the park's own trees uncluttered
    trees.push({ x, z, height: 4 + rng() * 3, canopy: 2 + rng() * 1.5 });
  }

  return { size, spawn: { x: 12, y: 1.2, z: 12 }, pieces, trees, roads, exit };
}

export function suburbsPieceQuaternion(piece: SuburbsPiece): Quaternion {
  return new Quaternion().setFromEuler(new Euler(piece.pitch, piece.yaw, 0, 'YXZ'));
}

export function buildSuburbsColliders(physics: PhysicsWorld, layout: SuburbsLayout): number {
  physics.addGround(layout.size / 2 + 4);
  for (const piece of layout.pieces) {
    const q = suburbsPieceQuaternion(piece);
    physics.addStaticBox(piece.position, piece.halfExtents, { x: q.x, y: q.y, z: q.z, w: q.w });
  }
  for (const tree of layout.trees) {
    physics.addStaticBox(
      { x: tree.x, y: tree.height / 2, z: tree.z },
      { x: 0.35, y: tree.height / 2, z: 0.35 }
    );
  }
  return layout.pieces.length + layout.trees.length + 1;
}

const PIECE_COLORS: Record<SuburbsPieceKind, number> = {
  wall: 0x5a5a5a,
  house: 0xc9a876,
  fence: 0xe8e4d8,
  car: 0x7a8a9a,
  gate: 0xffd84a,
  bench: 0x6a4a2a,
  fountain: 0x9ab4c8,
};
const ROOF_COLOR = 0x8a4a3a;

const trunkGeometry = new CylinderGeometry(0.25, 0.35, 1, 6);
const canopyGeometry = new SphereGeometry(1, 8, 6);

export function buildSuburbsMeshes(layout: SuburbsLayout): Group {
  const group = new Group();
  group.name = 'suburbs';

  const ground = new Mesh(
    new PlaneGeometry(layout.size, layout.size, 1, 1),
    new MeshStandardMaterial({ color: new Color(0x4a5a3a), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  const materials = new Map<string, MeshStandardMaterial>();
  const material = (key: string, color: number) => {
    let m = materials.get(key);
    if (!m) {
      m = new MeshStandardMaterial({ color, roughness: 0.9 });
      materials.set(key, m);
    }
    return m;
  };

  for (const piece of layout.pieces) {
    const mesh = new Mesh(
      new BoxGeometry(piece.halfExtents.x * 2, piece.halfExtents.y * 2, piece.halfExtents.z * 2),
      material(piece.kind, PIECE_COLORS[piece.kind])
    );
    mesh.position.set(piece.position.x, piece.position.y, piece.position.z);
    mesh.quaternion.copy(suburbsPieceQuaternion(piece));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = piece.kind;
    group.add(mesh);

    if (piece.kind === 'house') {
      const roofHeight = piece.halfExtents.y * 0.9;
      const roof = new Mesh(
        new ConeGeometry(Math.max(piece.halfExtents.x, piece.halfExtents.z) * 1.25, roofHeight, 4),
        material('roof', ROOF_COLOR)
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.set(
        piece.position.x,
        piece.position.y + piece.halfExtents.y + roofHeight / 2,
        piece.position.z
      );
      roof.castShadow = true;
      group.add(roof);
    } else if (piece.kind === 'fountain') {
      const water = new Mesh(
        new CylinderGeometry(piece.halfExtents.x * 0.6, piece.halfExtents.x * 0.6, 0.2, 12),
        material('water', 0x4a90c8)
      );
      water.position.set(
        piece.position.x,
        piece.position.y + piece.halfExtents.y + 0.1,
        piece.position.z
      );
      group.add(water);
    } else if (piece.kind === 'car') {
      // S4: a smaller cabin bump toward the rear so parked cars read as cars, not bricks.
      const cabin = new Mesh(
        new BoxGeometry(piece.halfExtents.x * 1.5, piece.halfExtents.y * 0.9, piece.halfExtents.z),
        material('car-cabin', PIECE_COLORS.car)
      );
      cabin.position.set(
        piece.position.x,
        piece.position.y + piece.halfExtents.y * 1.35,
        piece.position.z - piece.halfExtents.z * 0.15
      );
      cabin.quaternion.copy(mesh.quaternion);
      cabin.castShadow = true;
      group.add(cabin);
    }
  }

  for (const tree of layout.trees) {
    const trunk = new Mesh(trunkGeometry, material('trunk', 0x5a3d2a));
    trunk.scale.set(1, tree.height, 1);
    trunk.position.set(tree.x, tree.height / 2, tree.z);
    trunk.castShadow = true;
    const canopy = new Mesh(canopyGeometry, material('canopy', 0x3f7a3a));
    canopy.scale.setScalar(tree.canopy);
    canopy.position.set(tree.x, tree.height + tree.canopy * 0.6, tree.z);
    canopy.castShadow = true;
    group.add(trunk, canopy);
  }

  for (const road of layout.roads) {
    const vertical = road.x1 === road.x2;
    const length = vertical ? road.z2 - road.z1 : road.x2 - road.x1;
    const strip = new Mesh(
      new PlaneGeometry(vertical ? road.width : length, vertical ? length : road.width),
      material('road', 0x2e2e32)
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set((road.x1 + road.x2) / 2, 0.02, (road.z1 + road.z2) / 2);
    strip.receiveShadow = true;
    group.add(strip);
  }

  return group;
}

export function suburbsSpawn(layout: SuburbsLayout): Vector3 {
  return new Vector3(layout.spawn.x, layout.spawn.y, layout.spawn.z);
}
