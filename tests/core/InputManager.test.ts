import { describe, it, expect, beforeEach } from 'vitest';
import {
  BINDINGS_STORAGE_KEY,
  DEFAULT_BINDINGS,
  InputManager,
  loadBindings,
  rebindKeyboard,
  saveBindings,
  type BindingsStorage,
} from '../../src/core/input';

class MemoryStorage implements BindingsStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function key(type: 'keydown' | 'keyup', code: string, repeat = false) {
  return new KeyboardEvent(type, { code, repeat });
}

function fakeGamepad(axes: number[], buttons: Array<number | boolean>): Gamepad {
  return {
    axes,
    buttons: buttons.map((b) => ({
      pressed: typeof b === 'boolean' ? b : b > 0.5,
      touched: false,
      value: typeof b === 'boolean' ? (b ? 1 : 0) : b,
    })),
  } as unknown as Gamepad;
}

describe('InputManager keyboard', () => {
  let target: EventTarget;
  let input: InputManager;

  beforeEach(() => {
    target = new EventTarget();
    input = new InputManager({ target, storage: null, getGamepads: () => [] });
    input.attach();
  });

  it('maps bound keys to actions and axes', () => {
    target.dispatchEvent(key('keydown', 'KeyW'));
    target.dispatchEvent(key('keydown', 'ArrowLeft'));
    input.update();
    expect(input.isDown('throttle')).toBe(true);
    expect(input.axis('throttle')).toBe(1);
    expect(input.axis('steer')).toBe(-1);

    target.dispatchEvent(key('keyup', 'ArrowLeft'));
    target.dispatchEvent(key('keydown', 'KeyD'));
    input.update();
    expect(input.axis('steer')).toBe(1);
  });

  it('reports justPressed only on the first frame', () => {
    target.dispatchEvent(key('keydown', 'Escape'));
    input.update();
    expect(input.justPressed('pause')).toBe(true);
    input.update();
    expect(input.justPressed('pause')).toBe(false);
    expect(input.isDown('pause')).toBe(true);
  });

  it('ignores key repeat and releases everything on blur', () => {
    target.dispatchEvent(key('keydown', 'KeyW', true));
    input.update();
    expect(input.isDown('throttle')).toBe(false);

    target.dispatchEvent(key('keydown', 'KeyW'));
    input.update();
    expect(input.isDown('throttle')).toBe(true);
    target.dispatchEvent(new Event('blur'));
    input.update();
    expect(input.isDown('throttle')).toBe(false);
  });

  it('stops listening after detach', () => {
    input.detach();
    target.dispatchEvent(key('keydown', 'KeyW'));
    input.update();
    expect(input.isDown('throttle')).toBe(false);
  });
});

describe('InputManager gamepad', () => {
  it('reads triggers and sticks with a deadzone', () => {
    let pad = fakeGamepad([0.05, 0], [false, false, false, false, false, false, 0, 0.8]);
    const input = new InputManager({
      target: new EventTarget(),
      storage: null,
      getGamepads: () => [pad],
    });
    input.update();
    expect(input.axis('throttle')).toBeCloseTo(0.8);
    expect(input.axis('steer')).toBe(0); // inside the deadzone

    pad = fakeGamepad([1, 0], [true, false, false, false, false, false, 0, 0]);
    input.update();
    expect(input.axis('steer')).toBe(1);
    expect(input.isDown('handbrake')).toBe(true);
    expect(input.axis('throttle')).toBe(0);
  });
});

describe('bindings persistence', () => {
  it('saves and loads rebinds, removing the key from its previous action', () => {
    const storage = new MemoryStorage();
    const rebound = rebindKeyboard(DEFAULT_BINDINGS, 'handbrake', ['KeyW']);
    expect(rebound.keyboard.handbrake).toEqual(['KeyW']);
    expect(rebound.keyboard.throttle).toEqual(['ArrowUp']);
    saveBindings(rebound, storage);
    expect(loadBindings(storage).keyboard.handbrake).toEqual(['KeyW']);
  });

  it('falls back to defaults on corrupt or outdated saves', () => {
    const storage = new MemoryStorage();
    storage.setItem(BINDINGS_STORAGE_KEY, '{not json');
    expect(loadBindings(storage)).toEqual(DEFAULT_BINDINGS);
    storage.setItem(
      BINDINGS_STORAGE_KEY,
      JSON.stringify({ version: 0, keyboard: { throttle: ['KeyZ'] } })
    );
    expect(loadBindings(storage).keyboard.throttle).toEqual(DEFAULT_BINDINGS.keyboard.throttle);
  });

  it('InputManager persists bindings through setBindings', () => {
    const storage = new MemoryStorage();
    const target = new EventTarget();
    const input = new InputManager({ target, storage, getGamepads: () => [] });
    input.attach();
    input.setBindings(rebindKeyboard(input.getBindings(), 'fire', ['KeyX']));
    target.dispatchEvent(key('keydown', 'KeyX'));
    input.update();
    expect(input.isDown('fire')).toBe(true);
    expect(
      new InputManager({ target, storage, getGamepads: () => [] }).getBindings().keyboard.fire
    ).toEqual(['KeyX']);
  });
});
