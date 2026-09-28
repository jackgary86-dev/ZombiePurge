import { buildPanel, menuButton, type MenuScreen } from '../MenuStack';

export interface PauseActions {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onControls: () => void;
  onGarage: () => void;
  onMainMenu: () => void;
}

/** J7: Resume, Restart, Settings, Controls, Return to Garage, Quit to Main Menu. */
export function createPauseMenu(
  actions: PauseActions,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('pause-menu', 'PAUSED');
  body.append(
    menuButton('Resume', actions.onResume, 'primary'),
    menuButton('Restart run', actions.onRestart),
    menuButton('Settings', actions.onSettings),
    menuButton('Controls', actions.onControls),
    menuButton('Return to Garage', actions.onGarage),
    menuButton('Quit to Main Menu', actions.onMainMenu)
  );
  parent.appendChild(el);
  return {
    id: 'pause',
    el,
    onBack: () => {
      actions.onResume();
      return false;
    },
  };
}
