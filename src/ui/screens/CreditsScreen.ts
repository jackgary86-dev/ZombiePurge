import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';

function section(heading: string, items: string[]): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'credits-section';
  const h2 = document.createElement('h2');
  h2.textContent = heading;
  const ul = document.createElement('ul');
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
  div.append(h2, ul);
  return div;
}

/** J13: team, tools and third-party asset licenses. */
export function createCreditsScreen(
  onBack: () => void,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('credits-screen', 'CREDITS');

  const team = section('Team', ['ZombiePurge — built by a dad and his son.']);

  const tools = section('Tools', [
    'Three.js — 3D rendering',
    'Rapier3D (Dimforge) — physics',
    'TypeScript — language',
    'Vite — build tooling',
    'Vitest — testing',
    'ESLint + Prettier — linting and formatting',
  ]);

  const licenses = section('Asset Licenses', [
    'Bebas Neue — Dharma Type, SIL Open Font License 1.1, served via Google Fonts',
    'Everything else (models, VFX, sound) is placeholder or procedural, built in-house — no third-party license needed yet',
  ]);

  body.append(team, tools, licenses, menuButton('Back', onBack));
  parent.appendChild(el);
  return { id: 'credits', el };
}
