import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import type { PhysicsWorld, RAPIER } from '../physics/PhysicsWorld';
import { pieceQuaternion, type GreyboxPieceKind } from './GreyboxMap';
import { chunkCoord, chunkKey, type ChunkData, type ChunkedLayout } from './OpenFieldMap';

interface LoadedChunk {
  group: Group;
  bodies: RAPIER.RigidBody[];
}

const PIECE_COLORS: Record<GreyboxPieceKind, number> = {
  wall: 0x5a5a5a,
  box: 0x8a7f6a,
  ramp: 0x7a8a6a,
  pillar: 0x6a6f7a,
};

const materials = new Map<string, MeshStandardMaterial>();
function material(key: string, color: number, roughness = 0.9): MeshStandardMaterial {
  let m = materials.get(key);
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness });
    materials.set(key, m);
  }
  return m;
}

const trunkGeometry = new CylinderGeometry(0.25, 0.35, 1, 6);
const canopyGeometry = new SphereGeometry(1, 8, 6);

/**
 * E1: keeps only the chunks near the car resident - meshes in the scene and static
 * colliders in the physics world - and drops the rest as the car moves away.
 */
export class ChunkStreamer {
  readonly root = new Group();
  private readonly loaded = new Map<string, LoadedChunk>();
  private lastCenter: string | null = null;

  constructor(
    private readonly layout: ChunkedLayout,
    private readonly physics: PhysicsWorld,
    /** Chunks whose nearest edge is within this distance of the car stay loaded. */
    private readonly loadRadius: number
  ) {
    this.root.name = 'chunks';
    const ground = new Mesh(
      new PlaneGeometry(layout.size, layout.size, 1, 1),
      material('ground', 0x4a5a3a, 1)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.root.add(ground);
    physics.addGround(layout.size / 2 + 4);
  }

  get loadedCount(): number {
    return this.loaded.size;
  }

  isLoaded(cx: number, cz: number): boolean {
    return this.loaded.has(chunkKey(cx, cz));
  }

  /** Call with the car position; cheap when the car hasn't crossed a chunk boundary. */
  update(position: Vector3, force = false): void {
    const cs = this.layout.chunkSize;
    const centerKey = chunkKey(chunkCoord(position.x, cs), chunkCoord(position.z, cs));
    if (!force && centerKey === this.lastCenter) return;
    this.lastCenter = centerKey;

    const wanted = new Set<string>();
    const reach = Math.ceil(this.loadRadius / cs);
    const ccx = chunkCoord(position.x, cs);
    const ccz = chunkCoord(position.z, cs);
    for (let cx = ccx - reach; cx <= ccx + reach; cx++) {
      for (let cz = ccz - reach; cz <= ccz + reach; cz++) {
        // Distance from the car to the chunk's nearest edge.
        const dx = Math.max(cx * cs - position.x, 0, position.x - (cx + 1) * cs);
        const dz = Math.max(cz * cs - position.z, 0, position.z - (cz + 1) * cs);
        if (Math.hypot(dx, dz) <= this.loadRadius) wanted.add(chunkKey(cx, cz));
      }
    }

    for (const key of [...this.loaded.keys()]) if (!wanted.has(key)) this.unload(key);
    for (const key of wanted) {
      if (this.loaded.has(key)) continue;
      const chunk = this.layout.chunks.get(key);
      if (chunk) this.load(key, chunk);
    }
  }

  private load(key: string, chunk: ChunkData): void {
    const group = new Group();
    group.name = `chunk ${key}`;
    const bodies: RAPIER.RigidBody[] = [];

    for (const piece of chunk.pieces) {
      const mesh = new Mesh(
        new BoxGeometry(piece.halfExtents.x * 2, piece.halfExtents.y * 2, piece.halfExtents.z * 2),
        material(piece.kind, PIECE_COLORS[piece.kind])
      );
      mesh.position.set(piece.position.x, piece.position.y, piece.position.z);
      const q = pieceQuaternion(piece);
      mesh.quaternion.copy(q);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      const collider = this.physics.addStaticBox(piece.position, piece.halfExtents, {
        x: q.x,
        y: q.y,
        z: q.z,
        w: q.w,
      });
      bodies.push(collider.parent()!);
    }

    for (const tree of chunk.trees) {
      const trunk = new Mesh(trunkGeometry, material('trunk', 0x5a3d2a));
      trunk.scale.set(1, tree.height, 1);
      trunk.position.set(tree.x, tree.height / 2, tree.z);
      trunk.castShadow = true;
      const canopy = new Mesh(canopyGeometry, material('canopy', 0x3f7a3a));
      canopy.scale.setScalar(tree.canopy);
      canopy.position.set(tree.x, tree.height + tree.canopy * 0.6, tree.z);
      canopy.castShadow = true;
      group.add(trunk, canopy);
      const collider = this.physics.addStaticBox(
        { x: tree.x, y: tree.height / 2, z: tree.z },
        { x: 0.35, y: tree.height / 2, z: 0.35 }
      );
      bodies.push(collider.parent()!);
    }

    for (const road of chunk.roads) {
      const vertical = road.x1 === road.x2;
      const length = vertical ? road.z2 - road.z1 : road.x2 - road.x1;
      const strip = new Mesh(
        new PlaneGeometry(vertical ? road.width : length, vertical ? length : road.width),
        material('road', 0x2e2e32, 0.95)
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set((road.x1 + road.x2) / 2, 0.02, (road.z1 + road.z2) / 2);
      strip.receiveShadow = true;
      group.add(strip);
    }

    this.root.add(group);
    this.loaded.set(key, { group, bodies });
  }

  private unload(key: string): void {
    const chunk = this.loaded.get(key);
    if (!chunk) return;
    this.root.remove(chunk.group);
    chunk.group.traverse((o) => {
      if (o instanceof Mesh && o.geometry !== trunkGeometry && o.geometry !== canopyGeometry)
        o.geometry.dispose();
    });
    for (const body of chunk.bodies) this.physics.world.removeRigidBody(body);
    this.loaded.delete(key);
  }

  dispose(): void {
    for (const key of [...this.loaded.keys()]) this.unload(key);
  }
}
