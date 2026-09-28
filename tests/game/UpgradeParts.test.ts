import { describe, it, expect, beforeEach } from 'vitest';
import { Group } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import { PART_NAMES, syncUpgradeParts } from '../../src/game/art';
import { Wallet } from '../../src/game/economy';
import { Garage } from '../../src/game/shop';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('D14 upgrades visible on the car', () => {
  let garage: Garage;
  let car: Group;

  beforeEach(() => {
    resetConfig();
    const wallet = new Wallet(getConfig().rewards, new MemoryStorage());
    wallet.add(100000);
    garage = new Garage(getConfig().upgrades, wallet, 5, new MemoryStorage());
    car = new Group();
  });

  it('a stock car carries no parts', () => {
    syncUpgradeParts(car, garage, getConfig().vehicle);
    for (const name of Object.values(PART_NAMES)) expect(car.getObjectByName(name)).toBeUndefined();
  });

  it('attaches a part per owned upgrade and grows it with the tier', () => {
    garage.buy('armor');
    garage.buy('ram');
    garage.buy('fuel');
    syncUpgradeParts(car, garage, getConfig().vehicle);
    expect(car.getObjectByName(PART_NAMES.armor)!.children).toHaveLength(2); // side plates
    expect(car.getObjectByName(PART_NAMES.ram)!.children).toHaveLength(1); // bumper bar
    expect(car.getObjectByName(PART_NAMES.fuel)!.children).toHaveLength(1);
    expect(car.getObjectByName(PART_NAMES.nitro)).toBeUndefined();

    garage.buy('armor');
    garage.buy('armor');
    garage.buy('ram');
    garage.buy('ram');
    garage.buy('fuel');
    garage.buy('fuel');
    garage.buy('nitro');
    garage.buy('nitro');
    garage.buy('radar');
    garage.buy('headlights');
    syncUpgradeParts(car, garage, getConfig().vehicle);
    expect(car.getObjectByName(PART_NAMES.armor)!.children).toHaveLength(4); // + front and rear
    expect(car.getObjectByName(PART_NAMES.ram)!.children.length).toBeGreaterThan(5); // spikes + blade
    expect(car.getObjectByName(PART_NAMES.fuel)!.children).toHaveLength(2); // twin drums
    expect(car.getObjectByName(PART_NAMES.nitro)!.children).toHaveLength(2);
    expect(car.getObjectByName(PART_NAMES.radar)).toBeDefined();
    expect(car.getObjectByName(PART_NAMES.headlights)).toBeDefined();
  });

  it('rebuilding never duplicates parts', () => {
    garage.buy('armor');
    syncUpgradeParts(car, garage, getConfig().vehicle);
    syncUpgradeParts(car, garage, getConfig().vehicle);
    expect(car.children.filter((c) => c.name === PART_NAMES.armor)).toHaveLength(1);
  });
});
