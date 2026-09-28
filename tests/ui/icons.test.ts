import { describe, it, expect } from 'vitest';
import { icon, iconForCategory, iconForUpgrade, type IconName } from '../../src/ui/icons';
import type { UpgradeCategory } from '../../src/data/types';

const ALL_ICONS: IconName[] = [
  'coin',
  'health',
  'fuel',
  'distance',
  'kill',
  'combo',
  'engine',
  'tires',
  'armor',
  'ram',
  'nitro',
  'radar',
  'headlights',
  'weapon',
  'machinegun',
  'shotgun',
  'rockets',
  'flamethrower',
  'play',
  'settings',
  'gamepad',
  'exit',
  'wrench',
];

const ALL_CATEGORIES: UpgradeCategory[] = [
  'engine',
  'tires',
  'health',
  'armor',
  'fuel',
  'weapon',
  'ram',
  'nitro',
  'radar',
  'headlights',
];

function parses(svg: string): boolean {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return doc.getElementsByTagName('parsererror').length === 0;
}

describe('I10 icon set', () => {
  it('renders every icon as valid, sized SVG', () => {
    for (const name of ALL_ICONS) {
      const svg = icon(name, 22);
      expect(parses(svg)).toBe(true);
      expect(svg).toContain(`icon-${name}`);
      expect(svg).toContain('width="22"');
      expect(svg).toContain('height="22"');
    }
  });

  it('never repeats an element id, even when the same icon renders twice on a page', () => {
    // Gear teeth and wheel spokes are drawn as repeated <rect>/<line>, not <use href="#id">,
    // so two engine icons on the same page never collide over a shared id.
    const twice = icon('engine') + icon('engine');
    const doc = new DOMParser().parseFromString(`<svg>${twice}</svg>`, 'image/svg+xml');
    expect(doc.getElementsByTagName('parsererror').length).toBe(0);
    const ids = [...doc.querySelectorAll('[id]')];
    expect(ids).toHaveLength(0);
  });

  it('gives every upgrade category its own icon', () => {
    for (const category of ALL_CATEGORIES) {
      const svg = iconForCategory(category);
      expect(parses(svg)).toBe(true);
    }
  });

  it('picks a dedicated icon for each weapon id, falling back to the category otherwise', () => {
    expect(iconForUpgrade('machinegun', 'weapon')).toContain('icon-machinegun');
    expect(iconForUpgrade('shotgun', 'weapon')).toContain('icon-shotgun');
    expect(iconForUpgrade('rockets', 'weapon')).toContain('icon-rockets');
    expect(iconForUpgrade('flamethrower', 'weapon')).toContain('icon-flamethrower');
    expect(iconForUpgrade('engine', 'engine')).toContain('icon-engine');
    expect(iconForUpgrade('unknown-id', 'nitro')).toContain('icon-nitro');
  });
});
