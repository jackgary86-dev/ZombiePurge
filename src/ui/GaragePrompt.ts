import type { Garage } from '../game/shop';
import type { InteractPreview } from '../game/garageScene';
import { iconForUpgrade } from './icons';

/** R2/S7: a single "E - Buy/Pick up/Drop <part>" prompt, shown only while something is in
 *  range (or being carried) in the walkable Garage - mirrors `previewInteract()`'s own
 *  wording of what the next E-press will actually do. The part's own I10 category/weapon
 *  icon sits between the key-cap and the text, matching every other on-screen prompt that
 *  names a specific part (the Garage menu's own tier cards, the HUD). */
export class GaragePrompt {
  private readonly el: HTMLDivElement;
  private readonly iconEl: HTMLSpanElement;
  private readonly text: HTMLSpanElement;

  constructor(parent: HTMLElement = document.body) {
    this.el = document.createElement('div');
    this.el.id = 'garage-prompt';
    this.el.hidden = true;
    const key = document.createElement('span');
    key.className = 'garage-prompt-key';
    key.textContent = 'E';
    this.iconEl = document.createElement('span');
    this.iconEl.className = 'garage-prompt-icon';
    this.text = document.createElement('span');
    this.text.className = 'garage-prompt-text';
    this.el.append(key, this.iconEl, this.text);
    parent.appendChild(this.el);
  }

  update(preview: InteractPreview, garage: Pick<Garage, 'get' | 'nextTier'>): void {
    if (preview.type === 'none') {
      this.hide();
      return;
    }
    const def = garage.get(preview.id);
    this.iconEl.innerHTML = def ? iconForUpgrade(def.id, def.category, 18) : '';
    this.text.textContent = describe(preview, garage);
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}

function describe(
  preview: Exclude<InteractPreview, { type: 'none' }>,
  garage: Pick<Garage, 'get' | 'nextTier'>
): string {
  const name = garage.get(preview.id)?.name ?? preview.id;
  switch (preview.type) {
    case 'snap':
      return `Snap on ${name}`;
    case 'swap': {
      const displacedName = garage.get(preview.displacedId)?.name ?? preview.displacedId;
      return `Swap in ${name} (bumps ${displacedName})`;
    }
    case 'drop':
      return `Drop ${name}`;
    case 'pickupDropped':
    case 'pickupStation':
    case 'pickupZone':
      return `Pick up ${name}`;
    case 'buy': {
      const tier = garage.nextTier(preview.id);
      return tier ? `Buy ${name} ($${tier.price})` : `Buy ${name}`;
    }
  }
}
