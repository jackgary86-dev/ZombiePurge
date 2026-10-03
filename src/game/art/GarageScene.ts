import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
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
const trimMaterial = new MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.7 });
const markingMaterial = new MeshBasicMaterial({ color: 0xd8c020 });
const fixtureHousingMaterial = new MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6 });
const fixtureLightMaterial = new MeshBasicMaterial({ color: 0xfff4d0 });
const doorPanelMaterial = new MeshStandardMaterial({ color: 0x6a6a70, roughness: 0.6 });
const doorGrooveMaterial = new MeshStandardMaterial({ color: 0x45454a, roughness: 0.6 });

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

  group.add(buildRoomDressing(cfg));

  return group;
}

const TRIM_HEIGHT = 0.15;

/**
 * S3: purely cosmetic dressing for the R1 room - a dark baseboard trim along each wall's own
 * inner face, a couple of ceiling light fixtures, painted floor markings around the build pad,
 * and a garage-door silhouette on the back wall. None of this touches `cfg.bounds` or adds a
 * collider - the avatar's movement clamp (`stepGarageAvatar`) and the walkable area are
 * unaffected, and nothing here is named 'wall' or 'floor' so the R1 room-shape tests still see
 * exactly the same four walls and one floor.
 */
function buildRoomDressing(cfg: GarageConfig): Group {
  const group = new Group();
  group.name = 'garage-room-dressing';

  // baseboard trim, flush against each wall's own inner face
  const trimInsetX = cfg.bounds.x - 0.01;
  const trimInsetZ = cfg.bounds.z - 0.01;
  const addTrim = (x: number, z: number, width: number, depth: number) => {
    const mesh = new Mesh(new BoxGeometry(width, TRIM_HEIGHT, depth), trimMaterial);
    mesh.position.set(x, TRIM_HEIGHT / 2, z);
    mesh.name = 'room-trim';
    group.add(mesh);
  };
  addTrim(0, -trimInsetZ, cfg.bounds.x * 2, 0.06);
  addTrim(0, trimInsetZ, cfg.bounds.x * 2, 0.06);
  addTrim(-trimInsetX, 0, 0.06, cfg.bounds.z * 2);
  addTrim(trimInsetX, 0, 0.06, cfg.bounds.z * 2);

  // a couple of simple ceiling light fixtures along the room's centreline
  const fixtureCount = Math.max(2, Math.round(cfg.bounds.z / 2.5));
  for (let i = 0; i < fixtureCount; i++) {
    const t = fixtureCount === 1 ? 0.5 : i / (fixtureCount - 1);
    const z = -cfg.bounds.z * 0.7 + t * cfg.bounds.z * 1.4;
    const fixture = new Group();
    fixture.name = 'light-fixture';
    const housing = new Mesh(new BoxGeometry(1.2, 0.12, 0.4), fixtureHousingMaterial);
    // a plain CylinderGeometry's flat round caps already face +/-Y - exactly the downward-facing
    // glow panel a ceiling fixture needs, no extra rotation required.
    const bulb = new Mesh(new CylinderGeometry(0.15, 0.15, 0.03, 12), fixtureLightMaterial);
    bulb.position.y = -0.08;
    fixture.add(housing, bulb);
    fixture.position.set(0, WALL_HEIGHT - 0.05, z);
    group.add(fixture);
  }

  // painted floor markings: a rectangular parking-bay outline around the build pad
  const markLine = (x: number, z: number, width: number, depth: number) => {
    const mesh = new Mesh(new PlaneGeometry(width, depth), markingMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.012, z);
    mesh.name = 'floor-marking';
    group.add(mesh);
  };
  const bayHalfX = Math.min(cfg.bounds.x * 0.55, 3.2);
  const bayHalfZ = Math.min(cfg.bounds.z * 0.55, 2.4);
  const lineWidth = 0.08;
  markLine(0, -bayHalfZ, bayHalfX * 2, lineWidth);
  markLine(0, bayHalfZ, bayHalfX * 2, lineWidth);
  markLine(-bayHalfX, 0, lineWidth, bayHalfZ * 2);
  markLine(bayHalfX, 0, lineWidth, bayHalfZ * 2);

  // a garage-door silhouette on the back wall (-z), a wide panel with a few horizontal grooves
  const doorGroup = new Group();
  doorGroup.name = 'garage-door';
  const doorWidth = cfg.bounds.x * 1.4;
  const doorHeight = WALL_HEIGHT * 0.8;
  const panel = new Mesh(new PlaneGeometry(doorWidth, doorHeight), doorPanelMaterial);
  panel.position.set(0, doorHeight / 2, -cfg.bounds.z - WALL_THICKNESS / 2 + 0.19);
  doorGroup.add(panel);
  const grooveCount = 4;
  for (let i = 1; i < grooveCount; i++) {
    const groove = new Mesh(new BoxGeometry(doorWidth * 0.96, 0.05, 0.02), doorGrooveMaterial);
    groove.position.set(
      0,
      (doorHeight * i) / grooveCount,
      -cfg.bounds.z - WALL_THICKNESS / 2 + 0.2
    );
    doorGroup.add(groove);
  }
  group.add(doorGroup);

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
// T7: shared, like the materials above - `syncDroppedMarkers()` (main.ts) rebuilds a fresh set
// of these markers every time a part is dropped/picked up, and `Object3D.clear()` only detaches
// the old meshes, it never disposes their geometry. A per-instance `new BoxGeometry(...)` would
// leak GPU buffer memory on every rebuild across a long session's worth of repeated Garage
// shopping; every marker is the same size, so one shared geometry removes the leak entirely.
const stationMarkerGeometry = new BoxGeometry(0.6, 0.9, 0.6);

/**
 * R2: a simple pedestal marking one walk-up shopping station (or a dropped part sitting on
 * the floor). Colour is the only thing distinguishing owned (already-bought, ready to carry)
 * from unowned (still purchasable) - swap `setOwned()` rather than rebuilding the mesh.
 */
export class GarageStationMarker {
  readonly mesh: Mesh;

  constructor() {
    this.mesh = new Mesh(stationMarkerGeometry, stationUnownedMaterial);
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
