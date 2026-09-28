import type { MapConfig } from '../../data/types';
import type { RunSummary } from '../../game/economy/RunStats';
import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';

export interface MapCompleteData {
  completedMap: MapConfig;
  /** null when the completed map was the last one in story order. */
  nextMap: MapConfig | null;
  /** Upgrade names newly available now that the next map is unlocked. */
  newlyUnlocked: string[];
  summary: RunSummary;
}

export interface MapCompleteActions {
  onContinue: () => void;
}

/** J9: shown between story maps — what you did, what's next, before loading it. */
export function createMapCompleteScreen(
  actions: MapCompleteActions,
  parent: HTMLElement = document.body
) {
  const { el, body } = buildPanel('map-complete', 'MAP COMPLETE');
  const title = el.querySelector('h1')!;
  const stats = document.createElement('p');
  const next = document.createElement('div');
  next.className = 'map-complete-next';
  const continueButton = menuButton('Continue ▶', () => actions.onContinue(), 'primary');
  body.append(stats, next, continueButton);
  parent.appendChild(el);

  const screen: MenuScreen = { id: 'map-complete', el, onBack: () => false };

  function show(data: MapCompleteData): void {
    title.textContent = `${data.completedMap.name.toUpperCase()} — COMPLETE`;
    stats.textContent =
      `${data.summary.totalKills} kills · ${(data.summary.distanceMeters / 1000).toFixed(2)} km · ` +
      `${data.summary.coinsTotal} coins earned`;
    next.replaceChildren();
    if (data.nextMap) {
      const heading = document.createElement('h2');
      heading.textContent = `Next: ${data.nextMap.name}`;
      const enemies = document.createElement('p');
      enemies.textContent = `New enemies: ${data.nextMap.zombieRanks
        .map((r) => r[0].toUpperCase() + r.slice(1))
        .join(', ')}`;
      next.append(heading, enemies);
      if (data.newlyUnlocked.length > 0) {
        const unlocked = document.createElement('p');
        unlocked.textContent = `Newly unlocked: ${data.newlyUnlocked.join(', ')}`;
        next.appendChild(unlocked);
      }
      continueButton.textContent = 'Continue ▶';
    } else {
      const heading = document.createElement('h2');
      heading.textContent = 'That was the last map — thanks for playing!';
      next.appendChild(heading);
      continueButton.textContent = 'Back to World Map';
    }
  }

  return { screen, show };
}
