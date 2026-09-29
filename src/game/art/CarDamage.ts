import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial } from 'three';
import type { CarDamageConfig, VehicleConfig } from '../../data/types';

export type CarDamageStage = 'clean' | 'dented' | 'wrecked';

/** I3: which visual damage stage a car's current HP fraction falls into. */
export function carDamageStage(hpFraction: number, cfg: CarDamageConfig): CarDamageStage {
  if (hpFraction < cfg.wreckedBelowFraction) return 'wrecked';
  if (hpFraction < cfg.dentedBelowFraction) return 'dented';
  return 'clean';
}

const CLEAN_TINT = new Color(0xffffff);
const DENTED_TINT = new Color(0xb8a898);
const WRECKED_TINT = new Color(0x4a3a30);

/** Multiplies the body's base colour to show rust/scorching as the stage worsens. */
export function carDamageTint(stage: CarDamageStage): Color {
  switch (stage) {
    case 'wrecked':
      return WRECKED_TINT;
    case 'dented':
      return DENTED_TINT;
    default:
      return CLEAN_TINT;
  }
}

/** How many dent decals should be visible at this stage. */
export function carDamageDentCount(stage: CarDamageStage): number {
  switch (stage) {
    case 'wrecked':
      return 6;
    case 'dented':
      return 3;
    default:
      return 0;
  }
}

const dentGeometry = new BoxGeometry(0.18, 0.14, 0.1);

/**
 * I3: tints the car body and adds dent decals as its HP drops below the config thresholds.
 * A local-space child of the car's own view group, mirroring BloodSplatterView's pattern.
 */
export class CarDamageView {
  readonly group: Group;
  private readonly dents: Mesh[] = [];
  private readonly bodyMaterial: MeshStandardMaterial;
  private readonly baseColor: Color;
  private readonly halfExtents: { x: number; y: number; z: number };
  private stage: CarDamageStage = 'clean';

  constructor(
    body: Mesh,
    private readonly cfg: CarDamageConfig,
    vehicle: VehicleConfig
  ) {
    this.group = new Group();
    this.bodyMaterial = body.material as MeshStandardMaterial;
    this.baseColor = this.bodyMaterial.color.clone();
    this.halfExtents = vehicle.chassisHalfExtents;
  }

  /** L2: sets the player's chosen paint colour as the new base, re-applying the current
   *  damage tint on top of it so a repaint doesn't erase a wrecked/dented look. */
  setPaintColor(color: number): void {
    this.baseColor.set(color);
    this.bodyMaterial.color.copy(this.baseColor).multiply(carDamageTint(this.stage));
  }

  /** Call every frame with the car's current hp / maxHp. No-ops unless the stage changed. */
  setHpFraction(hpFraction: number): void {
    const stage = carDamageStage(hpFraction, this.cfg);
    if (stage === this.stage) return;
    this.stage = stage;
    this.bodyMaterial.color.copy(this.baseColor).multiply(carDamageTint(stage));
    this.syncDents();
  }

  private syncDents(): void {
    const target = carDamageDentCount(this.stage);
    const he = this.halfExtents;
    while (this.dents.length < target) {
      const mesh = new Mesh(
        dentGeometry,
        new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 })
      );
      mesh.position.set(
        (Math.random() * 2 - 1) * he.x * 0.85,
        he.y * (0.3 + Math.random() * 0.6),
        (Math.random() * 2 - 1) * he.z * 0.85
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.group.add(mesh);
      this.dents.push(mesh);
    }
    while (this.dents.length > target) {
      const mesh = this.dents.pop()!;
      this.group.remove(mesh);
      (mesh.material as MeshStandardMaterial).dispose();
    }
  }

  get dentCount(): number {
    return this.dents.length;
  }

  /** Wipes damage for a new run (garage repair, restart, wreck-and-retry). */
  reset(): void {
    this.stage = 'clean';
    this.bodyMaterial.color.copy(this.baseColor);
    for (const m of this.dents) {
      this.group.remove(m);
      (m.material as MeshStandardMaterial).dispose();
    }
    this.dents.length = 0;
  }
}
