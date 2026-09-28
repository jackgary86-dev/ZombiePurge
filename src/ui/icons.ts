import type { UpgradeCategory } from '../data/types';

/**
 * I10: a small, hand-drawn icon set in the same blocky placeholder style as the rest of the
 * game's art (see src/game/art/placeholders.ts). Every icon is a 24x24 inline SVG string so it
 * can be dropped into any element's innerHTML without a network request or an <img> tag.
 */
export type IconName =
  | 'coin'
  | 'health'
  | 'fuel'
  | 'distance'
  | 'kill'
  | 'combo'
  | 'engine'
  | 'tires'
  | 'armor'
  | 'ram'
  | 'nitro'
  | 'radar'
  | 'headlights'
  | 'weapon'
  | 'machinegun'
  | 'shotgun'
  | 'rockets'
  | 'flamethrower'
  | 'play'
  | 'settings'
  | 'gamepad'
  | 'exit'
  | 'wrench';

/**
 * A repeated shape (gear teeth, wheel spokes) rendered once per angle via `transform="rotate"`
 * on the shape itself rather than `<use href="#id">` — the icon set is rendered as many
 * standalone `<svg>` fragments on the same page, and `<use>` ids would collide across them.
 */
function ring(shape: (angle: number) => string, angles: number[]): string {
  return angles.map(shape).join('');
}

function gear(): string {
  const tooth = (a: number) =>
    `<rect x="11" y="1.4" width="2" height="3.2" transform="rotate(${a} 12 12)"/>`;
  return (
    `<circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>` +
    ring(tooth, [0, 45, 90, 135, 180, 225, 270, 315])
  );
}

function spokes(): string {
  const spoke = (a: number) =>
    `<line x1="12" y1="12" x2="12" y2="4.6" transform="rotate(${a} 12 12)"/>`;
  return ring(spoke, [0, 72, 144, 216, 288]);
}

/** Inner markup only (no outer <svg>): shapes drawn on a 24x24 grid, origin top-left. */
const SHAPES: Record<IconName, string> = {
  coin: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" stroke-width="1.4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke-width="1.4"/>`,
  health: `<circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M7.5 12h9" stroke-width="2.6"/>`,
  fuel: `<rect x="4" y="8" width="9" height="12" rx="1.2"/><path d="M8 8V5h5" /><path d="M13 11h2.5a2 2 0 0 1 2 2v3.5a1.6 1.6 0 0 0 3.2 0v-5.6l-2-2"/>`,
  distance: `<path d="M6.5 20 10 4M17.5 20 14 4"/><path d="M12 20V4" stroke-dasharray="2 3"/>`,
  kill: `<circle cx="12" cy="10" r="7"/><circle cx="9.2" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.8" cy="10" r="1.1" fill="currentColor" stroke="none"/><path d="M8.5 16.5v2M12 17.3v2.7M15.5 16.5v2"/>`,
  combo: `<path d="M13 2 4.5 14h6l-1.5 8 9-12h-6l1-8z" fill="currentColor" stroke="none"/>`,
  engine: gear(),
  tires: `<circle cx="12" cy="12" r="9" stroke-width="2.6"/><circle cx="12" cy="12" r="2.6"/>${spokes()}`,
  armor: `<path d="M12 2.5 5 5.5v6c0 5.2 3 8.3 7 9.5 4-1.2 7-4.3 7-9.5v-6z"/>`,
  ram: `<path d="M3.5 8 9.5 12 3.5 16M13 8l6 4-6 4"/>`,
  nitro: `<path d="M12 2.5c2.2 4-3.2 5.4-3.2 9.7a3.2 3.2 0 0 0 6.4 0c0-2.1-1.1-3.2-1.1-5.3 2.1 1.1 3.4 4.3 3.4 6.7a5.5 5.5 0 0 1-11 0c0-5.6 3.4-6.7 5.5-11.1z" fill="currentColor" stroke="none"/>`,
  radar: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5" stroke-width="1.2"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><path d="M12 12 18.5 7.3" stroke-width="1.6"/>`,
  headlights: `<circle cx="7.5" cy="12" r="3" fill="currentColor" stroke="none"/><path d="M12 9.5 21 6M12 12h9M12 14.5 21 18" stroke-width="2"/>`,
  weapon: `<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>`,
  machinegun: `<path d="M2 12h7v-2h4v2h9v1.4h-9v1.6h-4v2H6v-2H2z" fill="currentColor" stroke="none"/><path d="M9 15v3l-2 1.6" stroke-width="1.6"/>`,
  shotgun: `<path d="M2 12h7v-2h4v2h1.4v-2.2h9v4.4h-9V14h-1.4v2H6v-2H2z" fill="currentColor" stroke="none"/><path d="M14.4 15.6h5v1.4h-5z" fill="currentColor" stroke="none"/><path d="M9 15v3l-2 1.6" stroke-width="1.6"/>`,
  rockets: `<rect x="4" y="11.2" width="13" height="3.2" fill="currentColor" stroke="none"/><path d="M17 11 21.5 12.8 17 14.6z" fill="currentColor" stroke="none"/><path d="M4 11.2 1.2 9.6v6.8L4 14.8z" fill="currentColor" stroke="none"/>`,
  flamethrower: `<rect x="2" y="12.4" width="12" height="2.6" fill="currentColor" stroke="none"/><path d="M17.2 6.5c1.2 2.2-1.4 2.5-1.4 4.7a2.2 2.2 0 0 0 4.4 0c0-1.2-.6-1.8-.6-2.9 1.1.6 1.8 2.3 1.8 3.5a3.4 3.4 0 0 1-6.8 0c0-3.6 1.8-4.1 2.6-5.3z" fill="currentColor" stroke="none"/>`,
  play: `<path d="M6 4.5 19.5 12 6 19.5z" fill="currentColor" stroke="none"/>`,
  settings: gear(),
  gamepad: `<rect x="2.5" y="8.5" width="19" height="9" rx="4.5"/><path d="M7 10.5v5M4.5 13h5" stroke-width="1.8"/><circle cx="16" cy="11.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="18.5" cy="14" r="1.1" fill="currentColor" stroke="none"/>`,
  exit: `<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M13 8l4 4-4 4M9 12h8"/>`,
  wrench: `<path d="M14.5 3.5a4.5 4.5 0 0 0-5.7 5.4L3.5 14.2a2 2 0 0 0 2.8 2.8l5.3-5.3a4.5 4.5 0 0 0 5.4-5.7l-3 3-2-2z"/>`,
};

/** Renders an icon as a standalone inline `<svg>` string, sized `size`x`size`. */
export function icon(name: IconName, size = 18): string {
  return (
    `<svg class="icon icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true" focusable="false">${SHAPES[name]}</svg>`
  );
}

/** Upgrade ids that have their own dedicated icon, beyond the generic category icon. */
const ID_ICON: Partial<Record<string, IconName>> = {
  machinegun: 'machinegun',
  shotgun: 'shotgun',
  rockets: 'rockets',
  flamethrower: 'flamethrower',
};

const CATEGORY_ICON: Record<UpgradeCategory, IconName> = {
  engine: 'engine',
  tires: 'tires',
  health: 'health',
  armor: 'armor',
  fuel: 'fuel',
  weapon: 'weapon',
  ram: 'ram',
  nitro: 'nitro',
  radar: 'radar',
  headlights: 'headlights',
};

/** Picks the closest icon for a garage upgrade: a per-weapon icon, else the category's. */
export function iconForUpgrade(upgradeId: string, category: UpgradeCategory, size = 20): string {
  return icon(ID_ICON[upgradeId] ?? CATEGORY_ICON[category], size);
}

/** The icon shown on a garage category tab (falls back to the category's own icon). */
export function iconForCategory(category: UpgradeCategory, size = 16): string {
  return icon(CATEGORY_ICON[category], size);
}
