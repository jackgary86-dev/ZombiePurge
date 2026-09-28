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

/** J2: the title screen. The animated background is the live 3D scene behind the panel. */
export function createMainMenu(
  actions: MainMenuActions,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('main-menu', 'ZOMBIEPURGE', 'Drive. Smash. Upgrade. Repeat.');
  el.classList.add('main-menu');
  const cont = menuButton('Continue', actions.onContinue, 'primary');
  body.append(
    cont,
    menuButton('Story Mode', actions.onStory),
    menuButton('Sandbox', actions.onSandbox),
    menuButton('Garage', actions.onGarage),
    menuButton('Settings', actions.onSettings),
    menuButton('Controls', actions.onControls),
    menuButton('Credits', actions.onCredits),
    menuButton('Quit', actions.onQuit)
  );
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
