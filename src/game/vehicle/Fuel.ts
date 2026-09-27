export interface FuelConfig {
  /** Litres per second at full throttle and top speed. */
  burnPerSecondAtFullThrottle: number;
  /** Litres per second just idling with the engine on. */
  idleBurnPerSecond: number;
}

export const DEFAULT_FUEL: FuelConfig = {
  burnPerSecondAtFullThrottle: 0.6,
  idleBurnPerSecond: 0.03,
};

/**
 * D6: the tank. Fuel drains with throttle and speed; an empty tank ends the run
 * (main.ts treats `isEmpty()` like zero HP). Capacity comes from the fuel upgrades.
 */
export class FuelTank {
  private litres: number;

  constructor(
    public capacity: number,
    private readonly cfg: FuelConfig = DEFAULT_FUEL
  ) {
    this.litres = capacity;
  }

  get level(): number {
    return this.litres;
  }

  get fraction(): number {
    return this.capacity > 0 ? this.litres / this.capacity : 0;
  }

  isEmpty(): boolean {
    return this.litres <= 0;
  }

  /** Burns fuel for one step. `throttle` 0..1, `speedRatio` = speed / top speed (0..1). */
  update(dt: number, throttle: number, speedRatio: number): void {
    if (this.litres <= 0) return;
    const load =
      Math.min(1, Math.max(0, throttle)) * (0.4 + 0.6 * Math.min(1, Math.max(0, speedRatio)));
    const burn = this.cfg.idleBurnPerSecond + this.cfg.burnPerSecondAtFullThrottle * load;
    this.litres = Math.max(0, this.litres - burn * dt);
  }

  /** Adds fuel (gas can, station); returns litres actually added. */
  refill(litres: number): number {
    const before = this.litres;
    this.litres = Math.min(this.capacity, this.litres + Math.max(0, litres));
    return this.litres - before;
  }

  fill(): void {
    this.litres = this.capacity;
  }

  /** Upgrades can grow the tank mid-game; keep the same fill fraction. */
  setCapacity(capacity: number): void {
    const fraction = this.fraction;
    this.capacity = capacity;
    this.litres = capacity * fraction;
  }
}
