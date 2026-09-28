import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';

export interface SaveSlotSummary {
  id: string;
  name: string;
  /** Display name of the furthest map this slot has reached. */
  mapName: string;
  coins: number;
  playTimeSeconds: number;
}

export interface SaveSlotsActions {
  getSlots: () => SaveSlotSummary[];
  onNewGame: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

function formatPlayTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

/** J3: pick, delete or start a save slot before entering Story Mode. */
export function createSaveSlotsScreen(
  actions: SaveSlotsActions,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('save-slots', 'STORY MODE', 'Pick a save, or start a new one.');
  const list = document.createElement('div');
  list.className = 'save-slot-list';
  const newGame = menuButton('+ New Game', () => {
    actions.onNewGame();
    render();
  });
  body.append(list, newGame, menuButton('Back', actions.onBack));
  parent.appendChild(el);

  /** Delete needs a second click within a few seconds so a stray press can't wipe a save. */
  let armedForDelete: string | null = null;

  function render(): void {
    armedForDelete = null;
    const slots = actions.getSlots();
    list.replaceChildren();
    for (const slot of slots) {
      const row = document.createElement('div');
      row.className = 'save-slot-row';
      row.dataset.slot = slot.id;

      const info = document.createElement('div');
      info.className = 'save-slot-info';
      const name = document.createElement('div');
      name.className = 'save-slot-name';
      name.textContent = slot.name;
      const detail = document.createElement('div');
      detail.className = 'save-slot-detail';
      detail.textContent = `${slot.mapName} · ${slot.coins} coins · ${formatPlayTime(slot.playTimeSeconds)}`;
      info.append(name, detail);

      const play = menuButton('Play', () => actions.onSelect(slot.id), 'primary');
      const del = menuButton('Delete', () => {
        if (armedForDelete === slot.id) {
          actions.onDelete(slot.id);
          render();
        } else {
          armedForDelete = slot.id;
          del.textContent = 'Confirm delete?';
        }
      });
      row.append(info, play, del);
      list.appendChild(row);
    }
    if (slots.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'menu-subtitle';
      empty.textContent = 'No saves yet — start a new game.';
      list.appendChild(empty);
    }
  }

  return { id: 'save-slots', el, onEnter: render };
}
