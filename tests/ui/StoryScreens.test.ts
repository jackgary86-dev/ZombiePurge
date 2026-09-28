import { describe, it, expect, afterEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/data/config';
import {
  createMapCompleteScreen,
  createSaveSlotsScreen,
  createStoryMapSelect,
  type SaveSlotSummary,
  type StoryMapEntry,
} from '../../src/ui/screens';

describe('J3 save slot screen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const slot = (id: string, name: string): SaveSlotSummary => ({
    id,
    name,
    mapName: 'Map 1: Suburbs',
    coins: 120,
    playTimeSeconds: 95,
  });

  it('lists every slot with its map, coins and play time', () => {
    const screen = createSaveSlotsScreen({
      getSlots: () => [slot('a', 'Alice')],
      onNewGame: () => undefined,
      onSelect: () => undefined,
      onDelete: () => undefined,
      onBack: () => undefined,
    });
    screen.onEnter!();
    expect(screen.el.textContent).toContain('Alice');
    expect(screen.el.textContent).toContain('Map 1: Suburbs');
    expect(screen.el.textContent).toContain('120 coins');
    expect(screen.el.textContent).toContain('1:35');
  });

  it('New Game and Play call the right actions', () => {
    let newGames = 0;
    let selected: string | null = null;
    const screen = createSaveSlotsScreen({
      getSlots: () => [slot('a', 'Alice')],
      onNewGame: () => newGames++,
      onSelect: (id) => (selected = id),
      onDelete: () => undefined,
      onBack: () => undefined,
    });
    screen.onEnter!();
    screen.el.querySelector<HTMLButtonElement>('.save-slot-row button.primary')!.click();
    expect(selected).toBe('a');
    [...screen.el.querySelectorAll('button')].find((b) => b.textContent === '+ New Game')!.click();
    expect(newGames).toBe(1);
  });

  it('deleting requires a second click to confirm', () => {
    let deleted: string | null = null;
    const screen = createSaveSlotsScreen({
      getSlots: () => [slot('a', 'Alice')],
      onNewGame: () => undefined,
      onSelect: () => undefined,
      onDelete: (id) => (deleted = id),
      onBack: () => undefined,
    });
    screen.onEnter!();
    const del = [...screen.el.querySelectorAll('button')].find((b) => b.textContent === 'Delete')!;
    del.click();
    expect(deleted).toBeNull();
    expect(del.textContent).toBe('Confirm delete?');
    del.click();
    expect(deleted).toBe('a');
  });

  it('re-entering the screen disarms a pending delete', () => {
    const screen = createSaveSlotsScreen({
      getSlots: () => [slot('a', 'Alice')],
      onNewGame: () => undefined,
      onSelect: () => undefined,
      onDelete: () => undefined,
      onBack: () => undefined,
    });
    screen.onEnter!();
    const findDelete = () =>
      [...screen.el.querySelectorAll('button')].find(
        (b) => b.textContent === 'Delete' || b.textContent === 'Confirm delete?'
      )!;
    const del = findDelete();
    del.click();
    expect(del.textContent).toBe('Confirm delete?');
    screen.onEnter!();
    expect(findDelete().textContent).toBe('Delete');
  });

  it('shows an empty-state message with no slots', () => {
    const screen = createSaveSlotsScreen({
      getSlots: () => [],
      onNewGame: () => undefined,
      onSelect: () => undefined,
      onDelete: () => undefined,
      onBack: () => undefined,
    });
    screen.onEnter!();
    expect(screen.el.textContent).toContain('No saves yet');
  });
});

describe('J5 story map select', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows lock/unlock/complete state and only lets you play unlocked maps', () => {
    resetConfig();
    const suburbs = getConfig().maps.find((m) => m.id === 'suburbs')!;
    const entries: StoryMapEntry[] = [{ map: suburbs, unlocked: true, completed: false }];
    let played: string | null = null;
    const screen = createStoryMapSelect({
      getEntries: () => entries,
      onPlay: (id) => (played = id),
      onBack: () => undefined,
    });
    screen.onEnter!();
    expect(screen.el.textContent).toContain('Map 1: Suburbs');
    expect(screen.el.textContent).toContain('Walker, Runner');
    expect(screen.el.textContent).toContain('Clear 10 zombies from the neighborhood');
    const play = screen.el.querySelector<HTMLButtonElement>('[data-map="suburbs"] button')!;
    expect(play.disabled).toBe(false);
    play.click();
    expect(played).toBe('suburbs');
  });

  it('disables Play for a locked map', () => {
    resetConfig();
    const suburbs = getConfig().maps.find((m) => m.id === 'suburbs')!;
    const screen = createStoryMapSelect({
      getEntries: () => [{ map: suburbs, unlocked: false, completed: false }],
      onPlay: () => undefined,
      onBack: () => undefined,
    });
    screen.onEnter!();
    const play = screen.el.querySelector<HTMLButtonElement>('[data-map="suburbs"] button')!;
    expect(play.disabled).toBe(true);
    expect(screen.el.textContent).toContain('Locked');
  });

  it('offers Replay once a map is completed', () => {
    resetConfig();
    const suburbs = getConfig().maps.find((m) => m.id === 'suburbs')!;
    const screen = createStoryMapSelect({
      getEntries: () => [{ map: suburbs, unlocked: true, completed: true }],
      onPlay: () => undefined,
      onBack: () => undefined,
    });
    screen.onEnter!();
    expect(screen.el.querySelector('.story-map-card')!.className).toContain('completed');
    expect(screen.el.textContent).toContain('Replay');
  });
});

describe('J9 map complete screen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const summary = {
    killsByRank: { walker: 5, runner: 2, spitter: 0, brute: 0, tank: 0, iceZombie: 0, boss: 0 },
    totalKills: 7,
    distanceMeters: 900,
    coinsFromKills: 20,
    coinsFromDistance: 3,
    coinsTotal: 23,
    durationSeconds: 60,
  };

  it('shows the run stats and the next map with newly unlocked upgrades', () => {
    resetConfig();
    const maps = getConfig().maps;
    let continued = 0;
    const { screen, show } = createMapCompleteScreen({ onContinue: () => continued++ });
    show({
      completedMap: maps.find((m) => m.id === 'suburbs')!,
      nextMap: maps.find((m) => m.id === 'greybox')!,
      newlyUnlocked: ['Shotgun', 'Armor II'],
      summary,
    });
    expect(screen.el.textContent).toContain('SUBURBS');
    expect(screen.el.textContent).toContain('7 kills');
    expect(screen.el.textContent).toContain('0.90 km');
    expect(screen.el.textContent).toContain('Next: Greybox Test Map');
    expect(screen.el.textContent).toContain('Shotgun, Armor II');
    screen.el.querySelector('button')!.click();
    expect(continued).toBe(1);
  });

  it('shows a final message and blocks Esc when there is no next map', () => {
    resetConfig();
    const suburbs = getConfig().maps.find((m) => m.id === 'suburbs')!;
    const { screen, show } = createMapCompleteScreen({ onContinue: () => undefined });
    show({ completedMap: suburbs, nextMap: null, newlyUnlocked: [], summary });
    expect(screen.el.textContent).toContain('last map');
    expect(screen.el.querySelector('button')!.textContent).toBe('Back to World Map');
    expect(screen.onBack!()).toBe(false);
  });
});
