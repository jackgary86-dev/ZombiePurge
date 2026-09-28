import { describe, it, expect } from 'vitest';
import { Fog, Scene } from 'three';
import {
  applyLighting,
  createHeadlights,
  createLights,
  LIGHTING,
  presetFor,
} from '../../src/game/world';

describe('I8 lighting presets', () => {
  it('has day and night presets per map and applies them to the scene', () => {
    for (const id of ['greybox', 'openfield']) {
      expect(LIGHTING[id].day.sunIntensity).toBeGreaterThan(LIGHTING[id].night.sunIntensity);
      expect(LIGHTING[id].night.fogFar).toBeLessThan(LIGHTING[id].day.fogFar); // night closes the view in
    }
    expect(presetFor('unknown-map', true)).toBe(LIGHTING.openfield.night);
    const scene = new Scene();
    const lights = createLights(scene);
    applyLighting(scene, lights, presetFor('openfield', false), 300);
    expect((scene.fog as Fog).far).toBe(300);
    expect(lights.sun.intensity).toBe(LIGHTING.openfield.day.sunIntensity);
    applyLighting(scene, lights, presetFor('openfield', true), 300);
    expect((scene.fog as Fog).far).toBeCloseTo(300 * LIGHTING.openfield.night.fogFar);
    expect(lights.sun.intensity).toBe(LIGHTING.openfield.night.sunIntensity);
  });

  it('headlights start off and take their range from the upgrade', () => {
    const h = createHeadlights(30);
    expect(h.lights).toHaveLength(2);
    expect(h.lights.every((l) => !l.visible)).toBe(true);
    h.setOn(true);
    h.setRange(90);
    expect(h.lights.every((l) => l.visible && l.distance === 90)).toBe(true);
  });
});
