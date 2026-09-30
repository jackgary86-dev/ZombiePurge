import type { GameSettings, GraphicsQuality, SettingsStore } from '../../data/settings';
import type { Bindings, GameAction } from '../../core/input';
import { GAME_ACTIONS, rebindKeyboard } from '../../core/input';
import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';
import { labelledRow, select, slider, toggle } from './common';

export interface SettingsActions {
  store: SettingsStore;
  getBindings: () => Bindings;
  setBindings: (b: Bindings) => void;
  onBack: () => void;
}

const ACTION_LABELS: Record<GameAction, string> = {
  throttle: 'Accelerate',
  brake: 'Brake / reverse',
  steerLeft: 'Steer left',
  steerRight: 'Steer right',
  handbrake: 'Handbrake',
  flipReset: 'Flip reset',
  nitro: 'Nitro',
  fire: 'Fire',
  pause: 'Pause',
  interact: 'Interact',
};

function keyName(code: string): string {
  return code
    .replace(/^Key/, '')
    .replace(/^Arrow/, '')
    .replace(/^Mouse0$/, 'Left click')
    .replace(/^Mouse2$/, 'Right click');
}

/** J10: graphics quality, draw distance, volumes, key rebinding, gore toggle, camera sensitivity. */
export function createSettingsMenu(
  actions: SettingsActions,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('settings-menu', 'SETTINGS');
  const store = actions.store;
  const s = () => store.get();

  const graphics = select<GraphicsQuality>(
    [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ],
    s().graphicsQuality,
    (v) => store.set({ graphicsQuality: v })
  );
  const draw = slider(0.5, 1.5, 0.05, s().drawDistanceScale, (v) =>
    store.set({ drawDistanceScale: v })
  );
  const master = slider(0, 1, 0.05, s().masterVolume, (v) => store.set({ masterVolume: v }));
  const music = slider(0, 1, 0.05, s().musicVolume, (v) => store.set({ musicVolume: v }));
  const sfx = slider(0, 1, 0.05, s().sfxVolume, (v) => store.set({ sfxVolume: v }));
  const sens = slider(0.25, 3, 0.05, s().cameraSensitivity, (v) =>
    store.set({ cameraSensitivity: v })
  );
  const invert = toggle(s().invertCameraY, (v) => store.set({ invertCameraY: v }));
  const gore = toggle(s().lowGore, (v) => store.set({ lowGore: v }));
  const fps = toggle(s().showFps, (v) => store.set({ showFps: v }));

  body.append(
    labelledRow('Graphics quality', graphics),
    labelledRow('Draw distance', draw),
    labelledRow('Master volume', master),
    labelledRow('Music volume', music),
    labelledRow('Effects volume', sfx),
    labelledRow('Camera sensitivity', sens),
    labelledRow('Invert camera Y', invert),
    labelledRow('Low gore', gore),
    labelledRow('Show fps', fps)
  );

  // Key rebinding: click a key button, press the new key.
  const keys = document.createElement('div');
  keys.className = 'keybinds';
  const heading = document.createElement('h2');
  heading.textContent = 'Controls';
  keys.appendChild(heading);
  const keyButtons = new Map<GameAction, HTMLButtonElement>();
  let listening: GameAction | null = null;
  for (const action of GAME_ACTIONS) {
    const btn = menuButton('', () => beginRebind(action), 'key');
    keyButtons.set(action, btn);
    keys.appendChild(labelledRow(ACTION_LABELS[action], btn));
  }
  body.appendChild(keys);
  body.append(
    menuButton('Reset to defaults', () => {
      store.reset();
      syncFromStore(s());
    }),
    menuButton('Back', actions.onBack)
  );
  parent.appendChild(el);

  function refreshKeys(): void {
    const b = actions.getBindings();
    for (const action of GAME_ACTIONS) {
      const btn = keyButtons.get(action)!;
      btn.textContent =
        listening === action ? 'press a key…' : b.keyboard[action].map(keyName).join(' / ') || '—';
    }
  }

  function beginRebind(action: GameAction): void {
    listening = action;
    refreshKeys();
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener('keydown', onKey, true);
      if (e.code !== 'Escape')
        actions.setBindings(rebindKeyboard(actions.getBindings(), action, [e.code]));
      listening = null;
      refreshKeys();
    };
    window.addEventListener('keydown', onKey, true);
  }

  function syncFromStore(v: GameSettings): void {
    graphics.value = v.graphicsQuality;
    draw.value = String(v.drawDistanceScale);
    master.value = String(v.masterVolume);
    music.value = String(v.musicVolume);
    sfx.value = String(v.sfxVolume);
    sens.value = String(v.cameraSensitivity);
    invert.checked = v.invertCameraY;
    gore.checked = v.lowGore;
    fps.checked = v.showFps;
  }

  return {
    id: 'settings',
    el,
    onEnter: () => {
      syncFromStore(s());
      refreshKeys();
    },
  };
}
