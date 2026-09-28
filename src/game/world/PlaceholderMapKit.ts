import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
} from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { RoadStrip, TreeSpot } from './OpenFieldMap';

/**
 * E5-E8/I7: the shared bones behind every story map from Desert Highway on —
 * the same deterministic-RNG, box-piece-plus-tree-plus-road approach as
 * GreyboxMap/SuburbsMap, factored out so each new map file is just its own
 * layout algorithm and palette instead of re-deriving this plumbing.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface KitPiece {
  /** Any string; the palette and an optional decorator key off it. */
  kind: string;
  position: { x: number; y: number; z: number };
  halfExtents: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
}

export interface KitLayout {
  size: number;
  spawn: { x: number; y: number; z: number };
  pieces: KitPiece[];
  trees: TreeSpot[];
  roads: RoadStrip[];
  /** Where this map's "reach the exit" objective points to. */
  exit: { x: number; z: number };
}

export function kitPieceQuaternion(piece: KitPiece): Quaternion {
  return new Quaternion().setFromEuler(new Euler(piece.pitch, piece.yaw, 0, 'YXZ'));
}

/** Ground plane plus one static box per piece and per tree trunk. */
export function buildKitColliders(physics: PhysicsWorld, layout: KitLayout): number {
  physics.addGround(layout.size / 2 + 4);
  for (const piece of layout.pieces) {
    const q = kitPieceQuaternion(piece);
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

export interface KitPalette {
  ground: number;
  /** Colour per piece `kind`; a kind missing here falls back to `0x808080`. */
  pieces: Record<string, number>;
  road?: number;
  treeTrunk?: number;
  treeCanopy?: number;
}

export type KitMaterialFn = (
  key: string,
  color: number,
  roughness?: number
) => MeshStandardMaterial;

/** Called once per piece, after its base box mesh is added, for map-specific toppers. */
export type KitDecorator = (
  piece: KitPiece,
  mesh: Mesh,
  group: Group,
  material: KitMaterialFn
) => void;

const trunkGeometry = new CylinderGeometry(0.25, 0.35, 1, 6);
const canopyGeometry = new SphereGeometry(1, 8, 6);

export function buildKitMeshes(
  layout: KitLayout,
  palette: KitPalette,
  decorate?: KitDecorator
): Group {
  const group = new Group();
  group.name = 'kit-map';

  const ground = new Mesh(
    new PlaneGeometry(layout.size, layout.size, 1, 1),
    new MeshStandardMaterial({ color: new Color(palette.ground), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  const materials = new Map<string, MeshStandardMaterial>();
  const material: KitMaterialFn = (key, color, roughness = 0.9) => {
    let m = materials.get(key);
    if (!m) {
      m = new MeshStandardMaterial({ color, roughness });
      materials.set(key, m);
    }
    return m;
  };

  for (const piece of layout.pieces) {
    const mesh = new Mesh(
      new BoxGeometry(piece.halfExtents.x * 2, piece.halfExtents.y * 2, piece.halfExtents.z * 2),
      material(piece.kind, palette.pieces[piece.kind] ?? 0x808080)
    );
    mesh.position.set(piece.position.x, piece.position.y, piece.position.z);
    mesh.quaternion.copy(kitPieceQuaternion(piece));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = piece.kind;
    group.add(mesh);
    decorate?.(piece, mesh, group, material);
  }

  for (const tree of layout.trees) {
    const trunk = new Mesh(trunkGeometry, material('trunk', palette.treeTrunk ?? 0x5a3d2a));
    trunk.scale.set(1, tree.height, 1);
    trunk.position.set(tree.x, tree.height / 2, tree.z);
    trunk.castShadow = true;
    const canopy = new Mesh(canopyGeometry, material('canopy', palette.treeCanopy ?? 0x3f7a3a));
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
      material('road', palette.road ?? 0x2e2e32)
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set((road.x1 + road.x2) / 2, 0.02, (road.z1 + road.z2) / 2);
    strip.receiveShadow = true;
    group.add(strip);
  }

  return group;
}
