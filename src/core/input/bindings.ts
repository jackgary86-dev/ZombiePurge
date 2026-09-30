import { GAME_ACTIONS, type Bindings, type GameAction } from './actions';

export const BINDINGS_VERSION = 1;
export const BINDINGS_STORAGE_KEY = 'zombiepurge.bindings';

// Standard gamepad layout: https://w3c.github.io/gamepad/#remapping
export const DEFAULT_BINDINGS: Bindings = {
  version: BINDINGS_VERSION,
  keyboard: {
    throttle: ['KeyW', 'ArrowUp'],
    brake: ['KeyS', 'ArrowDown'],
    steerLeft: ['KeyA', 'ArrowLeft'],
    steerRight: ['KeyD', 'ArrowRight'],
    handbrake: ['Space'],
    flipReset: ['KeyR'],
    nitro: ['ShiftLeft', 'ShiftRight'],
    fire: ['Mouse0', 'KeyF'],
    pause: ['Escape', 'KeyP'],
    interact: ['KeyE'],
  },
  gamepad: {
    throttle: [{ kind: 'button', index: 7 }],
    brake: [{ kind: 'button', index: 6 }],
    steerLeft: [{ kind: 'axis', index: 0, direction: -1 }],
    steerRight: [{ kind: 'axis', index: 0, direction: 1 }],
    handbrake: [{ kind: 'button', index: 0 }],
    flipReset: [{ kind: 'button', index: 3 }],
    nitro: [{ kind: 'button', index: 2 }],
    fire: [{ kind: 'button', index: 5 }],
    pause: [{ kind: 'button', index: 9 }],
    interact: [{ kind: 'button', index: 1 }],
  },
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface BindingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): BindingsStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Loads saved bindings, falling back to defaults for anything missing or from an older version. */
export function loadBindings(storage: BindingsStorage | null = defaultStorage()): Bindings {
  const bindings = clone(DEFAULT_BINDINGS);
  if (!storage) return bindings;
  try {
    const raw = storage.getItem(BINDINGS_STORAGE_KEY);
    if (!raw) return bindings;
    const saved = JSON.parse(raw) as Partial<Bindings>;
    if (saved.version !== BINDINGS_VERSION) return bindings;
    for (const action of GAME_ACTIONS) {
      const keys = saved.keyboard?.[action];
      if (Array.isArray(keys) && keys.every((k) => typeof k === 'string'))
        bindings.keyboard[action] = keys;
      const pads = saved.gamepad?.[action];
      if (Array.isArray(pads)) bindings.gamepad[action] = pads;
    }
  } catch {
    // Corrupt saved data: keep defaults rather than crash at boot.
  }
  return bindings;
}

export function saveBindings(
  bindings: Bindings,
  storage: BindingsStorage | null = defaultStorage()
): void {
  storage?.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(bindings));
}

/** Returns a new Bindings with `action` bound to `codes`, removing those codes from other actions. */
export function rebindKeyboard(bindings: Bindings, action: GameAction, codes: string[]): Bindings {
  const next = clone(bindings);
  for (const other of GAME_ACTIONS) {
    if (other !== action)
      next.keyboard[other] = next.keyboard[other].filter((c) => !codes.includes(c));
  }
  next.keyboard[action] = [...codes];
  return next;
}
