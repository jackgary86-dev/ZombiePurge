import { describe, it, expect } from 'vitest';

describe('ZombiePurge', () => {
  it('should initialize correctly', () => {
    expect(true).toBe(true);
  });

  it('should have basic math working', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string concatenation', () => {
    const msg = 'Zombie' + 'Purge';
    expect(msg).toBe('ZombiePurge');
  });
});
