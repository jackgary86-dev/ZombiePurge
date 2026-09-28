import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { BloodConfig, VehicleConfig } from '../../data/types';

/**
 * G2: blood decals that build up on the car's front end from run-over kills. Entirely skipped
 * when `lowGore` is on. A local-space child of the car's own view group, so it rides along for
 * free; `reset()` clears it for a new run.
 */
export class BloodSplatterView {
  readonly group: Group;
  private readonly splatters: Mesh[] = [];
  private readonly geometry = new PlaneGeometry(0.4, 0.4);
  private readonly halfExtents: { x: number; y: number; z: number };

  constructor(
    private readonly cfg: BloodConfig,
    vehicle: VehicleConfig
  ) {
    this.group = new Group();
    this.halfExtents = vehicle.chassisHalfExtents;
  }

  /** Adds this kill's splatters, unless the player has low-gore on. Oldest drop past the cap. */
  addKill(lowGore: boolean): void {
    if (lowGore) return;
    for (let i = 0; i < this.cfg.splattersPerKill; i++) {
      if (this.splatters.length >= this.cfg.maxSplatters) {
        const oldest = this.splatters.shift()!;
        this.group.remove(oldest);
        oldest.geometry.dispose();
        (oldest.material as MeshBasicMaterial).dispose();
      }
      const mesh = new Mesh(
        this.geometry,
        new MeshBasicMaterial({
          color: 0x5c0b0b,
          transparent: true,
          opacity: 0.55 + Math.random() * 0.3,
          depthWrite: false,
        })
      );
      const he = this.halfExtents;
      mesh.position.set(
        (Math.random() * 2 - 1) * he.x * 0.9,
        he.y * (0.5 + Math.random() * 1.1),
        he.z * (0.2 + Math.random() * 0.85)
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.group.add(mesh);
      this.splatters.push(mesh);
    }
  }

  get count(): number {
    return this.splatters.length;
  }

  /** Wipes the car clean for a new run (garage repair, restart, wreck-and-retry). */
  reset(): void {
    for (const m of this.splatters) {
      this.group.remove(m);
      (m.material as MeshBasicMaterial).dispose();
    }
    this.splatters.length = 0;
  }
}
