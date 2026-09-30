import { icon, type IconName } from '../icons';
import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';

function section(heading: string, iconName: IconName, items: string[]): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'credits-section';
  const h2 = document.createElement('h2');
  h2.innerHTML = `${icon(iconName, 18)} ${heading}`;
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

  const team = section('Team', 'credits', ['ZombiePurge — built by a dad and his son.']);

  const tools = section('Tools', 'wrench', [
    'Three.js — 3D rendering',
    'Rapier3D (Dimforge) — physics',
    'TypeScript — language',
    'Vite — build tooling',
    'Vitest — testing',
    'ESLint + Prettier — linting and formatting',
  ]);

  const licenses = section('Asset Licenses', 'customize', [
    'Bebas Neue — Dharma Type, SIL Open Font License 1.1, served via Google Fonts',
    'Everything else (models, VFX, sound) is placeholder or procedural, built in-house — no third-party license needed yet',
  ]);

  body.append(team, tools, licenses, menuButton('Back', onBack));
  parent.appendChild(el);
  return { id: 'credits', el };
}
