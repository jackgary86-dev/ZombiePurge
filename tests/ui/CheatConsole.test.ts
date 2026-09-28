import { describe, it, expect, afterEach, vi } from 'vitest';
import { CheatConsole, runCommand, type CheatTarget } from '../../src/ui/CheatConsole';

function fakeTarget(): CheatTarget & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    spawnZombie: (rank, count) => {
      calls.push(`spawn ${rank} ${count}`);
      return count;
    },
    addCoins: (n) => {
      calls.push(`coins ${n}`);
      return 100 + n;
    },
    setGodMode: (on) => calls.push(`god ${on}`),
    teleport: (x, z) => calls.push(`tp ${x} ${z}`),
    heal: () => calls.push('heal'),
    killAll: () => {
      calls.push('killall');
      return 7;
    },
    unlockAllUpgrades: () => 'no upgrades yet (D2)',
  };
}

describe('runCommand (K4)', () => {
  it('spawns zombies of a rank, clamping the count', () => {
    const t = fakeTarget();
    expect(runCommand('spawn tank 3', t, { on: false })).toEqual({
      ok: true,
      message: 'spawned 3 tanks',
    });
    expect(runCommand('SPAWN Walker', t, { on: false }).message).toBe('spawned 1 walker');
    expect(runCommand('spawn tank 500', t, { on: false }).message).toBe('spawned 100 tanks');
    expect(runCommand('spawn dragon', t, { on: false }).ok).toBe(false);
    expect(t.calls).toEqual(['spawn tank 3', 'spawn walker 1', 'spawn tank 100']);
  });

  it('adds coins, toggles god mode, teleports, heals, kills all', () => {
    const t = fakeTarget();
    const god = { on: false };
    expect(runCommand('coins 250', t, god).message).toBe('coins: 350');
    expect(runCommand('coins abc', t, god).ok).toBe(false);
    expect(runCommand('god', t, god).message).toBe('god mode ON');
    expect(runCommand('god', t, god).message).toBe('god mode off');
    expect(runCommand('god on', t, god).message).toBe('god mode ON');
    expect(runCommand('tp 100 -50', t, god).message).toBe('teleported to 100, -50');
    expect(runCommand('tp 1', t, god).ok).toBe(false);
    expect(runCommand('heal', t, god).ok).toBe(true);
    expect(runCommand('killall', t, god).message).toBe('killed 7');
    expect(runCommand('unlockall', t, god).message).toBe('no upgrades yet (D2)');
    expect(runCommand('nope', t, god).ok).toBe(false);
    expect(runCommand('', t, god).ok).toBe(false);
    expect(t.calls).toContain('god true');
    expect(t.calls).toContain('tp 100 -50');
  });
});

describe('CheatConsole DOM', () => {
  let console_: CheatConsole | null = null;
  afterEach(() => console_?.dispose());

  it('toggles with the backquote key and runs typed commands', () => {
    const t = fakeTarget();
    const target = new EventTarget();
    console_ = new CheatConsole(t, { target });
    expect(console_.visible).toBe(false);
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }));
    expect(console_.visible).toBe(true);
    const input = console_.el.querySelector('input')!;
    input.value = 'spawn brute 2';
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    expect(t.calls).toContain('spawn brute 2');
    expect(console_.el.textContent).toContain('spawned 2 brutes');
    expect(input.value).toBe('');
  });

  it('does not leak typed keys to the game', () => {
    const t = fakeTarget();
    const gameListener = vi.fn();
    window.addEventListener('keydown', gameListener);
    console_ = new CheatConsole(t, { target: new EventTarget() });
    const input = console_.el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
    window.removeEventListener('keydown', gameListener);
    expect(gameListener).not.toHaveBeenCalled();
  });
});
