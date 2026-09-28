# Changelog

Notable changes, grouped by milestone. See `README.md` for what's built and `docs/DEMO_TESTING.md`
for the manual test script for each one.

Versioning started with this entry (H4); the game's `package.json` version now tracks the
milestone in progress (`0.<milestone>.0`) rather than the placeholder `0.1.0` it shipped
with from the initial scaffold.

## 0.6.0 - M6: Polish & Release (in progress)

- **G1** Real graphical HUD (speed, HP/fuel/nitro bars, weapon ammo/heat, coins/kills/combo,
  objectives), replacing the old text-only debug readout.
- **G2** Hit feedback: camera shake from damage/kills, a genuine slow-motion beat on a
  multi-kill (`GameLoop.setTimeScale`, not just a visual trick), and blood decals on the car
  (skippable with Low Gore).
- **G3** Procedural placeholder audio (Web Audio, no asset pipeline yet): engine pitch, tire
  skids, impact thumps, per-weapon tones, distance-falloff zombie groans, a per-map ambient
  drone, and menu click/hover sounds.
- **H1** Performance budget: a config-driven `performance.zombieBudget` (200) replaces a
  hardcoded pool size; fixed a per-tick array-allocation regression in the G3 zombie-groan
  gather; the HUD's debug readout now also shows the live zombie count next to fps.
- **H3** Unit test coverage pass: installed `@vitest/coverage-v8`, used real coverage numbers
  to target gaps in config validation, save/load edge cases, and wallet/garage reset paths;
  found and fixed a latent crash in map validation when a zombie rank config was missing.
- **H4** This changelog, an embedded app version in the build tag, and vendor code (three,
  Rapier) split into their own build chunks so they cache across releases instead of
  re-downloading with every small change.

## 0.5.0 and earlier - M0-M5

Built without per-milestone version bumps; see `README.md`'s Milestones table and "What's
Built So Far" section for the full list. In short: the car/camera/input foundation and greybox
arena (M0); zombie AI, hordes, run-over kills and the coin economy (M1); the garage, upgrades
and every weapon (M2); Sandbox Mode's 2 km open map, menus and settings (M3); Story Mode's
save-slot system and Map 1 (M4); Story Mode Maps 2-5 with three boss fights (M5).
