import type { MapConfig } from '../../data/types';
import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';

export interface StoryMapEntry {
  map: MapConfig;
  unlocked: boolean;
  completed: boolean;
}

export interface StoryMapSelectActions {
  /** Story maps sorted by `storyIndex`. */
  getEntries: () => StoryMapEntry[];
  onPlay: (mapId: string) => void;
  onBack: () => void;
}

/** J5: the 5-map world map — locked/unlocked/completed state and each map's objectives. */
export function createStoryMapSelect(
  actions: StoryMapSelectActions,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('story-map-select', 'STORY MODE', 'Choose a map.');
  const list = document.createElement('div');
  list.className = 'story-map-list';
  body.append(list, menuButton('Back', actions.onBack));
  parent.appendChild(el);

  function render(): void {
    list.replaceChildren();
    for (const entry of actions.getEntries()) {
      const { map } = entry;
      const card = document.createElement('div');
      card.className = `story-map-card${entry.completed ? ' completed' : ''}${entry.unlocked ? '' : ' locked'}`;
      card.dataset.map = map.id;

      const title = document.createElement('h2');
      title.textContent = `${map.storyIndex ?? '?'}. ${map.name}`;
      const enemies = document.createElement('p');
      enemies.textContent = `Enemies: ${map.zombieRanks.map((r) => r[0].toUpperCase() + r.slice(1)).join(', ')}`;
      const objectives = document.createElement('ul');
      for (const o of map.objectives ?? []) {
        const li = document.createElement('li');
        li.textContent = o.label;
        objectives.appendChild(li);
      }
      const status = document.createElement('p');
      status.className = 'story-map-status';
      status.textContent = entry.completed ? 'Completed' : entry.unlocked ? 'Unlocked' : 'Locked';

      const play = menuButton(entry.completed ? 'Replay' : 'Play', () => actions.onPlay(map.id));
      play.disabled = !entry.unlocked;

      card.append(title, enemies, objectives, status, play);
      list.appendChild(card);
    }
  }

  return { id: 'story-map-select', el, onEnter: render };
}
