import type { ScreenShakeConfig } from '../../data/types';

/**
 * G2: a decaying magnitude the camera jitters by. Damage and kills add to it; it decays back
 * to zero on its own. Kept separate from the actual random jitter so the accumulation/decay is
 * pure and testable, while main.ts owns turning `magnitude` into an actual camera offset.
 */
export class ScreenShake {
  private magnitude = 0;

  constructor(private readonly cfg: ScreenShakeConfig) {}

  addDamage(damage: number): void {
    if (damage <= 0) return;
    this.magnitude = Math.min(this.cfg.max, this.magnitude + damage * this.cfg.perDamage);
  }

  addKill(): void {
    this.magnitude = Math.min(this.cfg.max, this.magnitude + this.cfg.perKill);
  }

  /** Advances the decay and returns the current magnitude. */
  update(dt: number): number {
    this.magnitude = Math.max(0, this.magnitude - this.cfg.decayPerSecond * dt);
    return this.magnitude;
  }

  get current(): number {
    return this.magnitude;
  }
}
