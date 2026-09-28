import { describe, it, expect } from 'vitest';
import { renderLogo } from '../../src/ui/logo';

describe('I11 logo', () => {
  it('renders a valid, accessible, two-line wordmark', () => {
    const svg = renderLogo();
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.getElementsByTagName('parsererror').length).toBe(0);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="ZombiePurge"');
    expect(svg).toContain('>ZOMBIE<');
    expect(svg).toContain('>PURGE<');
  });
});
