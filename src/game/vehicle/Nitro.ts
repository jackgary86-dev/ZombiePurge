export interface NitroConfig {
  /** Extra acceleration while boosting, as a multiplier of the car's acceleration. */
  accelerationBoost: number;
  /** Extra top speed while boosting, m/s. */
  topSpeedBoost: number;
  /** Seconds of charge regained per second while not boosting. */
  rechargePerSecond: number;
  /** Charge must reach this fraction of capacity before a fresh boost can start. */
  minStartFraction: number;
}

export const DEFAULT_NITRO: NitroConfig = {
  accelerationBoost: 0.8,
  topSpeedBoost: 12,
  rechargePerSecond: 0.15,
  minStartFraction: 0.25,
};

/** D13 Nitro: a charge measured in seconds of boost, granted by the Nitro upgrade. */
export class Nitro {
  charge: number;
  boosting = false;

  constructor(
    public capacitySeconds: number,
    private readonly cfg: NitroConfig = DEFAULT_NITRO
  ) {
    this.charge = capacitySeconds;
  }

  get available(): boolean {
    return this.capacitySeconds > 0;
  }

  get fraction(): number {
    return this.capacitySeconds > 0 ? this.charge / this.capacitySeconds : 0;
  }

  /** Call every fixed step with whether the nitro button is held. */
  update(dt: number, held: boolean): void {
    if (!this.available) {
      this.boosting = false;
      return;
    }
    if (
      held &&
      (this.boosting || this.charge >= this.capacitySeconds * this.cfg.minStartFraction)
    ) {
      this.charge = Math.max(0, this.charge - dt);
      this.boosting = this.charge > 0;
    } else {
      this.boosting = false;
      this.charge = Math.min(this.capacitySeconds, this.charge + this.cfg.rechargePerSecond * dt);
    }
  }

  /** Multipliers/adds to apply to the vehicle config this step. */
  get accelerationMultiplier(): number {
    return this.boosting ? 1 + this.cfg.accelerationBoost : 1;
  }

  get topSpeedBonus(): number {
    return this.boosting ? this.cfg.topSpeedBoost : 0;
  }

  setCapacity(seconds: number): void {
    // Keep the fill fraction; a first purchase (previous capacity 0) starts full.
    const fraction = this.capacitySeconds > 0 ? this.charge / this.capacitySeconds : 1;
    this.capacitySeconds = seconds;
    this.charge = seconds * fraction;
  }

  refill(): void {
    this.charge = this.capacitySeconds;
  }
}
