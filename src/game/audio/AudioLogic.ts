import type { EngineAudioConfig } from '../../data/types';

/** G3: pure audio decisions, kept separate from AudioSystem's WebAudio nodes so they're testable
 * without a real AudioContext (jsdom/vitest has none). */

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Engine oscillator pitch: idle at a standstill, ramping to maxHz at top speed, boosted by nitro. */
export function engineFrequency(
  speedFraction: number,
  cfg: EngineAudioConfig,
  nitroBoosting: boolean
): number {
  const base = cfg.idleHz + (cfg.maxHz - cfg.idleHz) * clamp01(speedFraction);
  return nitroBoosting ? base * cfg.nitroPitchBoost : base;
}

/** Linear falloff: 1 right on top of the car, 0 at/beyond maxDistance. */
export function groanVolume(distance: number, maxDistance: number): number {
  if (maxDistance <= 0 || distance >= maxDistance) return 0;
  return 1 - Math.max(0, distance) / maxDistance;
}

/** The closest `maxVoices` candidates get a groan voice; the rest stay silent this pass. */
export function pickGroanVoices<T extends { distance: number }>(
  candidates: T[],
  maxVoices: number
): T[] {
  return [...candidates].sort((a, b) => a.distance - b.distance).slice(0, Math.max(0, maxVoices));
}

/** Handbrake slides count as a tire skid once the car is actually moving fast enough to slide. */
export function skidActive(speed: number, handbrakeHeld: boolean, minSpeed: number): boolean {
  return handbrakeHeld && speed >= minSpeed;
}
