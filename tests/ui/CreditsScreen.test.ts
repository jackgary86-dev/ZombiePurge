import { describe, it, expect, afterEach } from 'vitest';
import { createCreditsScreen } from '../../src/ui/screens';

describe('J13 credits screen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lists team, tools and asset licenses, and Back calls onBack', () => {
    let backCalls = 0;
    const screen = createCreditsScreen(() => backCalls++);
    expect(screen.el.textContent).toContain('dad and his son');
    expect(screen.el.textContent).toContain('Three.js');
    expect(screen.el.textContent).toContain('Rapier3D');
    expect(screen.el.textContent).toContain('Bebas Neue');

    const back = screen.el.querySelector('button')!;
    expect(back.textContent).toBe('Back');
    back.click();
    expect(backCalls).toBe(1);
  });

  it('appends to a given parent instead of document.body when one is passed', () => {
    const parent = document.createElement('div');
    const screen = createCreditsScreen(() => {}, parent);
    expect(parent.contains(screen.el)).toBe(true);
    expect(document.body.contains(screen.el)).toBe(false);
  });
});
