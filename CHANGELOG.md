# Changelog

Notable changes, grouped by milestone. See `README.md` for what's built and `docs/DEMO_TESTING.md`
for the manual test script for each one.

Versioning started with this entry (H4); the game's `package.json` version now tracks the
milestone in progress (`0.<milestone>.0`) rather than the placeholder `0.1.0` it shipped
with from the initial scaffold.

## Unreleased - T6: Bug bash - Physical Garage (R1/R2) systems

- **T6** Fixed walking in the Garage silently mutating the GarageMenu overlay underneath it: the
  overlay is always open while the avatar walks around (not a sequential mode), and its own
  arrow-key handling (nudging a focused range input, cycling focus) listens on the very same
  window keydown events the avatar reads for movement - so every WASD/arrow press could also
  drag whatever menu control currently had DOM focus, most harmfully the N1 Engine Tuning
  slider (auto-focused the instant the Garage opens). A capture-phase keydown listener now
  blurs any focused GarageMenu control the moment a movement-bound key is pressed, before the
  menu's own (bubble-phase) handler can act on that same keydown - closing the race for the
  very first keypress of a walk, not just repeats, without touching the menu's own keyboard
  accessibility when the player has deliberately tabbed into a control and isn't walking.
- Systematically exercised the rest of the ticket's edge cases (avatar movement clamping into
  every wall/corner, camera behaviour at extreme facing/speed, walk-up shopping at zero/
  insufficient coins, E-mashing a station, carrying a part into a wall, repeated drop/re-pick-up)
  via a background research pass plus direct code verification; no other reproducible bug turned
  up. The room is a plain axis-aligned rectangle with independently-clamped x/z bounds (correct
  for all four walls/corners), the camera's facing only updates from a finite, pre-normalized
  vector, `interact()` is edge-triggered and synchronous (no E-mash race is possible in a
  single-threaded frame loop), and the carried-part marker is parented to the avatar's own
  already-clamped transform (can't visually escape the room).

## Unreleased - T5: Bug bash - UI & menu navigation

- **T5** Fixed a GameState desync: entering the Garage from the Main Menu (`push`) and then
  backing out (Escape/gamepad B) correctly popped the menu stack back to the Main Menu panel,
  but nothing restored `GameState` away from `GameState.Garage` - the per-frame Garage state
  handler kept running underneath the visible Main Menu (the walk-up avatar kept taking input,
  including `interact`, and the camera stayed glued to the garage follow-cam instead of the Main
  Menu's turntable). `garageScreen` now has an `onBack` that restores `GameState.MainMenu` when
  the pop will actually succeed, and vetoes the back action (matching every other root screen's
  existing behaviour) when Garage is the stack's root, so state is never set without the
  corresponding screen transition actually completing.
- Fixed a key-rebinding bug: clicking a different "press a key…" button while one was already
  waiting for a keypress left the first listener attached too. The next keypress fired both, in
  order - the first set the new action's binding, and the second then re-read the (already
  updated) bindings and stripped that same key right back out of the first action, silently
  leaving it with **no** key bound at all, with no conflict warning. `SettingsMenu` now cancels
  any pending rebind before starting a new one.
- Fixed a keyboard/gamepad navigation gap: a focused `<select>` (Settings' graphics quality,
  Sandbox's map picker) was unreachable by keyboard or gamepad - Left/Right fell through to
  moving focus to the next control instead of changing the selection, and a synthetic click from
  Enter/A doesn't open a native dropdown in real browsers. `MenuStack`'s Left/Right now steps a
  focused `<select>`'s value directly, the same shape sliders already used.
- Reviewed, not changed: the save-slot screen has no rename control wired up anywhere in the UI
  (`renameSaveSlot` in `save.ts` has no caller) - a missing feature rather than a regression, and
  out of scope for a bug-fix pass. The Controls reference screen is a static table rather than
  reflecting live rebinds, which may be intentional ("basic tips", not a live reference). A
  window resize mid-menu-transition was checked and found no reproducible bug - menu layout uses
  flex/vw/vh, not cached pixel positions.

## Unreleased - T4: Bug bash - weapon systems

- **T4** Fixed the flamethrower over-draining fuel by 5%: it drew litres from the tank by
  simulating them through `FuelTank.update()`'s throttle/speed burn-rate model (`tank.update(
litres / 0.6, 1, 1)`, on the assumption that full-throttle burn was exactly 0.6 L/s) - but
  `update()`'s burn rate also always adds a flat idle-burn term on top, so a full-throttle "second"
  there actually burns 0.63 L/s, not 0.6. `FuelTank` gained a `burn(litres)` method that draws an
  exact amount directly (mirroring the existing `refill()`), and the flamethrower now calls that
  instead of simulating a fake driving second.
- Systematically exercised the rest of the ticket's edge cases (machine gun heat/overheat
  boundary, shotgun magazine/reload timing, rocket splash falloff, melee weapons, ammo/fuel/heat
  running out mid-action, auto-aim at extreme ranges) via a background research pass plus direct
  code verification; no other reproducible player-facing bug turned up. One debug-console-only
  issue was found and written up rather than fixed in this pass: the `unlockall` cheat command
  unconditionally force-equips the machine gun (`Garage.unlockAll()`), so firing it while the
  rocket launcher has rockets mid-flight silently discards those rockets with no explosion -
  not reachable through any normal-play path (no other action changes the equipped weapon while
  actively in a run), and correctly fixing it means threading a new `explodeAll()` path through
  the same reward/visual pipeline `rockets.update()`'s normal blasts use, which was judged too
  large a reach for this pass given it has zero impact on real players. Splash damage's floor at
  40% of base damage at the edge of its radius (rather than falling to 0) was reviewed and looks
  like a deliberate design choice (keeps splash weapons impactful at the edge of their radius),
  not a bug - left unchanged.

## Unreleased - T3: Bug bash - economy & save system

- **T3** Fixed a NaN-corruption bug in `Wallet`: `add()`/`spend()` both guarded against negative
  amounts but not against `NaN`/`Infinity`, which fail every `<`/`<=`/`>` comparison. A single
  `add(NaN)` permanently corrupted the balance to `NaN`; once that happened, every future
  `spend()`'s own `amount > this.coins` check was also always `false`, silently bypassing every
  price check from then on (any purchase would "succeed" regardless of price). Both methods now
  reject non-finite amounts outright via `Number.isFinite()`.
- Fixed five unguarded `localStorage.setItem()` calls that could throw uncaught (storage quota
  exceeded, or Safari private browsing rejects every write) and crash whatever gameplay action
  triggered them: `Wallet.save()`, `Garage.save()`, and `save.ts`'s `writeIndex()`/
  `saveStoryProgress()`/`addPlayTime()`. Every load-side `JSON.parse` already had this same
  try/catch protection; the write side didn't. All five now degrade to "not persisted this time"
  rather than throwing - the in-memory state the caller just updated (a purchase, a coin pickup,
  story progress) stays correct for the rest of the session either way.
- Verified, no bug found: mid-run save-slot switching isn't reachable (the slot picker is only
  reachable from the main menu, which requires leaving gameplay first, and each story slot gets
  its own fresh `Wallet`/`Garage` instance rather than mutating shared state). Sandbox's
  infinite-money flag, Slaughtermode's `died`-flag coin banking, and Story mode's normal banking
  are mutually exclusive code paths with no overlap - no double-banking or leaked infinite money
  found. Version-mismatch handling (`WALLET_VERSION`/`GARAGE_VERSION`/`SAVE_VERSION`) is a
  consistent "wipe to defaults" everywhere rather than a migration, which is an existing,
  deliberate, uniform design choice, not a bug.

## Unreleased - T2: Bug bash - zombie AI & spawner

- **T2** Fixed a horde-spawner bug: cluster members were placed at an unclamped random offset
  from their (validated) cluster centre, with no re-check against the zone that validated the
  centre. Harmless slack on a wide zone (the offset is tiny next to the zone radius), but on a
  zone as narrow as Slaughtermode's own road-width spawn zones (`spawnZones` radius == the
  `spawnerTuning.clusterRadius` override, both 6 m, matching the drivable strip's exact
  half-width) a meaningful fraction of cluster members landed inside or beyond the flanking
  walls - contradicting the map's own stated design intent ("every spawn attempt lands on the
  drivable strip, never off in the dead space beyond the walls"). `pickSpawnPoint()` now also
  returns which zone (if any) validated the centre, and each cluster member is pulled back onto
  that zone's edge if its offset would otherwise escape it. Added a regression test mirroring
  Slaughtermode's own radius/clusterRadius numbers, confirmed to fail without the fix (a member
  landing ~10 m from a 6 m-radius zone centre) and pass with it.
- Systematically exercised the rest of the ticket's edge cases (state-machine stuck states,
  detection-range/hearing logic at density extremes, the Slaughtermode `spawnerTuning` override
  leaking onto other maps) by reading `ZombieAI.ts`'s full state machine and the spawner's
  density/zone math; no other reproducible bug turned up. `alerted` always times out to `chase`
  unconditionally, and `chase`/`attack` both re-check distance every tick and fall back
  accordingly, so a zombie can't get stuck alerted forever or attacking empty air. A "dead"
  corpse keeps a live physics body for its `deathLinger` window (so the car can still nudge it)
  but all damage/knockback paths already gate on `isAlive()` - verified as intentional ragdoll
  behaviour, not a bug. Verified via a headless driving pass across Sandbox, Suburbs (Story),
  and Slaughtermode.

## Unreleased - T1: Bug bash - vehicle physics & handling

- **T1** Fixed a flip-reset softlock: the P1 stability assist gives up correcting tilt past
  `stability.maxCorrectedAngle` (60° by default), but the manual flip-reset (R) only fired once
  the car was fully upside down (past 90°). A hard hit or an odd-angle ramp landing that tipped
  the car onto its side - well past where the assist could right it, but short of 90° - left the
  player stuck: not upright enough to drive, not "upside down" enough for the reset button to
  do anything. `Vehicle` gained `needsFlipReset()`, which fires once tilt passes the assist's
  own giving-up point rather than requiring a full flip, so the reset is available exactly when
  the car can no longer recover on its own. Added a regression test (`tests/game/Vehicle.test.ts`)
  driving the real Rapier simulation to a 75° side-rest and confirming the old `isUpsideDown()`
  gate would have stayed closed there while the new one opens.
- Systematically exercised the rest of the ticket's edge cases (extreme speed with nitro +
  top-tier engine stacked, multi-body car/zombie-horde collisions, P1 interacting with jump
  ramps and hard ram-speed impacts, N1/N2 engine tuning/type swaps) against the real physics
  simulation and the existing `RunOverSystem`/`Nitro`/`Vehicle` test coverage; no other
  reproducible bug turned up. Engine-type swaps are only ever applied via `applyGarage()` at
  Garage-state boundaries (entering the garage, starting a run), so "mid-run" swapping isn't
  actually reachable, matching the ticket's own "(if reachable)" caveat.

## Unreleased - S7: Art pass - UI icon & font consistency

- **S7** Filled in every remaining generic/placeholder icon gap found across the UI, expanding
  I10's icon set from 28 to 32 icons (`restart`, `clock`, `volume`, `camera`). The walk-up
  Garage part station prompt (R2's `GaragePrompt`) now shows the part's own I10 category/weapon
  icon next to the key-cap - it previously had no icon at all. The Pause menu's six buttons
  (Resume, Restart run, Settings, Controls, Return to Garage, Quit to Main Menu) now carry the
  same icons their Main Menu equivalents already used, via a new shared `iconMenuButton()`
  helper (`MenuStack.ts`). The Settings screen's main rows (graphics quality, draw distance, the
  three volume sliders, camera sensitivity/invert, low gore, show fps) and its "Controls"
  section heading are now icon-led too, through a new optional icon parameter on
  `labelledRow()`. The Credits screen's three sections (Team, Tools, Asset Licenses) each get a
  heading icon. The Results screen's per-rank kill breakdown rows and its Time row - previously
  falling through to plain text since they weren't in the old hardcoded row-name lookup table -
  now get the `kill`/`clock` icons every other row already had, via a small refactor that
  attaches each row's icon at the point it's built instead of matching it back out of the row's
  own generated label text.

## Unreleased - S6: Art pass - lighting & post-processing

- **S6** A light post-processing pass (`PostFX.ts`: bloom via `UnrealBloomPass`, plus a subtle
  vignette/colour-grade `ShaderPass`) layered on top of the existing per-map day/night lighting
  presets (I8). New `postFx` config block (`bloomStrength`, `bloomRadius`, `bloomThreshold`,
  `vignetteDarkness`, `vignetteOffset`), validated the same way as every other tunable. Gated
  entirely off on 'low' graphics quality (alongside shadows, which already followed the same
  rule) - at 'low' the render loop calls the plain `renderer.render()` it always has, with zero
  composited-pipeline overhead, so that setting still means today's exact look. Toggling
  graphics quality mid-run (Settings, no restart) flips the composited pipeline on/off
  immediately via the existing `applySettings()`/`settings.onChange()` wiring already used for
  shadows and pixel ratio. Verified in-game across both a night preset (bloom visibly glowing
  around the headlights) and a day preset (the vignette darkening toward the frame edges),
  each confirmed at both 'low' (no effect, matching the pre-S6 look) and 'high' (effect visibly
  active) quality.

## Unreleased - S5: Art pass - VFX polish

- **S5** More visual punch for the existing particle/VFX systems - purely visual, no gameplay
  value (damage, timing windows, hit detection) touched anywhere, confirmed by the existing
  balance/combat test suites passing unmodified. Muzzle flash: a new secondary expanding ring
  rides alongside the existing flash sphere (`MuzzleFlashView.ring`, both now in a `.group`),
  and the flash's own fade curve is sharper (peaks brighter, drops off faster) so a shot reads
  as a punchy pop instead of a soft glow. Rocket explosions: a new ground-hugging shockwave ring
  (`RocketViews.shockwaves`) races out ahead of the existing blast sphere and fades faster, on
  top of the sphere's own unchanged expansion/fade. Flamethrower: a brighter, narrower inner
  "hot core" cone rides inside the existing outer flame cone (`FlameView.core`, both now in a
  `.group`), and both now pulse in scale each frame on top of the existing rotation jitter, for
  more flicker. Skid marks, dust/snow drive-trail puffs, and blood splatters: per-instance random
  size/colour/rotation jitter (skid marks vary in tint and width; drive-trail puffs get a random
  offset, size, and an ease-out "poof" growth curve instead of linear; blood splatters vary in
  size and aspect ratio) so a build-up of any of them reads as organic rather than a grid of
  identical stamped decals.

## Unreleased - S4: Art pass - per-map environment props

- **S4** Gave each story map's placeholder kit-piece props more theme-appropriate detail, on top
  of the shared `KitDecorator` hook (`PlaceholderMapKit.ts`, already used by Quarantine Lab's
  glowing pods) that runs once per piece after its base box mesh is added - purely visual,
  since `buildKitColliders` never calls it and only ever reads a piece's own `halfExtents`.
  Desert Highway: gas stations get a roof overhang and a signage pole, pumps get a nozzle, and
  cacti get two side arms for a saguaro silhouette. Industrial City: warehouses get a roof cap
  and a vent, crates get a banding strap, and gates get a warning lamp. Frozen Forest: every
  boulder gets a snow cap. Suburbs (already had house roofs and a fountain from before this
  ticket) additionally gets a cabin bump on parked cars. Quarantine Lab and the intentionally
  minimal Greybox/Open Field/Slaughtermode maps are unchanged, per the ticket's own scope.
  Bug found in verification (pre-existing, not part of this change - flagged as a follow-up
  rather than fixed here, since this ticket is visual-only): Industrial City's spawn point sits
  inside a warehouse block's own collider footprint for the map's real seed/size, pinning the
  car in place at the start of any run there - confirmed via a headless Playwright run that
  couldn't move the car at all after spawning. Verified in-game for Suburbs, Desert Highway,
  Frozen Forest, and Quarantine Lab; Industrial City's decorator additions were verified via a
  unit test against the real generated layout instead, since the pre-existing spawn bug blocks
  driving far enough to see them in a live screenshot.

## Unreleased - S3: Art pass - Physical Garage room

- **S3** Dressed up the R1 walkable Garage room, previously a flat grey floor and four plain
  walls: dark baseboard trim along each wall's inner face, a couple of ceiling light fixtures
  (housing + a downward-facing glow panel), painted floor markings tracing a parking-bay outline
  around the build pad, and a garage-door silhouette (a panel with horizontal grooves) on the
  back wall. All of it lives in a new `garage-room-dressing` child group, purely cosmetic - no
  colliders, and `cfg.bounds`/the avatar's own movement clamp are completely untouched, so R1's
  walkable behaviour is unaffected. Bug found in verification: an early version of the light
  fixture's glow panel had an unnecessary 90-degree rotation baked in, turning what should have
  been a small downward-facing disc (a plain `CylinderGeometry`'s round caps already face up/down
  by default) into a large disc facing the camera instead, dominating the shot from most angles.
  Fixed by dropping the stray rotation and sizing the disc to actually fit inside its housing.

## Unreleased - S2: Art pass - player car model

- **S2** Replaced the plain box+cylinder placeholder car body/wheels with a merged low-poly
  model: the chassis slab now carries a rear spoiler on two struts (`buildCarBodyGeometry()`),
  and every wheel is a smoother tire plus a slightly wider hub cap (`buildWheelGeometry()`) -
  both still exactly one `Mesh` each (`body`, and each of the four `wheels`), so every system
  built on top of the old model keeps working unchanged: damage tinting/dents (I3) still key off
  `body.material`, every cosmetic option (paint, bumper, doors, decals, tires, engine exhaust -
  L1/L2/L3/L6/L7/L8/N2) still attaches the same way since it was always positioned from the
  vehicle config's own `chassisHalfExtents`, never from the body's actual geometry, and weapon
  mounts (roof/front/rear) are unaffected for the same reason. Physics collider is unchanged -
  visual only, per the ticket's own scope. An earlier revision of the body also added a hood and
  trunk ridge sitting flush against the chassis slab's own top surface; dropped after an in-game
  Playwright pass turned up shadow-acne (a dark banding artifact from two very-close-together
  surfaces fighting in the shadow map) for a bump that was mostly hidden inside the slab's
  existing silhouette anyway.

## Unreleased - S1: Art pass - zombie models

- **S1** Replaced the placeholder capsule+sphere zombie body with a merged torso+arms silhouette
  (`buildZombieBodyGeometry()`, `mergeGeometries` from three's `BufferGeometryUtils`) and gave
  each rank its own non-uniform proportions instead of a single uniform scale factor
  (`RANK_STYLE.scale: {x, y, z}` in `placeholders.ts`) - runners are leaner and taller, spitters
  tall and thin, brutes bulky, tanks squat and wide, the boss towering. Still exactly two
  instanced draw calls for the whole horde (`bodies`, `heads`), unchanged from I5 - every rank
  shares the same geometry and is differentiated purely by per-instance transform and colour, so
  the draw-call budget doesn't regress. The Rapier collider size is unaffected (fixed per rank,
  independent of the visual scale), so this is purely a cosmetic change. Verified in a full-density
  sandbox horde: ranks are visually distinguishable at range by both silhouette proportion and
  colour (e.g. the boss towers over a walker from 20m+ away).

## Unreleased - R4: Physical Garage - multi-zone placement choice

- **R4** Some parts are now valid in more than one snap zone. The one such part today, the
  machine gun (`validSlots: ['roof', 'front', 'rear']`), can be snapped onto its default roof
  mount, the front mount, or a brand new rear-facing mount - a real `WeaponSlot: 'rear'`, with
  its own mount position and its own backward-facing aim direction (`REAR_MOUNT` in
  `Weapons.ts`, `MountConfig` now carries a `localForward` per mount instead of a single
  hardcoded forward shared by every mount), so a rear-mounted gun genuinely covers zombies
  chasing from behind rather than just relabelling an existing mount. The player always
  chooses which zone by walking up to that specific one - nothing auto-picks the nearest or a
  default. Carrying a part up to a zone that's already occupied by something else swaps them:
  the new part snaps on, the old occupant comes off straight into the player's now-empty
  hands (`Garage.equip()` now takes an explicit target slot, defaulting to the part's own
  `slot` for every other, single-slot upgrade - unchanged for those). New data:
  `UpgradeDef.validSlots`, validated so it always includes the part's own default slot.
  Bug found in verification: every snap zone's own `radius` (R3's per-zone tuning, 0.6-0.9m
  depending on the zone) turned out to be purely a cosmetic ring size - the actual
  interactability check in `nearestValidEmptyZone`/`nearestOccupiedZone` always used one flat
  `garage.interactRange` (1.6m) for every zone regardless, so a wheel zone's deliberately
  tight radius had no real effect on how close you needed to stand to it. Fixed so each
  zone's own radius is what actually gates reach, matching its visual ring size; a
  regression test locks this in.

## Unreleased - R3: Physical Garage - snap-zone vehicle attachment

- **R3** The car now has 14 physical snap zones (new `snapZones` config), one per attachment
  point: all 4 wheels, the engine bay (covering both the base engine's own tiers and the
  separate V8/Turbo/Electric engine-_type_ choice, since only the latter has a mount slot),
  both armor sides, a rear fuel/nitro pair, the roof and front weapon mounts, radar, and
  headlights - every upgrade category has at least one, enforced by a test that checks the
  real catalog against the real zone list rather than trusting the two stay in sync by hand.
  Carrying a part near a zone that accepts it (by its fixed mount slot for weapon/engineType/
  ram/melee upgrades, or by category for everything else) lights the zone bright green and the
  live prompt offers to snap it on; pressing E there applies the exact same effect the old
  menu-based equip flow always has - `Garage.equip()`/`unequip()` for slotted parts, and a new
  `installed` list for passive ones (tires/health/armor/fuel/nitro/radar/headlights), which
  never needed an "equipped" concept since owning them already applies their stats. A zone
  already holding something never lights up for a different part instead - swapping an
  occupied zone's contents is R4's job, not R3's - and a snapped part can be walked up to and
  picked back up later, returning it to the carry state. New pure module `SnapZones.ts` (zone
  acceptance, occupancy, nearest-valid/-occupied lookups) with no Three.js or DOM dependency,
  fully unit tested alongside an extended `GarageStations.ts` interaction chain.
  Bug found in verification: `Garage.buy()` has always auto-equipped a weapon the instant it's
  first bought (existing behaviour, unrelated to R3) - but picking that same weapon straight
  back up off its own station never undid the auto-equip, so it read as simultaneously
  "carried" and "installed" and refused to snap back into the very zone it just came from;
  picking up from a station now un-equips it first, exactly like picking up from a zone
  already did.

## Unreleased - R2: Physical Garage - walk-up part shopping & pickup

- **R2** Every top-level upgrade/weapon (`garage.upgrades`, one physical station each - not
  every individual cosmetic colour/style variant, a scope decision made with the user given
  the catalog's size) now has a walk-up station in the Garage room, laid out evenly along its
  two long walls purely from the room's own `bounds`/`stationInset` config - no hand-authored
  per-item coordinates. A new `interact` input action (`E` / gamepad B, rebindable through the
  existing Settings screen and added to the Controls legend) drives it: walking into range
  shows a live prompt describing exactly what the next press does - buy an unowned part
  (spending real coins through the same `Garage.buy()` the menu already uses, gated on coins
  and story-map unlocks the same way), or pick up an owned one. Only one part can be carried at
  a time; carrying always takes priority on the next `E`-press, dropping it at the avatar's
  current position, where it becomes its own walk-up-able prop (pick it back up the same way).
  All of the new interaction logic (station layout, proximity lookups, the buy/pick-up/drop
  state machine, and the side-effect-free preview that drives the live prompt) lives in a pure,
  fully unit-tested module (`GarageStations.ts`) with no Three.js or DOM dependency. New config:
  `garage.interactRange`, `garage.stationInset`. Verified with a headless Playwright pass
  through the real Garage UI: buy a station part, pick it up, drop it, walk back and pick it up
  again from the ground - the prompt text and station colouring stayed correct throughout.

## Unreleased - R1: Physical Garage - walkable avatar & build pad

- **R1** First piece of the Physical Garage overhaul (R1-R4): the Garage screen now has a
  player-controlled avatar walking around the car's build pad instead of just a fixed camera
  orbit. The room (a floor patch and four walls sized to a new `garage.bounds` config) is built
  once at boot at the map's spawn point and toggled visible only while `GameState.Garage` is
  active; the avatar reuses the same input axes already bound to driving (`steer` for
  left/right, `throttle`/`brake` for forward/back) so no new bindings were needed. The avatar
  itself is intentionally not a physics body - just `{x, z, facing}` state, clamped to
  `garage.bounds` in `stepGarageAvatar()`, since R2-R4 will only need simple proximity checks
  against it, not real collision. A lerped third-person camera follows a fixed offset behind
  the avatar's own facing, replacing the turntable only for `GameState.Garage` (the main menu's
  turntable is untouched). New config: `garage.walkSpeed`, `garage.bounds`, `garage.cameraLerp`.
  Verified with new unit tests (`GarageAvatar.test.ts`, `GarageScene.test.ts`) and a headless
  Playwright pass through the real Garage UI - room and avatar visible, camera following while
  walking and strafing, movement correctly clamped at the walls.

## Unreleased - Q1: Slaughtermode

- **Q1** A third game mode, alongside Story and Sandbox: build your car in the Garage, then
  drive a single long (2.2 km), narrow (12 m), dead-straight road walled in on both sides -
  no branches, no navigation, just a continuous stream of zombies to kill. New generator
  `slaughterRoad` (`SlaughterRoadMap.ts`), following the same deterministic kit-piece pattern
  as the other story maps but with the road's whole length flanked by walls instead of the
  usual outer-perimeter-only bounds, so both the car and the horde stay confined to the strip.
  New `MapConfig.spawnerTuning` lets a map override `HordeSpawner`'s default open-map pacing
  (tighter min/max spawn distance, a much higher spawn rate, bigger clusters) without changing
  the spawner itself; Slaughtermode's own map pairs that with a chain of narrow, overlapping
  `spawnZones` running the road's length so every spawn attempt lands on the drivable strip,
  not the dead space beyond the walls. Reaching the far end (a `reachExit` objective, reused
  from the story-mode system but independent of its save-slot bookkeeping) ends the run banking
  every coin, unlike a wreck's usual 50% cut (`endRun` now takes a `died` flag); wrecking or
  running dry along the way still ends it the normal way. Always banks real coins regardless
  of Sandbox's own infinite-money flag, which a naive mode check would otherwise have kept
  reading. Verified with a new `SlaughterRoadMap.test.ts` (determinism, road/wall geometry,
  collider placement) and a headless Playwright pass through the real UI (Garage entry, one
  click and no confusing reload-then-stuck-at-the-main-menu detour, a full drive into a packed
  horde, a wreck, and a correct Results screen).

## Unreleased - P1: Vehicle rollover / flip stability

- **P1** The car no longer flips onto its side/roof from ordinary driving - hard cornering,
  curb clips, and glancing zombie hits. A new `vehicle.stability` config (`uprightSpringTorque`,
  `uprightDamping`, `maxUprightTorque`, `maxCorrectedAngle`) drives a corrective torque applied
  each step: while at least one wheel has grip, it pulls the chassis back toward upright in
  proportion to how far it's tilted, damped by the current tipping rate to settle without
  rocking, and capped so it can't just hold the car upright indefinitely. Past
  `maxCorrectedAngle` (60° by default) the correction switches off entirely, so a hit hard
  enough to matter - a ram-speed collision, a bad jump landing - still completes a real flip;
  the existing flip-reset button (R) is unchanged for when one does happen. Gated on having
  ground contact so it never fights the existing air-control torques during a jump.

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
