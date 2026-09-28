import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';

/** J11: keyboard and gamepad layouts plus basic tips. */
export function createControlsScreen(
  onBack: () => void,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('controls-screen', 'CONTROLS');
  const table = document.createElement('table');
  table.className = 'results-table';
  const rows: [string, string, string][] = [
    ['Drive / reverse', 'W / S or ↑ / ↓', 'Right / left trigger'],
    ['Steer', 'A / D or ← / →', 'Left stick'],
    ['Handbrake', 'Space', 'A'],
    ['Fire', 'F or left click', 'Right bumper'],
    ['Nitro', 'Shift', 'X'],
    ['Flip reset', 'R', 'Y'],
    ['Orbit camera', 'Click, then move the mouse', 'Right stick'],
    ['Pause', 'Esc / P', 'Start'],
  ];
  const head = document.createElement('tr');
  for (const h of ['Action', 'Keyboard', 'Gamepad']) {
    const th = document.createElement('th');
    th.textContent = h;
    head.appendChild(th);
  }
  table.appendChild(head);
  for (const r of rows) {
    const tr = document.createElement('tr');
    for (const c of r) {
      const td = document.createElement('td');
      td.textContent = c;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  const tips = document.createElement('p');
  tips.className = 'menu-subtitle';
  tips.textContent =
    'Tips: zombies only notice you at 40–80 m — use the minimap to pick your line. Speed kills: hit them fast. Watch the fuel gauge; gas cans refill it. Chain kills quickly for a combo multiplier.';
  body.append(table, tips, menuButton('Back', onBack));
  parent.appendChild(el);
  return { id: 'controls', el };
}
