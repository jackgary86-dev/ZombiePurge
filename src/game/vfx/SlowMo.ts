import type { SlowMoConfig } from '../../data/types';

/**
 * G2: a brief slow-motion beat triggered by landing several kills in the same physics step
 * ("multi-kill"). `trigger` is called once per Playing tick with that tick's kill count;
 * `update` is called once per rendered frame with the real (unscaled) time since the last
 * frame, and returns the time scale main.ts should hand to GameLoop.setTimeScale.
 */
export class SlowMo {
  private heldSeconds = 0;
  private rampSeconds = 0;

  constructor(private readonly cfg: SlowMoConfig) {}

  trigger(killsThisTick: number): void {
    if (killsThisTick < this.cfg.multiKillThreshold) return;
    this.heldSeconds = this.cfg.holdSeconds;
    this.rampSeconds = this.cfg.rampSeconds;
  }

  update(realDt: number): number {
    if (this.heldSeconds > 0) {
      this.heldSeconds = Math.max(0, this.heldSeconds - realDt);
      return this.cfg.timeScale;
    }
    if (this.rampSeconds > 0) {
      this.rampSeconds = Math.max(0, this.rampSeconds - realDt);
      // 1 at the start of the ramp (full slow-mo), 0 once back to normal speed.
      const fractionLeft = this.rampSeconds / this.cfg.rampSeconds;
      return this.cfg.timeScale + (1 - this.cfg.timeScale) * (1 - fractionLeft);
    }
    return 1;
  }

  get active(): boolean {
    return this.heldSeconds > 0 || this.rampSeconds > 0;
  }
}
