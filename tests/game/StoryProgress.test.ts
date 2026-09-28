import { describe, it, expect } from 'vitest';
import {
  completeMap,
  initialStoryProgress,
  ObjectiveTracker,
  type StoryProgressData,
} from '../../src/game/story/StoryProgress';
import type { MapObjective } from '../../src/data/types';

describe('F2 ObjectiveTracker', () => {
  it('tracks a total kill count objective', () => {
    const t = new ObjectiveTracker([{ kind: 'kills', count: 3, label: 'Kill 3 zombies' }]);
    expect(t.isComplete()).toBe(false);
    t.recordKill('walker');
    t.recordKill('runner');
    expect(t.statuses()[0]).toMatchObject({ current: 2, target: 3, done: false });
    t.recordKill('walker');
    expect(t.isComplete()).toBe(true);
    expect(t.statuses()[0]).toMatchObject({ current: 3, target: 3, done: true });
  });

  it('tracks a specific rank objective independently of other kills', () => {
    const t = new ObjectiveTracker([
      { kind: 'killRank', rank: 'brute', count: 1, label: "Kill the map's Brute" },
    ]);
    t.recordKill('walker');
    t.recordKill('walker');
    expect(t.isComplete()).toBe(false);
    t.recordKill('brute');
    expect(t.isComplete()).toBe(true);
  });

  it('completes a reachExit objective once the car gets close enough', () => {
    const t = new ObjectiveTracker([
      { kind: 'reachExit', x: 100, z: -50, label: 'Reach the exit' },
    ]);
    t.updatePosition(0, 0);
    expect(t.isComplete()).toBe(false);
    t.updatePosition(95, -48);
    expect(t.isComplete()).toBe(true);
    expect(t.exitTarget()).toEqual({ x: 100, z: -50 });
  });

  it('only completes once every objective is done', () => {
    const objectives: MapObjective[] = [
      { kind: 'kills', count: 2, label: 'Kill 2' },
      { kind: 'reachExit', x: 10, z: 10, label: 'Reach the exit' },
    ];
    const t = new ObjectiveTracker(objectives);
    t.recordKill('walker');
    t.recordKill('walker');
    expect(t.isComplete()).toBe(false); // kills done, exit not reached
    t.updatePosition(10, 10);
    expect(t.isComplete()).toBe(true);
  });

  it('a map with no objectives is never "complete"', () => {
    expect(new ObjectiveTracker([]).isComplete()).toBe(false);
  });

  it('exitTarget is null for maps without a reachExit objective', () => {
    expect(new ObjectiveTracker([{ kind: 'kills', count: 1, label: 'x' }]).exitTarget()).toBeNull();
  });
});

describe('F2/F3 story progress', () => {
  const order = ['suburbs', 'desert', 'industrial'];

  it('starts a new campaign with only the first map unlocked', () => {
    const progress = initialStoryProgress(order);
    expect(progress).toEqual({ unlocked: ['suburbs'], completed: [] });
  });

  it('completing a map unlocks the next one in story order', () => {
    let progress: StoryProgressData = initialStoryProgress(order);
    progress = completeMap(progress, 'suburbs', order);
    expect(progress.completed).toEqual(['suburbs']);
    expect(progress.unlocked).toEqual(['suburbs', 'desert']);
  });

  it('completing the same map twice does not duplicate it', () => {
    let progress: StoryProgressData = initialStoryProgress(order);
    progress = completeMap(progress, 'suburbs', order);
    progress = completeMap(progress, 'suburbs', order);
    expect(progress.completed).toEqual(['suburbs']);
    expect(progress.unlocked).toEqual(['suburbs', 'desert']);
  });

  it('completing the last map unlocks nothing further', () => {
    let progress: StoryProgressData = { unlocked: order, completed: ['suburbs', 'desert'] };
    progress = completeMap(progress, 'industrial', order);
    expect(progress.unlocked).toEqual(order);
    expect(progress.completed).toEqual(['suburbs', 'desert', 'industrial']);
  });
});
