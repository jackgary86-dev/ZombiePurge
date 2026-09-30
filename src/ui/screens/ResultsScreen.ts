import type { RunSummary } from '../../game/economy/RunStats';
import { ZOMBIE_RANKS } from '../../data/validate';
import { icon, type IconName } from '../icons';
import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';

export interface ResultsActions {
  onRetry: () => void;
  onGarage: () => void;
  onMainMenu: () => void;
}

export interface ResultsData {
  title: string;
  summary: RunSummary;
  coinsKept: number;
}

/** J8: kills by rank, distance, coins from kills vs. distance, total earned / kept. */
export function createResultsScreen(actions: ResultsActions, parent: HTMLElement = document.body) {
  const { el, body } = buildPanel('results-screen', 'WRECKED');
  const title = el.querySelector('h1')!;
  const table = document.createElement('table');
  table.className = 'results-table';
  body.appendChild(table);
  body.append(
    menuButton('Retry', actions.onRetry, 'primary'),
    menuButton('Garage', actions.onGarage),
    menuButton('Main Menu', actions.onMainMenu)
  );
  parent.appendChild(el);

  const screen: MenuScreen = { id: 'results', el, onBack: () => false };

  function show(data: ResultsData): void {
    title.textContent = data.title;
    const s = data.summary;
    // S7: every row gets its own I10 icon - rank breakdown rows share `kill` with the "Total
    // kills" row underneath them (a run-over/shot kill reads the same regardless of rank).
    const rows: [string, string, IconName][] = [];
    for (const rank of ZOMBIE_RANKS) {
      if (s.killsByRank[rank] > 0)
        rows.push([
          `${rank[0].toUpperCase()}${rank.slice(1)}s`,
          String(s.killsByRank[rank]),
          'kill',
        ]);
    }
    rows.push(['Total kills', String(s.totalKills), 'kill']);
    rows.push(['Distance', `${(s.distanceMeters / 1000).toFixed(2)} km`, 'distance']);
    rows.push([
      'Time',
      `${Math.floor(s.durationSeconds / 60)}:${String(Math.floor(s.durationSeconds % 60)).padStart(2, '0')}`,
      'clock',
    ]);
    rows.push(['Coins from kills', String(s.coinsFromKills), 'coin']);
    rows.push(['Coins from distance', String(s.coinsFromDistance), 'coin']);
    rows.push(['Total earned', String(s.coinsTotal), 'coin']);
    rows.push(['Kept', String(data.coinsKept), 'coin']);
    table.replaceChildren(
      ...rows.map(([k, v, rowIcon]) => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.innerHTML = `${icon(rowIcon, 15)} ${k}`;
        const td2 = document.createElement('td');
        td2.textContent = v;
        tr.append(td1, td2);
        return tr;
      })
    );
  }

  return { screen, show };
}
