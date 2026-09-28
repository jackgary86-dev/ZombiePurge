import type { MapConfig } from '../../data/types';
import type { SandboxOptions } from '../../data/settings';
import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';
import { labelledRow, select, slider, toggle } from './common';

export interface SandboxSetupActions {
  maps: MapConfig[];
  /** Maps the player has unlocked (story progress); sandbox-only maps are always allowed. */
  isUnlocked: (map: MapConfig) => boolean;
  options: SandboxOptions;
  onChange: (options: SandboxOptions) => void;
  onStart: (options: SandboxOptions) => void;
  onBack: () => void;
}

/** J6 / F1: pick a map, density, day/night, infinite money and no-fail, then drive. */
export function createSandboxSetup(
  actions: SandboxSetupActions,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('sandbox-setup', 'SANDBOX', 'Any unlocked map, your rules.');
  const options = { ...actions.options };
  const emit = () => actions.onChange({ ...options });

  const mapChoices = actions.maps.map((m) => ({
    value: m.id,
    label: actions.isUnlocked(m)
      ? `${m.name} (${(m.size / 1000).toFixed(1)} km)`
      : `${m.name} — locked`,
  }));
  const mapSelect = select(mapChoices, options.mapId, (v) => {
    options.mapId = v;
    emit();
    refresh();
  });
  const densityValue = document.createElement('span');
  const density = slider(0, 1, 0.05, options.zombieDensity, (v) => {
    options.zombieDensity = v;
    densityValue.textContent = `${Math.round(v * 100)}%`;
    emit();
  });
  const densityWrap = document.createElement('span');
  densityWrap.className = 'slider-with-value';
  densityWrap.append(density, densityValue);
  densityValue.textContent = `${Math.round(options.zombieDensity * 100)}%`;

  const night = toggle(options.night, (v) => {
    options.night = v;
    emit();
  });
  const money = toggle(options.infiniteMoney, (v) => {
    options.infiniteMoney = v;
    emit();
  });
  const noFail = toggle(options.noFail, (v) => {
    options.noFail = v;
    emit();
  });
  const start = menuButton('DRIVE ▶', () => actions.onStart({ ...options }), 'primary');

  body.append(
    labelledRow('Map', mapSelect),
    labelledRow('Zombie density', densityWrap),
    labelledRow('Night', night),
    labelledRow('Infinite money', money),
    labelledRow('No-fail free roam', noFail),
    start,
    menuButton('Back', actions.onBack)
  );
  parent.appendChild(el);

  function refresh(): void {
    const map = actions.maps.find((m) => m.id === options.mapId);
    start.disabled = !map || !actions.isUnlocked(map);
  }
  refresh();

  return { id: 'sandbox', el, onEnter: refresh };
}
