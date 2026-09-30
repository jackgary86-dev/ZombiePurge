import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/data/config';
import { Wallet } from '../../src/game/economy';
import { Garage } from '../../src/game/shop';
import { GaragePrompt } from '../../src/ui/GaragePrompt';
import type { InteractPreview } from '../../src/game/garageScene';

describe("S7: GaragePrompt shows the part's own I10 icon", () => {
  let garage: Garage;

  beforeEach(() => {
    resetConfig();
    const wallet = new Wallet(getConfig().rewards, null);
    garage = new Garage(getConfig().upgrades, wallet, 1, null);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden until a preview is given, and hides again on "none"', () => {
    const prompt = new GaragePrompt();
    const el = document.getElementById('garage-prompt')!;
    expect(el.hidden).toBe(true);
    prompt.update({ type: 'buy', id: 'machinegun' }, garage);
    expect(el.hidden).toBe(false);
    prompt.update({ type: 'none' }, garage);
    expect(el.hidden).toBe(true);
  });

  it('shows the weapon icon for a weapon preview, matching its dedicated I10 icon', () => {
    const prompt = new GaragePrompt();
    const preview: InteractPreview = { type: 'buy', id: 'machinegun' };
    prompt.update(preview, garage);
    const el = document.getElementById('garage-prompt')!;
    expect(el.querySelector('.garage-prompt-icon')!.innerHTML).toContain('icon-machinegun');
    expect(el.textContent).toContain('Buy');
  });

  it('falls back to the category icon for a part with no dedicated icon', () => {
    const prompt = new GaragePrompt();
    const preview: InteractPreview = { type: 'buy', id: 'tires' };
    prompt.update(preview, garage);
    const el = document.getElementById('garage-prompt')!;
    expect(el.querySelector('.garage-prompt-icon')!.innerHTML).toContain('icon-tires');
  });

  it('clears the icon once hidden', () => {
    const prompt = new GaragePrompt();
    prompt.update({ type: 'buy', id: 'machinegun' }, garage);
    prompt.hide();
    const el = document.getElementById('garage-prompt')!;
    expect(el.hidden).toBe(true);
  });
});
