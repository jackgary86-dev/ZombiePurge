import { describe, it, expect, afterEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/data/config';
import { DEFAULT_SANDBOX, SettingsStore } from '../../src/data/settings';
import { DEFAULT_BINDINGS, type Bindings } from '../../src/core/input';
import { MenuStack } from '../../src/ui/MenuStack';
import {
  createMainMenu,
  createPauseMenu,
  createResultsScreen,
  createSandboxSetup,
  createSettingsMenu,
} from '../../src/ui/screens';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('M3 menu screens', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('main menu hides Continue without a run to continue and never pops', () => {
    resetConfig();
    let canContinue = false;
    const calls: string[] = [];
    const menu = createMainMenu({
      canContinue: () => canContinue,
      onContinue: () => calls.push('continue'),
      onStory: () => calls.push('story'),
      onSandbox: () => calls.push('sandbox'),
      onGarage: () => calls.push('garage'),
      onSettings: () => calls.push('settings'),
      onControls: () => calls.push('controls'),
      onCredits: () => calls.push('credits'),
      onQuit: () => calls.push('quit'),
    });
    const stack = new MenuStack({ target: new EventTarget(), getGamepads: () => [] });
    stack.push(menu);
    const buttons = [...menu.el.querySelectorAll('button')];
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Continue',
      'Story Mode',
      'Sandbox',
      'Garage',
      'Settings',
      'Controls',
      'Credits',
      'Quit',
    ]);
    expect(buttons[0].hidden).toBe(true);
    buttons[2].click();
    expect(calls).toEqual(['sandbox']);
    expect(stack.back()).toBe(false);
    canContinue = true;
    menu.onEnter!();
    expect(buttons[0].hidden).toBe(false);
  });

  it('sandbox setup edits options, blocks locked maps, and starts with the chosen options', () => {
    resetConfig();
    const maps = getConfig().maps;
    let changed = null as never;
    let started = null as never;
    const screen = createSandboxSetup({
      maps,
      isUnlocked: (m) => m.id !== 'greybox',
      options: { ...DEFAULT_SANDBOX },
      onChange: (o) => (changed = o as never),
      onStart: (o) => (started = o as never),
      onBack: () => undefined,
    });
    const density = screen.el.querySelector<HTMLInputElement>('input[type=range]')!;
    density.value = '0.4';
    density.dispatchEvent(new Event('input'));
    expect(changed).toMatchObject({ zombieDensity: 0.4 });
    const [night] = screen.el.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    night.checked = true;
    night.dispatchEvent(new Event('change'));
    const start = [...screen.el.querySelectorAll('button')].find(
      (b) => b.textContent === 'DRIVE ▶'
    )!;
    expect(start.disabled).toBe(false);
    const sel = screen.el.querySelector('select')!;
    expect(sel.options[0].textContent).toContain('locked');
    sel.value = 'greybox';
    sel.dispatchEvent(new Event('change'));
    expect(start.disabled).toBe(true);
    sel.value = 'openfield';
    sel.dispatchEvent(new Event('change'));
    start.click();
    expect(started).toMatchObject({ mapId: 'openfield', zombieDensity: 0.4, night: true });
  });

  it('results screen lists kills by rank and coin sources; pause menu resumes on back', () => {
    const results = createResultsScreen({
      onRetry: () => undefined,
      onGarage: () => undefined,
      onMainMenu: () => undefined,
    });
    results.show({
      title: 'OUT OF GAS',
      coinsKept: 7,
      summary: {
        killsByRank: {
          walker: 3,
          runner: 1,
          spitter: 0,
          brute: 0,
          tank: 0,
          iceZombie: 0,
          boss: 0,
        },
        totalKills: 4,
        distanceMeters: 1234,
        coinsFromKills: 5,
        coinsFromDistance: 4,
        coinsTotal: 9,
        durationSeconds: 95,
      },
    });
    const text = results.screen.el.textContent!;
    expect(text).toContain('OUT OF GAS');
    expect(text).toContain('Walkers3');
    expect(text).toContain('Runners1');
    expect(text).not.toContain('Spitters');
    expect(text).toContain('1.23 km');
    expect(text).toContain('1:35');
    expect(text).toContain('Kept7');

    let resumed = 0;
    const pause = createPauseMenu({
      onResume: () => resumed++,
      onRestart: () => undefined,
      onSettings: () => undefined,
      onControls: () => undefined,
      onGarage: () => undefined,
      onMainMenu: () => undefined,
    });
    const stack = new MenuStack({ target: new EventTarget(), getGamepads: () => [] });
    stack.push(pause);
    stack.back();
    expect(resumed).toBe(1);
  });

  it('settings menu writes to the store and rebinds a key', () => {
    const store = new SettingsStore(new MemoryStorage());
    let bindings: Bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
    const screen = createSettingsMenu({
      store,
      getBindings: () => bindings,
      setBindings: (b) => (bindings = b),
      onBack: () => undefined,
    });
    screen.onEnter!();
    const [gore] = [...screen.el.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].slice(
      1,
      2
    );
    gore.checked = true;
    gore.dispatchEvent(new Event('change'));
    expect(store.get().lowGore).toBe(true);
    const sliders = screen.el.querySelectorAll<HTMLInputElement>('input[type=range]');
    sliders[1].value = '0.2';
    sliders[1].dispatchEvent(new Event('input'));
    expect(store.get().masterVolume).toBe(0.2);

    const keyButtons = [...screen.el.querySelectorAll<HTMLButtonElement>('button.key')];
    expect(keyButtons[0].textContent).toBe('W / Up');
    keyButtons[4].click(); // handbrake
    expect(keyButtons[4].textContent).toBe('press a key…');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));
    expect(bindings.keyboard.handbrake).toEqual(['KeyB']);
    expect(keyButtons[4].textContent).toBe('B');
  });
});
