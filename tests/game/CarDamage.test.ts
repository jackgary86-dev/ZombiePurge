import { describe, it, expect } from 'vitest';
import { Mesh, MeshStandardMaterial, BoxGeometry } from 'three';
import {
  carDamageStage,
  carDamageTint,
  carDamageDentCount,
  CarDamageView,
} from '../../src/game/art/CarDamage';
import type { CarDamageConfig, VehicleConfig } from '../../src/data/types';
import { DEFAULT_CONFIG } from '../../src/data/defaults';

const CFG: CarDamageConfig = { dentedBelowFraction: 0.66, wreckedBelowFraction: 0.33 };
const VEHICLE: VehicleConfig = DEFAULT_CONFIG.vehicle;

function bodyMesh(): Mesh {
  return new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0xc8402e }));
}

describe('carDamageStage (I3)', () => {
  it('is clean at full health', () => {
    expect(carDamageStage(1, CFG)).toBe('clean');
    expect(carDamageStage(0.67, CFG)).toBe('clean');
  });

  it('is dented once below the dented threshold', () => {
    expect(carDamageStage(0.65, CFG)).toBe('dented');
    expect(carDamageStage(0.34, CFG)).toBe('dented');
  });

  it('is wrecked once below the wrecked threshold', () => {
    expect(carDamageStage(0.32, CFG)).toBe('wrecked');
    expect(carDamageStage(0, CFG)).toBe('wrecked');
  });
});

describe('carDamageTint / carDamageDentCount (I3)', () => {
  it('worsens tint and dent count as the stage worsens', () => {
    expect(carDamageTint('clean').getHex()).toBe(0xffffff);
    expect(carDamageDentCount('clean')).toBe(0);
    expect(carDamageDentCount('dented')).toBeGreaterThan(0);
    expect(carDamageDentCount('wrecked')).toBeGreaterThan(carDamageDentCount('dented'));
  });
});

describe('CarDamageView (I3)', () => {
  it('stays clean with no dents at full health', () => {
    const view = new CarDamageView(bodyMesh(), CFG, VEHICLE);
    view.setHpFraction(1);
    expect(view.dentCount).toBe(0);
  });

  it('tints the body and adds dents once dented', () => {
    const body = bodyMesh();
    const baseHex = (body.material as MeshStandardMaterial).color.getHex();
    const view = new CarDamageView(body, CFG, VEHICLE);
    view.setHpFraction(0.5);
    expect(view.dentCount).toBe(carDamageDentCount('dented'));
    expect((body.material as MeshStandardMaterial).color.getHex()).not.toBe(baseHex);
    expect(view.group.children).toHaveLength(carDamageDentCount('dented'));
  });

  it('adds more dents once wrecked', () => {
    const view = new CarDamageView(bodyMesh(), CFG, VEHICLE);
    view.setHpFraction(0.1);
    expect(view.dentCount).toBe(carDamageDentCount('wrecked'));
  });

  it('reset() restores the original colour and clears dents', () => {
    const body = bodyMesh();
    const baseHex = (body.material as MeshStandardMaterial).color.getHex();
    const view = new CarDamageView(body, CFG, VEHICLE);
    view.setHpFraction(0.1);
    view.reset();
    expect(view.dentCount).toBe(0);
    expect(view.group.children).toHaveLength(0);
    expect((body.material as MeshStandardMaterial).color.getHex()).toBe(baseHex);
  });

  it('does nothing when the stage has not changed', () => {
    const view = new CarDamageView(bodyMesh(), CFG, VEHICLE);
    view.setHpFraction(0.5);
    const countAfterFirst = view.dentCount;
    view.setHpFraction(0.45); // still "dented"
    expect(view.dentCount).toBe(countAfterFirst);
  });
});
