import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, SphereGeometry, Vector3 } from 'three';
import type {
  DriveTrailConfig,
  MapConfig,
  MuzzleFlashConfig,
  SkidMarkConfig,
} from '../../data/types';

/** I9: the drive trail's base tint per map, taken from docs/ART_PROMPT.md §3.5's ground colour -
 * dust and snow both read as "kicked-up ground", so they share the map's own palette. */
export function driveTrailColor(generator: MapConfig['generator']): number {
  switch (generator) {
    case 'suburbs':
      return 0x6b7b4a;
    case 'desertHighway':
      return 0xc98d4b;
    case 'industrialCity':
      return 0x4a4f52;
    case 'frozenForest':
      return 0xdfe8f0;
    case 'quarantineLab':
      return 0x3a4a3d;
    case 'slaughterRoad':
      return 0x2a2622;
    default:
      return 0x3d3d3d;
  }
}

const muzzleGeometry = new SphereGeometry(1, 8, 6);

/**
 * I9: a brief flash at the weapon mount on each shot fired. `trigger()` is called once per
 * shot (from the fixed-step weapon update, alongside ShotTracers.add); `update()` fades it,
 * called every render frame like the other pooled VFX views.
 */
export class MuzzleFlashView {
  readonly mesh: Mesh;
  private life = Infinity;

  constructor(private readonly cfg: MuzzleFlashConfig) {
    this.mesh = new Mesh(
      muzzleGeometry,
      new MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0, depthWrite: false })
    );
    this.mesh.visible = false;
  }

  trigger(origin: Vector3): void {
    this.mesh.position.copy(origin);
    this.mesh.visible = true;
    this.life = 0;
  }

  update(dt: number): void {
    if (this.life === Infinity) return;
    this.life += dt;
    const t = this.life / this.cfg.durationSeconds;
    if (t >= 1) {
      this.mesh.visible = false;
      this.life = Infinity;
      (this.mesh.material as MeshBasicMaterial).opacity = 0;
      return;
    }
    (this.mesh.material as MeshBasicMaterial).opacity = 1 - t;
    this.mesh.scale.setScalar(this.cfg.size * (1 - 0.4 * t));
  }
}

const skidGeometry = new PlaneGeometry(0.28, 0.9).rotateX(-Math.PI / 2);

/**
 * I9: tyre-skid decals dropped in world space behind the rear wheels while sliding - unlike
 * BloodSplatterView these must stay put on the ground rather than riding along with the car.
 */
export class SkidMarkView {
  readonly group = new Group();
  private readonly marks: Mesh[] = [];
  private readonly ages: number[] = [];
  private sinceLastDrop = Infinity;

  constructor(private readonly cfg: SkidMarkConfig) {}

  /** Called every render frame; `skidding` and `rearWheelPositions` reflect this tick's state. */
  update(dt: number, skidding: boolean, rearWheelPositions: readonly Vector3[]): void {
    this.sinceLastDrop += dt;
    if (skidding && this.sinceLastDrop >= this.cfg.intervalSeconds) {
      this.sinceLastDrop = 0;
      for (const pos of rearWheelPositions) this.drop(pos);
    }
    for (let i = this.ages.length - 1; i >= 0; i--) {
      this.ages[i] += dt;
      const t = this.ages[i] / this.cfg.lifetimeSeconds;
      if (t >= 1) {
        this.group.remove(this.marks[i]);
        (this.marks[i].material as MeshBasicMaterial).dispose();
        this.marks.splice(i, 1);
        this.ages.splice(i, 1);
      } else {
        (this.marks[i].material as MeshBasicMaterial).opacity = 0.5 * (1 - t);
      }
    }
  }

  private drop(pos: Vector3): void {
    if (this.marks.length >= this.cfg.maxMarks) {
      const oldest = this.marks.shift()!;
      this.ages.shift();
      this.group.remove(oldest);
      (oldest.material as MeshBasicMaterial).dispose();
    }
    const mesh = new Mesh(
      skidGeometry,
      new MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.5, depthWrite: false })
    );
    mesh.position.copy(pos);
    mesh.position.y += 0.01; // avoid z-fighting with the ground
    this.group.add(mesh);
    this.marks.push(mesh);
    this.ages.push(0);
  }

  get count(): number {
    return this.marks.length;
  }
}

const puffGeometry = new SphereGeometry(0.4, 6, 5);

/** I9: dust/snow puffs kicked up behind the car while driving fast; colour set per-map by main.ts
 * via `driveTrailColor`. World-space, same pooled-and-fading pattern as SkidMarkView. */
export class DriveTrailView {
  readonly group = new Group();
  private readonly puffs: Mesh[] = [];
  private readonly ages: number[] = [];
  private sinceLastSpawn = Infinity;

  constructor(private readonly cfg: DriveTrailConfig) {}

  /** Called every render frame with the car's current forward speed and rear-centre position. */
  update(dt: number, speed: number, rearOrigin: Vector3, color: number): void {
    this.sinceLastSpawn += dt;
    if (speed >= this.cfg.minSpeed && this.sinceLastSpawn >= this.cfg.intervalSeconds) {
      this.sinceLastSpawn = 0;
      this.spawn(rearOrigin, color);
    }
    for (let i = this.ages.length - 1; i >= 0; i--) {
      this.ages[i] += dt;
      const t = this.ages[i] / this.cfg.lifetimeSeconds;
      const mesh = this.puffs[i];
      if (t >= 1) {
        this.group.remove(mesh);
        (mesh.material as MeshBasicMaterial).dispose();
        this.puffs.splice(i, 1);
        this.ages.splice(i, 1);
      } else {
        mesh.scale.setScalar(1 + t * 1.6);
        (mesh.material as MeshBasicMaterial).opacity = 0.35 * (1 - t);
      }
    }
  }

  private spawn(origin: Vector3, color: number): void {
    if (this.puffs.length >= this.cfg.maxPuffs) {
      const oldest = this.puffs.shift()!;
      this.ages.shift();
      this.group.remove(oldest);
      (oldest.material as MeshBasicMaterial).dispose();
    }
    const mesh = new Mesh(
      puffGeometry,
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })
    );
    mesh.position.copy(origin);
    this.group.add(mesh);
    this.puffs.push(mesh);
    this.ages.push(0);
  }

  get count(): number {
    return this.puffs.length;
  }
}
