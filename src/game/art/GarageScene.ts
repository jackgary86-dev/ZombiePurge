import {
  BoxGeometry,
  CapsuleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
} from 'three';
import type { GarageConfig } from '../../data/types';
import type { GarageAvatarState } from '../garageScene/GarageAvatar';

const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.4;

const floorMaterial = new MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.95 });
const wallMaterial = new MeshStandardMaterial({ color: 0x55565a, roughness: 0.85 });

/**
 * R1: the walkable Garage room's static dressing - a floor patch and four walls sized to
 * `cfg.bounds`. Purely visual (no colliders); the avatar's own movement is clamped to the
 * same bounds in `stepGarageAvatar()` rather than relying on physical wall collision, so this
 * never needs to touch the physics world when the Garage is shown or hidden.
 */
export function buildGarageRoom(cfg: GarageConfig): Group {
  const group = new Group();
  group.name = 'garage-room';

  const floor = new Mesh(new PlaneGeometry(cfg.bounds.x * 2, cfg.bounds.z * 2), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  floor.receiveShadow = true;
  floor.name = 'floor';
  group.add(floor);

  const wall = (x: number, z: number, width: number, depth: number) => {
    const mesh = new Mesh(new BoxGeometry(width, WALL_HEIGHT, depth), wallMaterial);
    mesh.position.set(x, WALL_HEIGHT / 2, z);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = 'wall';
    group.add(mesh);
  };
  const outerWidth = cfg.bounds.x * 2 + WALL_THICKNESS * 2;
  const outerDepth = cfg.bounds.z * 2 + WALL_THICKNESS * 2;
  wall(0, -cfg.bounds.z - WALL_THICKNESS / 2, outerWidth, WALL_THICKNESS);
  wall(0, cfg.bounds.z + WALL_THICKNESS / 2, outerWidth, WALL_THICKNESS);
  wall(-cfg.bounds.x - WALL_THICKNESS / 2, 0, WALL_THICKNESS, outerDepth);
  wall(cfg.bounds.x + WALL_THICKNESS / 2, 0, WALL_THICKNESS, outerDepth);

  return group;
}

const avatarMaterial = new MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.7 });

/**
 * R1: a simple placeholder figure for the player's own avatar - the same capsule+sphere
 * economy as the L4 driver figure seated in the car, just standing instead of seated.
 */
export class GarageAvatarView {
  readonly group: Group;

  constructor() {
    this.group = new Group();
    this.group.name = 'garage-avatar';
    const torso = new Mesh(new CapsuleGeometry(0.22, 0.55, 4, 8), avatarMaterial);
    torso.position.y = 0.9;
    const head = new Mesh(new SphereGeometry(0.16, 8, 6), avatarMaterial);
    head.position.y = 1.35;
    torso.castShadow = true;
    head.castShadow = true;
    this.group.add(torso, head);
  }

  /** `worldX`/`worldZ` place the build pad's own world position; `state` is local to it. */
  sync(state: GarageAvatarState, worldX: number, worldZ: number): void {
    this.group.position.set(worldX + state.x, 0, worldZ + state.z);
    this.group.rotation.y = state.facing;
  }
}

const stationOwnedMaterial = new MeshStandardMaterial({ color: 0x5a6a58, roughness: 0.8 });
const stationUnownedMaterial = new MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.7 });
const carriedMaterial = new MeshStandardMaterial({
  color: 0xe0c040,
  emissive: 0x443000,
  roughness: 0.4,
});

/**
 * R2: a simple pedestal marking one walk-up shopping station (or a dropped part sitting on
 * the floor). Colour is the only thing distinguishing owned (already-bought, ready to carry)
 * from unowned (still purchasable) - swap `setOwned()` rather than rebuilding the mesh.
 */
export class GarageStationMarker {
  readonly mesh: Mesh;

  constructor() {
    this.mesh = new Mesh(new BoxGeometry(0.6, 0.9, 0.6), stationUnownedMaterial);
    this.mesh.position.y = 0.45;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  setOwned(owned: boolean): void {
    this.mesh.material = owned ? stationOwnedMaterial : stationUnownedMaterial;
  }
}

/** R2: a small marker hovering above the avatar's head while it's carrying a part. */
export function buildCarriedMarker(): Mesh {
  const mesh = new Mesh(new BoxGeometry(0.22, 0.22, 0.22), carriedMaterial);
  mesh.position.y = 1.7;
  return mesh;
}

const zoneDimMaterial = new MeshBasicMaterial({
  color: 0x8a8a8a,
  transparent: true,
  opacity: 0.35,
  side: DoubleSide,
});
const zoneHighlightMaterial = new MeshBasicMaterial({
  color: 0x5ad85a,
  transparent: true,
  opacity: 0.85,
  side: DoubleSide,
});

/**
 * R3: a flat ring marking one snap zone on the car, parented directly onto the car's own
 * group so it automatically tracks the car's position/orientation with no per-frame
 * transform of its own. Dim by default; `setHighlighted()` lights it up bright green while
 * it's the live target for whatever the player is currently carrying (or standing at, to
 * pick something back up) - the actual proximity/validity logic lives in `SnapZones.ts`.
 */
export class SnapZoneMarker {
  readonly mesh: Mesh;

  constructor(radius: number) {
    this.mesh = new Mesh(new RingGeometry(radius * 0.6, radius, 24), zoneDimMaterial);
    this.mesh.rotation.x = -Math.PI / 2;
  }

  setHighlighted(highlighted: boolean): void {
    this.mesh.material = highlighted ? zoneHighlightMaterial : zoneDimMaterial;
  }
}
