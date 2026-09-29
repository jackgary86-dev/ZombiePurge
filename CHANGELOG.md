# Changelog

Notable changes, grouped by milestone. See `README.md` for what's built and `docs/DEMO_TESTING.md`
for the manual test script for each one.

Versioning started with this entry (H4); the game's `package.json` version now tracks the
milestone in progress (`0.<milestone>.0`) rather than the placeholder `0.1.0` it shipped
with from the initial scaffold.

## Unreleased - K5: PR preview demos

- **K5** Every pull request now gets its own preview link, built and published by a new
  `.github/workflows/preview.yml` on every push to the PR: `npm run build` with a per-PR
  `BASE_PATH` (`/ZombiePurge/pr-<number>/`), then published into that subfolder on the
  `gh-pages` branch by the new `scripts/gh-pages-publish.sh` (also used by `deploy.yml` to
  mirror main's own build onto that branch's root, so both coexist without clobbering each
  other). A bot comment on the PR carries the link and updates in place on every push rather
  than piling up new comments; closing/merging the PR removes its subfolder
  (`scripts/gh-pages-remove.sh`).
  This only actually serves anything once the repo's GitHub Pages source is switched from
  "GitHub Actions" (the current live-demo mechanism, `actions/deploy-pages` - completely
  unaffected by any of this) to "Deploy from a branch: `gh-pages` / (root)" - a one-time
  manual step in Settings, not something this change does on its own, so the live main-branch
  demo can't be affected by anything here landing. See `README.md`'s Development section for
  that step.
  The publish/remove scripts' git logic (first-time `gh-pages` bootstrap as an orphan branch,
  a subfolder publish never touching sibling subfolders or the branch root, idempotent no-ops
  when content is unchanged, and clean removal) was exercised end-to-end against a local
  scratch repo before relying on it in CI - it caught a real bug (the root-publish case was
  `rm -rf`-ing the whole clone, `.git` included, since the target path equalled the clone root)
  that a code read alone wouldn't have caught.

## 0.7.0 - M7: Car Customization & Combat Expansion

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
- **L5** A fourth Customize category, Windows: 4 cabin-glass finishes (Stock Tint, Clear Glass,
  Dark Tint, Mirrored), each its own colour/opacity combination applied to the same cabin
  material the L4 driver figure is seen through, via a new `CarView.setWindowTint()`. The
  mirrored finish also bumps material metalness. `CosmeticOption` gained an optional `opacity`
  field (validated 0-1) for this - every other category leaves it unset.
- **L6** A fifth Customize category, Doors: 3 cosmetic door-trim styles (stock/flush, paneled
  trim, chrome trim), mirrored on both sides of the body via a new `syncDoorStyle()` following
  the same rebuild-on-change pattern as L3's bumper.
- **L7** A sixth Customize category, Decals: 5 options (None, Flames, Racing Stripes, Skull,
  Number Roundel), each a small mirrored primitive cluster on its own named part
  (`cosmetic_decal`) via a new `syncDecalStyle()`. Lives independently of the body's paint
  material (L2), so paint and a decal can always be combined freely.
- **L8** A seventh and final Customize category, Tires: 4 rim/tread looks (Stock, Chrome Rim,
  Whitewall, Off-Road Tread) via a new `syncTireStyle()`. Unlike every other category, the trim
  is added as a child of each wheel mesh itself (in the wheel's own local space) rather than the
  car body group, so it automatically follows each wheel's steer/spin transform with no extra
  per-frame sync code. Independent of the D4 tire-grip stat upgrade. Completes L1-L8.
- **M1** A new `melee` upgrade category/slot alongside the existing `weapon`/`ram` categories -
  melee weapons mount in the front slot (shared with the ram and flamethrower, so only one shows
  at a time) and deal damage on car-to-zombie contact via a new `MeleeTierStats` shape
  (`damage`/`knockback`) on `CombatConfig`, distinct from the ram's speed-scaled multiplier.
  `RunOverSystem` gained `meleeDamage`/`meleeKnockback` fields: melee damage is flat and applies
  even to a near-stationary car, and knockback sets the zombie's velocity away from the car plus
  a new `Zombie.knockbackTimeLeft` timer that makes `updateZombieAI` briefly stop overriding its
  movement, so the shove actually carries it a visible distance.
- **M2** The first melee weapon, Spike Cluster (3 tiers, config-driven damage/knockback curve). A
  spike-cluster model grows with tier once it's the equipped front weapon, via a new
  `syncMeleeWeapon()` gated on equip status (not just ownership) so it never visually overlaps an
  owned-but-unequipped ram or flamethrower. A new "Melee" Garage tab lists it like any other
  weapon category.
- **M3** The second melee weapon, Circular Saw (3 tiers, config-driven `damagePerSecond`).
  Distinct mechanic from the spike cluster's one-shot-per-contact model: `RunOverSystem` now
  tracks currently-touching zombies across Rapier collision start/stop events and a new
  `applySawDamage()` deals damage every tick contact holds, not just on the first touch. A
  `SawView` shows a spinning blade at the front whenever the saw is equipped (always spinning,
  independent of contact) via a new `AudioSystem.setSaw()` grinding loop and a spark flash
  (reusing the existing muzzle-flash view) specifically while the blade is touching something.
- **M4** The third melee weapon, Swinging Hammer (3 tiers, config-driven
  damage/knockback/radius/cooldown). A third distinct mechanic again: a new `HammerSwing` class
  needs no physical contact at all - on its own cooldown it deals damage plus a knockback shove
  to everything within `radius` of the car, reusing the same `Zombie.knockbackTimeLeft` stagger
  the spike cluster (M2) introduced. A new `HammerView` plays a one-shot swing arc (not a
  continuous loop like the saw's blade) each time it fires, and a muzzle-flash/thump plays when
  the swing actually connects.
- **M5** The roof turret (`TurretView`) now has a per-weapon `TurretKind` ('machinegun' |
  'shotgun' | 'rockets'): its barrel arrangement is rebuilt (only when the kind actually
  changes) to a single long barrel, a stubby double barrel, or a 2x2 cluster of launch tubes,
  instead of always showing the same generic silhouette regardless of which roof weapon is
  equipped. Wired into `applyGarage()` alongside the existing `turret.visible` toggle. The
  front-mounted weapons already got this treatment in M1-M4 (`FlameView`, `syncMeleeWeapon`,
  `SawView`, `HammerView`), so this closes the matching gap on the roof slot; a full
  preview-before-buying interaction (hovering an unpurchased weapon's shop card) was judged a
  separate, more open-ended UX addition and left out of this ticket's scope.
- **N1** Engine tuning: `VehicleConfig.engineTuning.swingFactor` (0.5 by default) plus a new
  `Garage.engineTuning` slider (-1..+1, 0 = balanced) that redistributes the _owned engine
  tier's own_ topSpeed/acceleration modifiers - `topSpeed * (1 + tuning * swingFactor)` and
  `acceleration * (1 - tuning * swingFactor)` - inside `totalModifiers()`, rather than adding a
  new upgrade tier ladder. A balanced slider (the default) reproduces the exact pre-N1 stats
  bit-for-bit. Free to change at any time, persists across reloads, and has no effect before the
  engine upgrade is owned. A new "Engine Tuning" slider appears in the Garage's Engine tab once
  owned; dragging it applies live (an `input` listener) without tearing down the slider mid-drag,
  and releasing it (`change`) refreshes the tier cards' own stat previews.
- **N2** Engine replacement: three new `UpgradeDef`s (`engine_v8`, `engine_turbo`,
  `engine_electric`, category `'engineType'`) occupy a new `'engine'` `WeaponSlot`, reusing the
  existing buy/equip machinery (first purchase auto-equips into the free slot; only one type is
  equipped at a time) rather than adding a second tier ladder. Each has its own
  topSpeed/acceleration/`mass` profile that stacks additively with the Engine tier ladder
  (D3/N1) rather than replacing it - `Garage.totalModifiers()`'s equip-gating (previously only
  `category === 'weapon'`) now also covers `'engineType'`, so an owned-but-unequipped type
  contributes nothing. `StatModifiers` gained `mass`; `EffectiveStats.mass` and
  `Garage.applyTo()` carry it through to `VehicleConfig.mass`. Since Rapier only reads a rigid
  body's simulated mass at the point `setAdditionalMassProperties` is called (not on every
  step), a bare config-field mutation would have been a silent no-op: `Vehicle` gained
  `setMass()` (refactored out of the constructor's own mass setup) and `applyGarage()` now calls
  `car.setMass(s.mass)`, so an engine swap's weight is actually felt in collisions/momentum
  without changing what the `acceleration` stat means (drive force still scales with mass to
  compensate, confirmed by a same-achieved-speed-regardless-of-mass test). The equipped type's
  visual cue is the exhaust (`syncEngineType`/`CarView.setEngineType`): a single small pipe with
  nothing equipped, a chrome dual pipe for V8, one wide pipe for Turbo, and no pipe at all for
  Electric.

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
  keeps rendering until real `.glb`s land). Follow-up: `getLoader()` now always wires in
  `DRACOLoader` (geometry compression) and `MeshoptDecoder` - neither needs a renderer, and
  three's own loaders resolve their decoder libraries to their own bundled URLs by default
  (`import.meta.url`-relative, which Vite turns into fingerprinted build assets with no manual
  `public/` copy - confirmed via a real `vite build`). KTX2 (Basis Universal) texture decoding
  needs to know which compressed formats the GPU supports, so it's wired in separately via the
  new `configureKTX2(renderer)`, meant to be called once at boot after the renderer exists (not
  called yet - nothing under `assets/` uses KTX2 textures in this session). None of this was
  "verified in-game" against a real compressed asset, since none exists in the repo yet; verified
  instead via `_sharedLoaderForTests()` unit tests confirming the loaders are actually attached,
  plus a real production build and a clean headless boot with the new code paths compiled in.
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
