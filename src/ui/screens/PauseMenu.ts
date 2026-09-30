import { icon } from '../icons';
import { buildPanel, iconMenuButton, type MenuScreen } from '../MenuStack';

export interface PauseActions {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onControls: () => void;
  onGarage: () => void;
  onMainMenu: () => void;
}

/** J7/S7: Resume, Restart, Settings, Controls, Return to Garage, Quit to Main Menu - each with
 *  the same I10 icon its Main Menu equivalent uses, for visual consistency between the two. */
export function createPauseMenu(
  actions: PauseActions,
  parent: HTMLElement = document.body
): MenuScreen {
  const { el, body } = buildPanel('pause-menu', 'PAUSED');
  body.append(
    iconMenuButton(icon('play', 18), 'Resume', actions.onResume, 'primary'),
    iconMenuButton(icon('restart', 18), 'Restart run', actions.onRestart),
    iconMenuButton(icon('settings', 18), 'Settings', actions.onSettings),
    iconMenuButton(icon('gamepad', 18), 'Controls', actions.onControls),
    iconMenuButton(icon('wrench', 18), 'Return to Garage', actions.onGarage),
    iconMenuButton(icon('exit', 18), 'Quit to Main Menu', actions.onMainMenu)
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
