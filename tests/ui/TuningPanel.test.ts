import { describe, it, expect, afterEach } from 'vitest';
import { bind, TuningPanel } from '../../src/ui/TuningPanel';

describe('TuningPanel (K3)', () => {
  let panel: TuningPanel | null = null;
  afterEach(() => panel?.dispose());

  it('renders a slider per binding and writes changes back to the live object', () => {
    const vehicle = { topSpeed: 50, mass: 1500 };
    const target = new EventTarget();
    panel = new TuningPanel(
      [
        bind('vehicle.topSpeed', vehicle, 'topSpeed', 10, 100),
        bind('vehicle.mass', vehicle, 'mass', 500, 3000, 50),
      ],
      { target }
    );
    const sliders = panel.el.querySelectorAll<HTMLInputElement>('input[type=range]');
    expect(sliders).toHaveLength(2);
    sliders[0].value = '80';
    sliders[0].dispatchEvent(new Event('input'));
    expect(vehicle.topSpeed).toBe(80);
    expect(panel.el.textContent).toContain('80.0');
  });

  it('toggles with F1 and refreshes values when shown', () => {
    const cfg = { grip: 0.9 };
    const target = new EventTarget();
    panel = new TuningPanel([bind('tires.grip', cfg, 'grip', 0, 2, 0.01)], { target });
    expect(panel.visible).toBe(false);
    cfg.grip = 1.4;
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'F1' }));
    expect(panel.visible).toBe(true);
    expect(panel.el.querySelector<HTMLInputElement>('input')!.value).toBe('1.4');
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'F1' }));
    expect(panel.visible).toBe(false);
  });

  it('exports nested JSON that mirrors the config layout', () => {
    const vehicle = { topSpeed: 55, steering: { maxAngle: 0.6 } };
    const zombies = { walker: { speed: 1.5 } };
    panel = new TuningPanel(
      [
        bind('vehicle.topSpeed', vehicle, 'topSpeed', 0, 100),
        bind('vehicle.steering.maxAngle', vehicle.steering, 'maxAngle', 0, 1),
        bind('zombies.walker.speed', zombies.walker, 'speed', 0, 10),
      ],
      { target: new EventTarget() }
    );
    expect(JSON.parse(panel.exportJson())).toEqual({
      vehicle: { topSpeed: 55, steering: { maxAngle: 0.6 } },
      zombies: { walker: { speed: 1.5 } },
    });
  });
});
