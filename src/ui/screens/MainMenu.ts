import { icon } from '../icons';
import { renderLogo } from '../logo';
import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';

export interface MainMenuActions {
  canContinue: () => boolean;
  onContinue: () => void;
  onStory: () => void;
  onSandbox: () => void;
  onGarage: () => void;
  onSettings: () => void;
  onControls: () => void;
  onCredits: () => void;
  onQuit: () => void;
}

function iconButton(iconName: Parameters<typeof icon>[0], label: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'menu-button-label';
  span.innerHTML = icon(iconName, 18);
  span.append(document.createTextNode(label));
  return span;
}

/** J2/I11: the title screen. The animated background is the live 3D scene behind the panel. */
export function createMainMenu(
  actions: MainMenuActions,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('main-menu', 'ZOMBIEPURGE', 'Drive. Smash. Upgrade. Repeat.');
  el.classList.add('main-menu');
  const h1 = el.querySelector('h1')!;
  h1.innerHTML = renderLogo();
  h1.classList.add('logo-heading');

  const cont = menuButton('', actions.onContinue, 'primary');
  cont.replaceChildren(iconButton('play', 'Continue'));
  const story = menuButton('', actions.onStory);
  story.replaceChildren(iconButton('distance', 'Story Mode'));
  const sandbox = menuButton('', actions.onSandbox);
  sandbox.replaceChildren(iconButton('nitro', 'Sandbox'));
  const garage = menuButton('', actions.onGarage);
  garage.replaceChildren(iconButton('wrench', 'Garage'));
  const settings = menuButton('', actions.onSettings);
  settings.replaceChildren(iconButton('settings', 'Settings'));
  const controls = menuButton('', actions.onControls);
  controls.replaceChildren(iconButton('gamepad', 'Controls'));
  const credits = menuButton('', actions.onCredits);
  credits.replaceChildren(iconButton('credits', 'Credits'));
  const quit = menuButton('', actions.onQuit);
  quit.replaceChildren(iconButton('exit', 'Quit'));

  body.append(cont, story, sandbox, garage, settings, controls, credits, quit);
  parent.appendChild(el);
  return {
    id: 'main',
    el,
    onEnter: () => {
      cont.hidden = !actions.canContinue();
    },
    onBack: () => false,
  };
}
