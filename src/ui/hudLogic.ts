import type { HudConfig } from '../data/types';

/** G1: pure HUD helpers, kept separate from Hud.ts's DOM writes so they're unit-testable. */

/** 0..1, clamped; `max <= 0` reads as empty rather than dividing by zero. */
export function barFraction(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

export function isLow(value: number, max: number, threshold: number): boolean {
  return barFraction(value, max) <= threshold;
}

export function hpBarState(
  hp: number,
  maxHp: number,
  cfg: Pick<HudConfig, 'lowHpFraction'>
): { fraction: number; low: boolean } {
  const fraction = barFraction(hp, maxHp);
  return { fraction, low: fraction <= cfg.lowHpFraction };
}

export function fuelBarState(
  litres: number,
  capacityLitres: number,
  cfg: Pick<HudConfig, 'lowFuelFraction'>
): { fraction: number; low: boolean } {
  const fraction = barFraction(litres, capacityLitres);
  return { fraction, low: fraction <= cfg.lowFuelFraction };
}

/** Green at full health down to red when empty. */
export function barColor(fraction: number): string {
  const hue = Math.max(0, Math.min(120, fraction * 120));
  return `hsl(${hue.toFixed(0)}, 75%, 45%)`;
}

export type WeaponKind = 'machinegun' | 'shotgun' | 'rockets' | 'flamethrower' | null;

/** What the ammo/heat readout should say for the currently equipped weapon, if any. */
export function weaponReadout(
  kind: WeaponKind,
  heat: number | null,
  overheated: boolean,
  magazine: string | null,
  flameOn: boolean
): { text: string; warn: boolean } | null {
  if (kind === 'machinegun') {
    return {
      text: overheated ? 'OVERHEATED' : `${Math.round((heat ?? 0) * 100)}%`,
      warn: overheated,
    };
  }
  if (kind === 'shotgun' || kind === 'rockets') {
    return { text: magazine ?? '', warn: (magazine ?? '').startsWith('reloading') };
  }
  if (kind === 'flamethrower') {
    return { text: flameOn ? 'FIRING' : 'ready', warn: false };
  }
  return null;
}
