import { describe, it, expect, beforeEach } from 'vitest';
import {
  addPlayTime,
  createSaveSlot,
  deleteSaveSlot,
  getActiveSaveSlotId,
  listSaveSlots,
  loadPlayTime,
  loadStoryProgress,
  renameSaveSlot,
  saveStoryProgress,
  setActiveSaveSlotId,
  slotStorage,
  touchSaveSlot,
  type SaveStorage,
} from '../../src/data/save';

class MemoryStorage implements SaveStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

describe('F3 save slots', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('creates slots and lists them newest-first', async () => {
    const a = createSaveSlot('Alice', storage);
    await new Promise((r) => setTimeout(r, 2));
    const b = createSaveSlot('Bob', storage);
    expect(listSaveSlots(storage).map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it('defaults an empty name to "New Game"', () => {
    const slot = createSaveSlot('   ', storage);
    expect(slot.name).toBe('New Game');
  });

  it('renames a slot', () => {
    const slot = createSaveSlot('Alice', storage);
    renameSaveSlot(slot.id, 'Alicia', storage);
    expect(listSaveSlots(storage)[0].name).toBe('Alicia');
  });

  it('touching a slot bumps it to the top of the list', async () => {
    const a = createSaveSlot('A', storage);
    await new Promise((r) => setTimeout(r, 2));
    const b = createSaveSlot('B', storage);
    expect(listSaveSlots(storage)[0].id).toBe(b.id);
    await new Promise((r) => setTimeout(r, 2));
    touchSaveSlot(a.id, storage);
    expect(listSaveSlots(storage)[0].id).toBe(a.id);
  });

  it('tracks the active slot id', () => {
    expect(getActiveSaveSlotId(storage)).toBeNull();
    setActiveSaveSlotId('slot-1', storage);
    expect(getActiveSaveSlotId(storage)).toBe('slot-1');
    setActiveSaveSlotId(null, storage);
    expect(getActiveSaveSlotId(storage)).toBeNull();
  });

  it('namespaces storage per slot so the same key never collides between slots', () => {
    const a = slotStorage('slot-a', storage)!;
    const b = slotStorage('slot-b', storage)!;
    a.setItem('zombiepurge.wallet', '{"coins":100}');
    b.setItem('zombiepurge.wallet', '{"coins":5}');
    expect(a.getItem('zombiepurge.wallet')).toBe('{"coins":100}');
    expect(b.getItem('zombiepurge.wallet')).toBe('{"coins":5}');
  });

  it('deleting a slot removes its index entry and its namespaced data', () => {
    const slot = createSaveSlot('Alice', storage);
    const scoped = slotStorage(slot.id, storage)!;
    scoped.setItem('zombiepurge.wallet', '{"coins":50}');
    setActiveSaveSlotId(slot.id, storage);
    deleteSaveSlot(slot.id, storage);
    expect(listSaveSlots(storage)).toHaveLength(0);
    expect(scoped.getItem('zombiepurge.wallet')).toBeNull();
    expect(getActiveSaveSlotId(storage)).toBeNull();
  });

  it('deleting one slot never touches another slot', () => {
    const a = createSaveSlot('A', storage);
    const b = createSaveSlot('B', storage);
    slotStorage(b.id, storage)!.setItem('zombiepurge.wallet', '{"coins":9}');
    deleteSaveSlot(a.id, storage);
    expect(listSaveSlots(storage).map((s) => s.id)).toEqual([b.id]);
    expect(slotStorage(b.id, storage)!.getItem('zombiepurge.wallet')).toBe('{"coins":9}');
  });

  it('round-trips story progress and falls back on a version mismatch or missing data', () => {
    const slot = createSaveSlot('Alice', storage);
    const fallback = { unlocked: ['suburbs'], completed: [] };
    expect(loadStoryProgress(slot.id, fallback, storage)).toEqual(fallback);
    saveStoryProgress(
      slot.id,
      { unlocked: ['suburbs', 'desert'], completed: ['suburbs'] },
      storage
    );
    expect(loadStoryProgress(slot.id, fallback, storage)).toEqual({
      unlocked: ['suburbs', 'desert'],
      completed: ['suburbs'],
    });
    // Corrupt the raw value directly; loading should fall back rather than throw.
    slotStorage(slot.id, storage)!.setItem('story', '{not json');
    expect(loadStoryProgress(slot.id, fallback, storage)).toEqual(fallback);
  });

  it('accumulates play time per slot', () => {
    const slot = createSaveSlot('Alice', storage);
    expect(loadPlayTime(slot.id, storage)).toBe(0);
    addPlayTime(slot.id, 30, storage);
    addPlayTime(slot.id, 45.5, storage);
    expect(loadPlayTime(slot.id, storage)).toBeCloseTo(75.5);
  });

  it('a missing storage backend (no localStorage) degrades to a no-op, not a crash', () => {
    expect(() => createSaveSlot('x', null)).not.toThrow();
    expect(listSaveSlots(null)).toEqual([]);
    expect(loadStoryProgress('anything', { unlocked: [], completed: [] }, null)).toEqual({
      unlocked: [],
      completed: [],
    });
  });
});
