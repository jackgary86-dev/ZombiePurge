import {
  BoxGeometry,
  Color,
  Euler,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

export type GreyboxPieceKind = 'wall' | 'box' | 'ramp' | 'pillar';

export interface GreyboxPiece {
  kind: GreyboxPieceKind;
  position: { x: number; y: number; z: number };
  halfExtents: { x: number; y: number; z: number };
  /** Yaw around Y, then pitch around the local X axis (ramps tilt with pitch). */
  yaw: number;
  pitch: number;
}

export interface GreyboxLayout {
  size: number;
  spawn: { x: number; y: number; z: number };
  pieces: GreyboxPiece[];
}

const WALL_HEIGHT = 4;
const WALL_THICKNESS = 1;

/**
 * Deterministic test arena: a flat square with perimeter walls, a ring of ramps
 * around the middle, a slalom of boxes and a grid of pillars in one corner.
 */
export function createGreyboxLayout(size = 500): GreyboxLayout {
  const half = size / 2;
  const pieces: GreyboxPiece[] = [];

  const wall = (x: number, z: number, yaw: number) =>
    pieces.push({
      kind: 'wall',
      position: { x, y: WALL_HEIGHT / 2, z },
      halfExtents: { x: half + WALL_THICKNESS, y: WALL_HEIGHT / 2, z: WALL_THICKNESS / 2 },
      yaw,
      pitch: 0,
    });
  wall(0, half + WALL_THICKNESS / 2, 0);
  wall(0, -half - WALL_THICKNESS / 2, 0);
  wall(half + WALL_THICKNESS / 2, 0, Math.PI / 2);
  wall(-half - WALL_THICKNESS / 2, 0, Math.PI / 2);

  // Four ramps facing inward around a ring, 60 m from the centre.
  const rampLength = 16;
  const rampPitch = Math.atan2(4, rampLength);
  const ring = 60;
  for (let i = 0; i < 4; i++) {
    const yaw = (i * Math.PI) / 2;
    const x = Math.sin(yaw) * ring;
    const z = Math.cos(yaw) * ring;
    pieces.push({
      kind: 'ramp',
      position: { x, y: 1.7, z },
      halfExtents: { x: 4, y: 0.5, z: rampLength / 2 },
      yaw: yaw + Math.PI,
      pitch: rampPitch,
    });
  }

  // Slalom boxes along +X.
  for (let i = 0; i < 8; i++) {
    pieces.push({
      kind: 'box',
      position: { x: 100 + i * 12, y: 1, z: i % 2 === 0 ? -6 : 6 },
      halfExtents: { x: 1.5, y: 1, z: 1.5 },
      yaw: 0,
      pitch: 0,
    });
  }

  // A "city block" grid of pillars in the -X/-Z quadrant.
  for (let gx = 0; gx < 5; gx++) {
    for (let gz = 0; gz < 5; gz++) {
      pieces.push({
        kind: 'pillar',
        position: { x: -80 - gx * 25, y: 4, z: -80 - gz * 25 },
        halfExtents: { x: 3, y: 4, z: 3 },
        yaw: 0,
        pitch: 0,
      });
    }
  }

  // A few large blocks to test camera collision.
  pieces.push({
    kind: 'box',
    position: { x: 0, y: 5, z: 140 },
    halfExtents: { x: 20, y: 5, z: 8 },
    yaw: 0,
    pitch: 0,
  });
  pieces.push({
    kind: 'box',
    position: { x: -150, y: 6, z: 100 },
    halfExtents: { x: 10, y: 6, z: 30 },
    yaw: 0.4,
    pitch: 0,
  });

  return { size, spawn: { x: 0, y: 1.2, z: -20 }, pieces };
}

export function pieceQuaternion(piece: GreyboxPiece): Quaternion {
  return new Quaternion().setFromEuler(new Euler(piece.pitch, piece.yaw, 0, 'YXZ'));
}

export function buildGreyboxColliders(physics: PhysicsWorld, layout: GreyboxLayout): number {
  physics.addGround(layout.size / 2 + WALL_THICKNESS * 2);
  for (const piece of layout.pieces) {
    const q = pieceQuaternion(piece);
    physics.addStaticBox(piece.position, piece.halfExtents, { x: q.x, y: q.y, z: q.z, w: q.w });
  }
  return layout.pieces.length + 1;
}

const PIECE_COLORS: Record<GreyboxPieceKind, number> = {
  wall: 0x5a5a5a,
  box: 0x8a7f6a,
  ramp: 0x7a8a6a,
  pillar: 0x6a6f7a,
};

export function buildGreyboxMeshes(layout: GreyboxLayout): Group {
  const group = new Group();
  group.name = 'greybox';

  const ground = new Mesh(
    new PlaneGeometry(layout.size, layout.size, 1, 1),
    new MeshStandardMaterial({ color: new Color(0x3d3d3d), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  const materials = new Map<GreyboxPieceKind, MeshStandardMaterial>();
  for (const piece of layout.pieces) {
    let material = materials.get(piece.kind);
    if (!material) {
      material = new MeshStandardMaterial({ color: PIECE_COLORS[piece.kind], roughness: 0.9 });
      materials.set(piece.kind, material);
    }
    const mesh = new Mesh(
      new BoxGeometry(piece.halfExtents.x * 2, piece.halfExtents.y * 2, piece.halfExtents.z * 2),
      material
    );
    mesh.position.set(piece.position.x, piece.position.y, piece.position.z);
    mesh.quaternion.copy(pieceQuaternion(piece));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = piece.kind;
    group.add(mesh);
  }
  return group;
}

export function greyboxSpawn(layout: GreyboxLayout): Vector3 {
  return new Vector3(layout.spawn.x, layout.spawn.y, layout.spawn.z);
}
