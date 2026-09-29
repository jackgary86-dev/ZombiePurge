import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { VehicleConfig, ZombieMotionConfig, ZombieRank } from '../../data/types';
import type { Vehicle } from '../vehicle/Vehicle';
import type { Zombie } from '../zombies/Zombie';
import { ZOMBIE_CAPSULE } from '../zombies/Zombie';
import { syncBumperStyle, syncDecalStyle, syncDoorStyle, syncTireStyle } from './cosmeticParts';

/** I12 placeholder art: primitives that match the physics shapes until real models land (I3, I5). */

export interface CarView {
  group: Group;
  body: Mesh;
  wheels: Mesh[];
  /** L4: the placeholder driver figure, seated in the cabin. */
  driver: Group;
  sync(car: Vehicle): void;
  /** L3: swaps the cosmetic front bumper's primitive shape to match the selected style. */
  setBumperStyle(optionId: string): void;
  /** L4: recolours the driver figure's outfit. */
  setDriverColor(color: number): void;
  /** L5: recolours/re-opacifies the cabin glass; `optionId` picks a mirrored-metal finish. */
  setWindowTint(optionId: string, color: number, opacity: number): void;
  /** L6: swaps the cosmetic door trim to match the selected style. */
  setDoorStyle(optionId: string): void;
  /** L7: swaps the cosmetic body decal to match the selected style. */
  setDecalStyle(optionId: string): void;
  /** L8: swaps every wheel's rim/tread trim to match the selected tire style. */
  setTireStyle(optionId: string): void;
}

export function buildPlaceholderCar(cfg: VehicleConfig): CarView {
  const he = cfg.chassisHalfExtents;
  const group = new Group();
  group.name = 'car';

  const body = new Mesh(
    new BoxGeometry(he.x * 2, he.y * 2, he.z * 2),
    new MeshStandardMaterial({ color: 0xc8402e, roughness: 0.5, metalness: 0.2 })
  );
  body.castShadow = true;
  group.add(body);

  // L4/L5: tinted-glass look (transparent) rather than solid metal, so the driver figure seated
  // inside reads as visible through the windshield instead of fully hidden. setWindowTint()
  // (L5) recolours/re-opacifies this same material once a non-stock window style is equipped.
  const cabinMaterial = new MeshStandardMaterial({
    color: 0x2b2b30,
    roughness: 0.3,
    metalness: 0.4,
    transparent: true,
    opacity: 0.55,
  });
  const cabin = new Mesh(new BoxGeometry(he.x * 1.6, he.y * 1.2, he.z * 0.9), cabinMaterial);
  cabin.position.set(0, he.y * 1.4, -he.z * 0.15);
  cabin.castShadow = true;
  group.add(cabin);

  const driverMaterial = new MeshStandardMaterial({ color: 0x555a60, roughness: 0.6 });
  const driver = new Group();
  driver.name = 'driver';
  const torso = new Mesh(new CapsuleGeometry(0.16, 0.32, 4, 8), driverMaterial);
  const head = new Mesh(new SphereGeometry(0.12, 8, 6), driverMaterial);
  head.position.y = 0.32;
  driver.add(torso, head);
  driver.position.copy(cabin.position).add(new Vector3(0, -he.y * 0.2, he.z * 0.1));
  group.add(driver);

  syncBumperStyle(group, 'bumper_stock', he);
  syncDoorStyle(group, 'door_stock', he);
  syncDecalStyle(group, 'decal_none', he);

  const wheelGeometry = new CylinderGeometry(cfg.wheels.radius, cfg.wheels.radius, 0.3, 18);
  wheelGeometry.rotateZ(Math.PI / 2);
  const wheelMaterial = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const wheels = [0, 1, 2, 3].map(() => {
    const wheel = new Mesh(wheelGeometry, wheelMaterial);
    wheel.castShadow = true;
    return wheel;
  });
  syncTireStyle(wheels, 'tire_stock', cfg.wheels.radius);

  const scratchQ = new Quaternion();
  const yawQ = new Quaternion();
  const up = new Vector3(0, 1, 0);
  return {
    group,
    body,
    wheels,
    driver,
    sync(car: Vehicle) {
      car.getPosition(group.position);
      car.getQuaternion(group.quaternion);
      car.wheels.forEach((state, i) => {
        const wheel = wheels[i];
        if (!wheel.parent) group.parent?.add(wheel);
        wheel.position.copy(state.worldPosition);
        yawQ.setFromAxisAngle(up, -state.steerAngle);
        wheel.quaternion.copy(scratchQ.copy(group.quaternion).multiply(yawQ));
      });
    },
    setBumperStyle(optionId: string) {
      syncBumperStyle(group, optionId, he);
    },
    setDriverColor(color: number) {
      driverMaterial.color.set(color);
    },
    setWindowTint(optionId: string, color: number, opacity: number) {
      cabinMaterial.color.set(color);
      cabinMaterial.opacity = opacity;
      cabinMaterial.metalness = optionId === 'window_mirror' ? 0.9 : 0.4;
    },
    setDoorStyle(optionId: string) {
      syncDoorStyle(group, optionId, he);
    },
    setDecalStyle(optionId: string) {
      syncDecalStyle(group, optionId, he);
    },
    setTireStyle(optionId: string) {
      syncTireStyle(wheels, optionId, cfg.wheels.radius);
    },
  };
}

const RANK_STYLE: Record<ZombieRank, { color: number; scale: number }> = {
  walker: { color: 0x8a9a7a, scale: 1 },
  runner: { color: 0xa0a070, scale: 0.95 },
  spitter: { color: 0x9cff3a, scale: 1 },
  brute: { color: 0x6f5a4a, scale: 1.35 },
  tank: { color: 0x555a50, scale: 1.8 },
  iceZombie: { color: 0xaee0ff, scale: 1.1 },
  boss: { color: 0xff5a1f, scale: 2.8 },
};

const DEAD_TINT = new Color(0x3a3030);
const BURN_TINT = new Color(0xff6a1a);

const hslScratch = { h: 0, s: 0, l: 0 };
/** I5: a random per-instance hue/lightness jitter around a rank's base colour, so a horde
 * of the same rank doesn't render as visually identical clones. */
function jitterColor(hex: number, variance: number, out: Color): Color {
  out.set(hex);
  if (variance <= 0) return out;
  out.getHSL(hslScratch);
  const h = (hslScratch.h + (Math.random() * 2 - 1) * variance * 0.5 + 1) % 1;
  const l = Math.min(1, Math.max(0, hslScratch.l + (Math.random() * 2 - 1) * variance * 0.5));
  return out.setHSL(h, hslScratch.s, l);
}

const bodyGeometry = new CapsuleGeometry(
  ZOMBIE_CAPSULE.radius,
  ZOMBIE_CAPSULE.halfHeight * 2,
  4,
  8
);
const headGeometry = new SphereGeometry(0.2, 8, 6);
/**
 * B7: every zombie is one instance in two InstancedMeshes (body, head), so a horde of
 * hundreds costs two draw calls. Colour per instance comes from the rank; corpses tip
 * over and fade to grey. A simple LOD drops heads beyond `headLodDistance`.
 */
export class ZombieInstances {
  readonly bodies: InstancedMesh;
  readonly heads: InstancedMesh;
  headLodDistance = 120;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly quaternion = new Quaternion();
  private readonly scale = new Vector3();
  private readonly facingQ = new Quaternion();
  private readonly lieDownQ = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
  private readonly up = new Vector3(0, 1, 0);
  private readonly color = new Color();
  private readonly hidden = new Matrix4().makeScale(0, 0, 0);
  private readonly lastRank: (ZombieRank | null)[];
  private readonly deadFade: number[];
  /** I5: each instance's jittered rank colour, so dead/burn tints blend from its own variant. */
  private readonly baseColor: Color[];
  /** I5: per-slot phase offset so the horde's walk-bob doesn't move in lockstep. */
  private readonly phase: number[];

  constructor(
    readonly capacity: number,
    private readonly motion: ZombieMotionConfig
  ) {
    const material = new MeshStandardMaterial({ roughness: 0.95 });
    this.bodies = new InstancedMesh(bodyGeometry, material, capacity);
    this.heads = new InstancedMesh(headGeometry, material, capacity);
    for (const mesh of [this.bodies, this.heads]) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      for (let i = 0; i < capacity; i++) {
        mesh.setMatrixAt(i, this.hidden);
        mesh.setColorAt(i, this.color.set(0xffffff));
      }
    }
    this.lastRank = new Array(capacity).fill(null);
    this.deadFade = new Array(capacity).fill(0);
    this.baseColor = Array.from({ length: capacity }, () => new Color(0xffffff));
    this.phase = Array.from({ length: capacity }, () => Math.random() * Math.PI * 2);
  }

  /** Writes one instance per pool slot. `viewer` is the camera position for LOD. */
  sync(zombies: readonly Zombie[], viewer: Vector3): void {
    for (let i = 0; i < this.capacity; i++) {
      const z = zombies[i];
      if (!z || !z.active) {
        if (this.lastRank[i] !== null) {
          this.bodies.setMatrixAt(i, this.hidden);
          this.heads.setMatrixAt(i, this.hidden);
          this.lastRank[i] = null;
        }
        continue;
      }
      if (this.lastRank[i] !== z.rank) {
        this.lastRank[i] = z.rank;
        this.deadFade[i] = 0;
        jitterColor(RANK_STYLE[z.rank].color, this.motion.colorVariance, this.baseColor[i]);
        this.bodies.setColorAt(i, this.baseColor[i]);
        this.heads.setColorAt(i, this.baseColor[i]);
      }
      const s = RANK_STYLE[z.rank].scale;
      let scaleMul = 1;
      z.getPosition(this.position);
      const yaw = Math.atan2(z.facing.x, z.facing.z);
      this.facingQ.setFromAxisAngle(this.up, yaw);
      if (z.state === 'dead') {
        this.quaternion.copy(this.facingQ).multiply(this.lieDownQ);
        this.position.y -= ZOMBIE_CAPSULE.halfHeight * s * 0.8;
        if (this.deadFade[i] < 1) {
          this.deadFade[i] = Math.min(1, this.deadFade[i] + 0.05);
          this.color.copy(this.baseColor[i]).lerp(DEAD_TINT, this.deadFade[i]);
          this.bodies.setColorAt(i, this.color);
          this.heads.setColorAt(i, this.color);
        }
      } else {
        this.quaternion.copy(this.facingQ);
        if (z.burnTimeLeft > 0) {
          this.color
            .copy(this.baseColor[i])
            .lerp(BURN_TINT, 0.5 + 0.5 * Math.sin(z.burnTimeLeft * 20));
          this.bodies.setColorAt(i, this.color);
          this.heads.setColorAt(i, this.color);
          this.deadFade[i] = 0;
          this.lastRank[i] = null; // force the base colour to be restored once it stops burning
        }
        // I5: simple procedural motion in lieu of real walk/attack animation clips.
        if (z.getSpeed() > 0.15) {
          this.position.y +=
            Math.sin(z.stateTime * this.motion.bobFrequency * Math.PI * 2 + this.phase[i]) *
            this.motion.bobAmplitude;
        }
        if (z.state === 'attack' && this.motion.attackLungeDistance > 0) {
          const t = Math.min(1, z.stateTime / this.motion.attackLungeSeconds);
          const pulse = t < 0.5 ? t * 2 : (1 - t) * 2;
          this.position.addScaledVector(z.facing, pulse * this.motion.attackLungeDistance);
          scaleMul = 1 + pulse * 0.12;
        }
      }
      this.scale.set(s * scaleMul, s * scaleMul, s * scaleMul);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.bodies.setMatrixAt(i, this.matrix);

      if (this.position.distanceToSquared(viewer) > this.headLodDistance * this.headLodDistance) {
        this.heads.setMatrixAt(i, this.hidden);
      } else {
        // Head sits on top of the capsule in local space; rotate with the body.
        this.position.addScaledVector(
          this.up.clone().applyQuaternion(this.quaternion),
          (ZOMBIE_CAPSULE.halfHeight + ZOMBIE_CAPSULE.radius + 0.05) * s
        );
        this.matrix.compose(this.position, this.quaternion, this.scale);
        this.heads.setMatrixAt(i, this.matrix);
      }
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
    if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    if (this.heads.instanceColor) this.heads.instanceColor.needsUpdate = true;
  }
}

const globGeometry = new SphereGeometry(0.28, 8, 6);
const globMaterial = new MeshStandardMaterial({
  color: 0x9cff3a,
  emissive: 0x3a7a10,
  roughness: 0.4,
});

/** Pooled acid glob visuals for the Spitter's projectiles. */
export class ProjectileViews {
  readonly meshes: Mesh[];

  constructor(capacity: number) {
    this.meshes = Array.from({ length: capacity }, () => {
      const m = new Mesh(globGeometry, globMaterial);
      m.visible = false;
      return m;
    });
  }

  sync(projectiles: { active: boolean; position: Vector3 }[]): void {
    projectiles.forEach((p, i) => {
      const m = this.meshes[i];
      if (!m) return;
      m.visible = p.active;
      if (p.active) m.position.copy(p.position);
    });
  }
}

/** Roof turret stand-in: a base block and a barrel that yaw toward the mount's aim. */
export class TurretView {
  readonly group = new Group();

  constructor(localOffset: Vector3) {
    const base = new Mesh(
      new BoxGeometry(0.5, 0.25, 0.5),
      new MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6 })
    );
    const barrel = new Mesh(
      new BoxGeometry(0.12, 0.12, 1.1),
      new MeshStandardMaterial({ color: 0x202024, metalness: 0.5 })
    );
    barrel.position.set(0, 0.2, 0.45);
    base.castShadow = true;
    this.group.add(base, barrel);
    this.group.position.copy(localOffset).add(new Vector3(0, -0.15, 0));
    this.group.visible = false;
  }

  set visible(v: boolean) {
    this.group.visible = v;
  }

  /** `yaw` is relative to the car (0 = straight ahead). */
  aim(yaw: number): void {
    this.group.rotation.y = yaw;
  }
}

/** Pooled tracer lines for hitscan shots; each fades out over a few frames. */
export class ShotTracers {
  readonly lines: Line[];
  private readonly ages: number[];

  constructor(capacity = 24) {
    this.lines = Array.from({ length: capacity }, () => {
      const geometry = new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]);
      const line = new Line(
        geometry,
        new LineBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0 })
      );
      line.visible = false;
      line.frustumCulled = false;
      return line;
    });
    this.ages = new Array(capacity).fill(Infinity);
  }

  add(origin: Vector3, end: Vector3): void {
    let i = this.ages.indexOf(Infinity);
    if (i < 0) i = this.ages.indexOf(Math.max(...this.ages));
    const line = this.lines[i];
    const pos = line.geometry.getAttribute('position');
    pos.setXYZ(0, origin.x, origin.y, origin.z);
    pos.setXYZ(1, end.x, end.y, end.z);
    pos.needsUpdate = true;
    line.visible = true;
    this.ages[i] = 0;
  }

  update(dt: number): void {
    for (let i = 0; i < this.lines.length; i++) {
      if (this.ages[i] === Infinity) continue;
      this.ages[i] += dt;
      const t = this.ages[i] / 0.12;
      const material = this.lines[i].material as LineBasicMaterial;
      if (t >= 1) {
        this.lines[i].visible = false;
        this.ages[i] = Infinity;
        material.opacity = 0;
      } else {
        material.opacity = 1 - t;
      }
    }
  }
}

const rocketGeometry = new CylinderGeometry(0.08, 0.12, 0.7, 8);
rocketGeometry.rotateX(Math.PI / 2);
const rocketMaterial = new MeshStandardMaterial({
  color: 0x9a9a9a,
  metalness: 0.6,
  roughness: 0.4,
});
const blastGeometry = new SphereGeometry(1, 12, 8);

/** Rockets in flight plus short-lived expanding blast spheres. */
export class RocketViews {
  readonly rockets: Mesh[];
  readonly blasts: Mesh[];
  private readonly blastAges: number[];

  constructor(rocketCapacity = 12, blastCapacity = 8) {
    this.rockets = Array.from({ length: rocketCapacity }, () => {
      const m = new Mesh(rocketGeometry, rocketMaterial);
      m.visible = false;
      return m;
    });
    this.blasts = Array.from({ length: blastCapacity }, () => {
      const m = new Mesh(
        blastGeometry,
        new MeshStandardMaterial({
          color: 0xffa040,
          emissive: 0xff5a1f,
          transparent: true,
          opacity: 0.8,
        })
      );
      m.visible = false;
      return m;
    });
    this.blastAges = new Array(blastCapacity).fill(Infinity);
  }

  syncRockets(rockets: { active: boolean; position: Vector3; velocity: Vector3 }[]): void {
    rockets.forEach((r, i) => {
      const m = this.rockets[i];
      if (!m) return;
      m.visible = r.active;
      if (r.active) {
        m.position.copy(r.position);
        m.lookAt(
          r.position.x + r.velocity.x,
          r.position.y + r.velocity.y,
          r.position.z + r.velocity.z
        );
      }
    });
  }

  explode(position: Vector3, radius: number): void {
    let i = this.blastAges.indexOf(Infinity);
    if (i < 0) i = this.blastAges.indexOf(Math.max(...this.blastAges));
    const m = this.blasts[i];
    m.position.copy(position);
    m.scale.setScalar(radius * 0.3);
    m.userData.radius = radius;
    m.visible = true;
    this.blastAges[i] = 0;
  }

  update(dt: number): void {
    for (let i = 0; i < this.blasts.length; i++) {
      if (this.blastAges[i] === Infinity) continue;
      this.blastAges[i] += dt;
      const t = this.blastAges[i] / 0.45;
      const m = this.blasts[i];
      if (t >= 1) {
        m.visible = false;
        this.blastAges[i] = Infinity;
        continue;
      }
      m.scale.setScalar((m.userData.radius as number) * (0.3 + 0.7 * t));
      (m.material as MeshStandardMaterial).opacity = 0.8 * (1 - t);
    }
  }
}

/** Flame cone shown at the front mount while the flamethrower fires. */
export class FlameView {
  readonly mesh: Mesh;

  constructor(range: number, cone: number) {
    // Visual is narrower and shorter than the gameplay cone so it reads as a jet, not a wall.
    const length = range * 0.85;
    const radius = Math.min(Math.tan(cone) * length * 0.35, 2.5);
    const geometry = new CylinderGeometry(radius, 0.12, length, 12, 1, true);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, 0, length / 2);
    this.mesh = new Mesh(
      geometry,
      new MeshStandardMaterial({
        color: 0xff7a1f,
        emissive: 0xff4a00,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    this.mesh.visible = false;
  }

  sync(firing: boolean, origin: Vector3, direction: Vector3): void {
    this.mesh.visible = firing;
    if (!firing) return;
    this.mesh.position.copy(origin);
    this.mesh.lookAt(origin.x + direction.x, origin.y + direction.y, origin.z + direction.z);
    this.mesh.rotation.z += Math.random() * 0.5;
  }
}
