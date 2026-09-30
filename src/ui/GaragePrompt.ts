import type { Garage } from '../game/shop';
import type { InteractPreview } from '../game/garageScene';

/** R2: a single "E - Buy/Pick up/Drop <part>" prompt, shown only while something is in
 *  range (or being carried) in the walkable Garage - mirrors `previewInteract()`'s own
 *  wording of what the next E-press will actually do. */
export class GaragePrompt {
  private readonly el: HTMLDivElement;
  private readonly text: HTMLSpanElement;

  constructor(parent: HTMLElement = document.body) {
    this.el = document.createElement('div');
    this.el.id = 'garage-prompt';
    this.el.hidden = true;
    const key = document.createElement('span');
    key.className = 'garage-prompt-key';
    key.textContent = 'E';
    this.text = document.createElement('span');
    this.text.className = 'garage-prompt-text';
    this.el.append(key, this.text);
    parent.appendChild(this.el);
  }

  update(preview: InteractPreview, garage: Pick<Garage, 'get' | 'nextTier'>): void {
    if (preview.type === 'none') {
      this.hide();
      return;
    }
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
