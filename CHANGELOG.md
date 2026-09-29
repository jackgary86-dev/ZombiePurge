# Changelog

Notable changes, grouped by milestone. See `README.md` for what's built and `docs/DEMO_TESTING.md`
for the manual test script for each one.

Versioning started with this entry (H4); the game's `package.json` version now tracks the
milestone in progress (`0.<milestone>.0`) rather than the placeholder `0.1.0` it shipped
with from the initial scaffold.

## 0.7.0 - M7: Car Customization & Combat Expansion (in progress)

- **L1** A `carCustomization` data model (`GameConfig.cosmetics`) separate from the tiered stat
  upgrades: one selected option per category, each independently purchasable. A new "Customize"
  tab in the Garage lists every category's options as swatch cards (buy/select/equipped states),
  built on a `Garage` extension (`buyCosmetic`/`selectCosmetic`/`ownsCosmetic`) that persists
  alongside the existing upgrade save data.
- **L2** The first category, Paint: 7 colours (one free stock colour, six purchasable at
  200-400 coins). Selecting one recolours the car body immediately - in the garage turntable and
  in live gameplay - via a new `CarDamageView.setPaintColor()` that keeps the existing I3 damage
  tinting layered correctly on top of whatever colour is currently equipped.
- **O1** Roof-mounted guns (machine gun/shotgun/rockets) now autoshoot the instant the
  auto-aim mount (D8) locks a target in range - no more holding Fire. The flamethrower is
  unchanged (camera-aimed, still needs the trigger held).
- **L3** A second Customize category, Bumper: 3 purely cosmetic front-bumper styles (stock,
  chrome, brush guard), each a genuinely different primitive shape (not just a recolour),
  rebuilt on the car via a new `syncBumperStyle()` mirroring the existing D14 upgrade-parts
  pattern. Kept close against the body so it never visually collides with an owned D12 ram.
- **L4** A third Customize category, Driver: a simple placeholder driver figure seated in the
  cabin. The cabin box is now semi-transparent (a tinted-glass look) so the figure reads as
  visible through the windshield instead of hidden inside solid geometry. 5 purchasable outfit
  colours, applied via a new `CarView.setDriverColor()`.

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
- **I1** `docs/ART_STYLE.md`: a style guide referencing the existing `docs/ART_PROMPT.md` spec,
  a per-map mood-board table, and silhouette/scale notes for the car and each zombie rank.
- **I2** Asset pipeline: the `assets/models/{category}/` folder convention, `GameConfig.assetBudget`
  (real validated config, not just docs) for per-category triangle/texture budgets, and
  `AssetLoader.loadModel()` (GLTFLoader, resolves to `null` on any failure so placeholder art
  keeps rendering until real `.glb`s land).
- **I3** Car damage-state visuals: the body tints and grows dent decals through clean → dented →
  wrecked as HP drops (`carDamage` config thresholds) - a placeholder-art extension; real
  modeled damage states still need a 3D art pass.
- **I5** Zombie rank variants + simple motion: per-instance colour jitter so a horde of one rank
  isn't visually identical, plus a procedural walk-bob and attack lunge/scale-pulse
  (`zombieMotion` config) - a placeholder-art extension; real rigged/animated models still need
  a 3D art pass.
- **I9** VFX art gaps: a muzzle flash at the weapon mount on every shot, tyre-skid decals behind
  the rear wheels while sliding, and dust/snow drive-trail puffs coloured per map's own palette.
- **J13** A real Credits screen (`CreditsScreen.ts`, its own dedicated menu icon) listing Team,
  Tools and Asset Licenses, replacing the one-line placeholder panel built inline in `main.ts`.

## 0.5.0 and earlier - M0-M5

Built without per-milestone version bumps; see `README.md`'s Milestones table and "What's
Built So Far" section for the full list. In short: the car/camera/input foundation and greybox
arena (M0); zombie AI, hordes, run-over kills and the coin economy (M1); the garage, upgrades
and every weapon (M2); Sandbox Mode's 2 km open map, menus and settings (M3); Story Mode's
save-slot system and Map 1 (M4); Story Mode Maps 2-5 with three boss fights (M5).
