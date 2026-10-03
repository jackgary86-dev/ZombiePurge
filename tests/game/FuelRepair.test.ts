import { describe, it, expect } from 'vitest';
import { DEFAULT_FUEL, FuelTank } from '../../src/game/vehicle';
import { applyRepairKit, repairInGarage, repairPrice } from '../../src/game/shop';

describe('D6 fuel tank', () => {
  it('drains faster under throttle and speed, and stops at empty', () => {
    const tank = new FuelTank(60);
    for (let i = 0; i < 60 * 10; i++) tank.update(1 / 60, 0, 0); // idling 10 s
    const idle = 60 - tank.level;
    expect(idle).toBeCloseTo(DEFAULT_FUEL.idleBurnPerSecond * 10, 3);

    const t2 = new FuelTank(60);
    for (let i = 0; i < 60 * 10; i++) t2.update(1 / 60, 1, 1); // flat out 10 s
    const flatOut = 60 - t2.level;
    expect(flatOut).toBeCloseTo(
      (DEFAULT_FUEL.idleBurnPerSecond + DEFAULT_FUEL.burnPerSecondAtFullThrottle) * 10,
      3
    );
    expect(flatOut).toBeGreaterThan(idle * 5);

    const t3 = new FuelTank(1);
    for (let i = 0; i < 60 * 60; i++) t3.update(1 / 60, 1, 1);
    expect(t3.isEmpty()).toBe(true);
    expect(t3.level).toBe(0);
  });

  it('refills up to capacity and grows with upgrades keeping the fill fraction', () => {
    const tank = new FuelTank(60);
    for (let i = 0; i < 60 * 30; i++) tank.update(1 / 60, 1, 1);
    const before = tank.level;
    expect(tank.refill(1000)).toBeCloseTo(60 - before, 5);
    expect(tank.level).toBe(60);
    tank.update(1, 1, 1);
    tank.setCapacity(120);
    expect(tank.capacity).toBe(120);
    expect(tank.fraction).toBeCloseTo((60 - 0.63) / 60, 3);
  });

  it("T4: burn() draws an exact amount directly, unlike update()'s throttle/speed burn-rate model", () => {
    const tank = new FuelTank(60);
    expect(tank.burn(10)).toBe(10);
    expect(tank.level).toBe(50);
    expect(tank.burn(-5)).toBe(0); // never adds fuel
    expect(tank.level).toBe(50);
    expect(tank.burn(1000)).toBe(50); // clamps at empty, returns only what was actually drawn
    expect(tank.level).toBe(0);
    expect(tank.isEmpty()).toBe(true);
  });

  it('fill() tops the tank off instantly, ignoring the current level', () => {
    const tank = new FuelTank(60);
    for (let i = 0; i < 60 * 10; i++) tank.update(1 / 60, 1, 1);
    expect(tank.level).toBeLessThan(60);
    tank.fill();
    expect(tank.level).toBe(60);
    expect(tank.isEmpty()).toBe(false);
  });
});

describe('D7 repair', () => {
  const coins = () => {
    let balance = 50;
    return {
      get balance() {
        return balance;
      },
      spend(n: number) {
        if (n > balance) return false;
        balance -= n;
        return true;
      },
    };
  };

  it('charges only for missing HP and refuses when short', () => {
    const car = { hp: 70 };
    expect(repairPrice(car, 100)).toBe(30);
    const c = coins();
    expect(repairInGarage(car, 100, c)).toEqual({ ok: true, price: 30, restored: 30 });
    expect(car.hp).toBe(100);
    expect(c.balance).toBe(20);
    expect(repairInGarage(car, 100, c)).toMatchObject({ ok: false, reason: 'nothing', price: 0 });
    car.hp = 10;
    expect(repairInGarage(car, 100, c)).toMatchObject({ ok: false, reason: 'coins', price: 90 });
    expect(car.hp).toBe(10);
  });

  it('repair kits restore a fixed amount up to max', () => {
    const car = { hp: 75 };
    expect(applyRepairKit(car, 100)).toBe(25);
    expect(car.hp).toBe(100);
    car.hp = 10;
    expect(applyRepairKit(car, 100)).toBe(40);
  });
});
