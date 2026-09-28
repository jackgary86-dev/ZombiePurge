import type { StoryProgressData } from '../game/story/StoryProgress';

export const SAVE_VERSION = 1;
const SLOT_INDEX_KEY = 'zombiepurge.saveSlots';
const ACTIVE_SLOT_KEY = 'zombiepurge.activeSaveSlot';
const SLOT_PREFIX = 'zombiepurge.slot.';

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveSlotMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

interface SlotIndex {
  version: number;
  slots: SaveSlotMeta[];
}

interface StoryProgressSave {
  version: number;
  data: StoryProgressData;
}

interface PlayTimeSave {
  version: number;
  seconds: number;
}

function defaultStorage(): SaveStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readIndex(storage: SaveStorage): SlotIndex {
  try {
    const raw = storage.getItem(SLOT_INDEX_KEY);
    if (!raw) return { version: SAVE_VERSION, slots: [] };
    const parsed = JSON.parse(raw) as Partial<SlotIndex>;
    if (parsed.version !== SAVE_VERSION || !Array.isArray(parsed.slots)) {
      return { version: SAVE_VERSION, slots: [] };
    }
    return { version: SAVE_VERSION, slots: parsed.slots };
  } catch {
    return { version: SAVE_VERSION, slots: [] };
  }
}

function writeIndex(storage: SaveStorage, index: SlotIndex): void {
  storage.setItem(SLOT_INDEX_KEY, JSON.stringify(index));
}

function newSlotId(): string {
  return `slot-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * F3: everything Wallet/Garage/story progress read and write is namespaced under one of
 * these per save slot, so `Wallet`/`Garage` need no code changes to become slot-aware —
 * they just get a `SaveStorage` view that prefixes every key with the active slot's id.
 */
export function slotStorage(slotId: string, storage: SaveStorage | null = defaultStorage()) {
  if (!storage) return null;
  const prefix = `${SLOT_PREFIX}${slotId}.`;
  return {
    getItem: (key: string) => storage.getItem(prefix + key),
    setItem: (key: string, value: string) => storage.setItem(prefix + key, value),
    removeItem: (key: string) => storage.removeItem(prefix + key),
  };
}

/** Newest-first, matching how a save-slot picker should list them. */
export function listSaveSlots(storage: SaveStorage | null = defaultStorage()): SaveSlotMeta[] {
  if (!storage) return [];
  return [...readIndex(storage).slots].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createSaveSlot(
  name: string,
  storage: SaveStorage | null = defaultStorage()
): SaveSlotMeta {
  const now = Date.now();
  const meta: SaveSlotMeta = {
    id: newSlotId(),
    name: name.trim() || 'New Game',
    createdAt: now,
    updatedAt: now,
  };
  if (storage) {
    const index = readIndex(storage);
    index.slots.push(meta);
    writeIndex(storage, index);
  }
  return meta;
}

export function renameSaveSlot(
  id: string,
  name: string,
  storage: SaveStorage | null = defaultStorage()
): void {
  if (!storage) return;
  const index = readIndex(storage);
  const slot = index.slots.find((s) => s.id === id);
  if (!slot) return;
  slot.name = name.trim() || slot.name;
  slot.updatedAt = Date.now();
  writeIndex(storage, index);
}

/** Marks a slot as recently played (bumps it to the top of the list). */
export function touchSaveSlot(id: string, storage: SaveStorage | null = defaultStorage()): void {
  if (!storage) return;
  const index = readIndex(storage);
  const slot = index.slots.find((s) => s.id === id);
  if (!slot) return;
  slot.updatedAt = Date.now();
  writeIndex(storage, index);
}

/** Removes the slot's entry and every key namespaced under it. */
export function deleteSaveSlot(id: string, storage: SaveStorage | null = defaultStorage()): void {
  if (!storage) return;
  const index = readIndex(storage);
  writeIndex(storage, { version: SAVE_VERSION, slots: index.slots.filter((s) => s.id !== id) });
  const scoped = slotStorage(id, storage)!;
  scoped.removeItem('zombiepurge.wallet');
  scoped.removeItem('zombiepurge.garage');
  scoped.removeItem('story');
  scoped.removeItem('playTime');
  if (getActiveSaveSlotId(storage) === id) setActiveSaveSlotId(null, storage);
}

export function getActiveSaveSlotId(storage: SaveStorage | null = defaultStorage()): string | null {
  return storage?.getItem(ACTIVE_SLOT_KEY) ?? null;
}

export function setActiveSaveSlotId(
  id: string | null,
  storage: SaveStorage | null = defaultStorage()
): void {
  if (!storage) return;
  if (id) storage.setItem(ACTIVE_SLOT_KEY, id);
  else storage.removeItem(ACTIVE_SLOT_KEY);
}

export function loadStoryProgress(
  slotId: string,
  fallback: StoryProgressData,
  storage: SaveStorage | null = defaultStorage()
): StoryProgressData {
  const scoped = storage ? slotStorage(slotId, storage) : null;
  if (!scoped) return fallback;
  try {
    const raw = scoped.getItem('story');
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<StoryProgressSave>;
    if (saved.version !== SAVE_VERSION || !saved.data) return fallback;
    return {
      unlocked: Array.isArray(saved.data.unlocked) ? saved.data.unlocked : fallback.unlocked,
      completed: Array.isArray(saved.data.completed) ? saved.data.completed : fallback.completed,
    };
  } catch {
    return fallback;
  }
}

export function saveStoryProgress(
  slotId: string,
  data: StoryProgressData,
  storage: SaveStorage | null = defaultStorage()
): void {
  const scoped = storage ? slotStorage(slotId, storage) : null;
  const save: StoryProgressSave = { version: SAVE_VERSION, data };
  scoped?.setItem('story', JSON.stringify(save));
}

export function loadPlayTime(
  slotId: string,
  storage: SaveStorage | null = defaultStorage()
): number {
  const scoped = storage ? slotStorage(slotId, storage) : null;
  if (!scoped) return 0;
  try {
    const raw = scoped.getItem('playTime');
    if (!raw) return 0;
    const saved = JSON.parse(raw) as Partial<PlayTimeSave>;
    if (saved.version !== SAVE_VERSION || typeof saved.seconds !== 'number') return 0;
    return Math.max(0, saved.seconds);
  } catch {
    return 0;
  }
}

export function addPlayTime(
  slotId: string,
  seconds: number,
  storage: SaveStorage | null = defaultStorage()
): number {
  const scoped = storage ? slotStorage(slotId, storage) : null;
  const total = loadPlayTime(slotId, storage) + Math.max(0, seconds);
  const save: PlayTimeSave = { version: SAVE_VERSION, seconds: total };
  scoped?.setItem('playTime', JSON.stringify(save));
  return total;
}
