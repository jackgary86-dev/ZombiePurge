import type { MapObjective, ZombieRank } from '../../data/types';

export interface ObjectiveStatus {
  objective: MapObjective;
  current: number;
  target: number;
  done: boolean;
}

/**
 * F2: tracks one map's objectives during a run — kill counts, a specific rank's
 * kill count, and reaching an exit point. Pure and deterministic so it's cheap
 * to unit test; `main.ts` feeds it kills and the car's position each frame.
 */
export class ObjectiveTracker {
  private totalKills = 0;
  private killsByRank: Partial<Record<ZombieRank, number>> = {};
  private reachedExit = false;

  constructor(private readonly objectives: MapObjective[]) {}

  recordKill(rank: ZombieRank): void {
    this.totalKills++;
    this.killsByRank[rank] = (this.killsByRank[rank] ?? 0) + 1;
  }

  /** Call every frame with the car's position; `radius` is how close counts as "reached". */
  updatePosition(carX: number, carZ: number, radius = 12): void {
    if (this.reachedExit) return;
    for (const o of this.objectives) {
      if (o.kind !== 'reachExit' || o.x === undefined || o.z === undefined) continue;
      const dx = carX - o.x;
      const dz = carZ - o.z;
      if (dx * dx + dz * dz <= radius * radius) this.reachedExit = true;
    }
  }

  /** The exit objective's position, for the minimap marker — null if this map has none. */
  exitTarget(): { x: number; z: number } | null {
    const exit = this.objectives.find((o) => o.kind === 'reachExit');
    return exit && exit.x !== undefined && exit.z !== undefined ? { x: exit.x, z: exit.z } : null;
  }

  statuses(): ObjectiveStatus[] {
    return this.objectives.map((o) => {
      if (o.kind === 'kills') {
        const target = o.count ?? 0;
        return {
          objective: o,
          current: Math.min(this.totalKills, target),
          target,
          done: this.totalKills >= target,
        };
      }
      if (o.kind === 'killRank') {
        const target = o.count ?? 0;
        const current = this.killsByRank[o.rank!] ?? 0;
        return {
          objective: o,
          current: Math.min(current, target),
          target,
          done: current >= target,
        };
      }
      return { objective: o, current: this.reachedExit ? 1 : 0, target: 1, done: this.reachedExit };
    });
  }

  isComplete(): boolean {
    return this.objectives.length > 0 && this.statuses().every((s) => s.done);
  }
}

export interface StoryProgressData {
  /** Map ids the player can select and play. */
  unlocked: string[];
  /** Map ids whose objectives have all been completed at least once. */
  completed: string[];
}

/** A fresh campaign only has the first story map (lowest `storyIndex`) unlocked. */
export function initialStoryProgress(storyMapIds: string[]): StoryProgressData {
  return { unlocked: storyMapIds.slice(0, 1), completed: [] };
}

/** Marks a map completed and unlocks the next map in story order; idempotent. */
export function completeMap(
  progress: StoryProgressData,
  mapId: string,
  storyMapIdsInOrder: string[]
): StoryProgressData {
  const completed = progress.completed.includes(mapId)
    ? progress.completed
    : [...progress.completed, mapId];
  const index = storyMapIdsInOrder.indexOf(mapId);
  const next = index >= 0 ? storyMapIdsInOrder[index + 1] : undefined;
  const unlocked =
    next && !progress.unlocked.includes(next) ? [...progress.unlocked, next] : progress.unlocked;
  return { unlocked, completed };
}
