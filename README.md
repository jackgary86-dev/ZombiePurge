# ZombiePurge

A 3D zombie-smashing vehicular combat sandbox game built with Three.js, TypeScript, and Vite.

**▶ Play the live demo:** https://jackgary86-dev.github.io/ZombiePurge/ — rebuilt automatically on every merge to `main` (the build number and commit hash are shown in the bottom-right corner). Add `#autoplay` to the URL to watch the car hunt zombies by itself.

![Smashing through a horde on the greybox test map](docs/images/m1-horde-kill.png)

## Quick Start

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run tests with a coverage report
npm run test:coverage

# Lint code
npm run lint

# Check types
npm run type-check
```

## Controls

| Action                        | Keyboard                            | Gamepad                                |
| ----------------------------- | ----------------------------------- | -------------------------------------- |
| Drive / reverse               | W / S or arrow keys                 | Right / left trigger                   |
| Fire                          | F or left click                     | Right bumper                           |
| Nitro                         | Shift                               | X                                      |
| Steer                         | A / D or arrow keys                 | Left stick                             |
| Handbrake                     | Space                               | A                                      |
| Flip reset (when upside down) | R                                   | Y                                      |
| Pause                         | Esc / P                             | Start                                  |
| Orbit camera                  | Click the game, then move the mouse | Right stick (coming with the HUD work) |

Controls are rebindable; bindings persist in `localStorage`.

## Project Structure

```
src/
  ├── core/        # Engine loop, state machine, physics
  ├── game/        # Game mechanics, car, zombies, economy
  ├── ui/          # HUD, menus, screens
  ├── data/        # Config loaders, data models
  ├── main.ts      # Entry point
  └── style.css    # Global styles

tests/             # Unit tests (Vitest)
assets/            # 3D models, textures, sounds
```

## Game Design

**Genre:** 3D open-area vehicular combat sandbox

**Core Loop:**

1. Drive across a large map
2. Find and run over/shoot zombies
3. Earn coins by rank and distance
4. Buy upgrades (weapons, armor, engine, fuel, tires)
5. Progress through 5 story maps or play infinite sandbox

**Key Features:**

- Third-person chase camera behind/above car
- 5 zombie types (Walker, Runner, Spitter, Brute, Tank)
- Visibility advantage: player sees 300m, zombies detect at 40–80m
- Economy: coins by rank + distance bonus (1 coin/250m)
- Shop system with tiered upgrades
- Story Mode (5 maps) + Sandbox Mode
- Fuel system, HP, armor, minimap/radar

## Milestones

| #      | Goal                                          | Status                                                                                                                                               |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0** | Foundation (scaffold, car, camera)            | ✅ Done (A1–A7)                                                                                                                                      |
| **M1** | Zombie Smash Prototype (zombies, coins, demo) | ✅ Done (B1–B7, C1–C5, I12, K1–K4, K6, K5)                                                                                                           |
| **M2** | Shop & Upgrades                               | ✅ Done (D1–D14, J4, K5)                                                                                                                             |
| **M3** | Sandbox Mode (first playable)                 | ✅ Done (E1–E3, F1, I8, I10, I11, J1/J2/J6–J8/J10–J12)                                                                                               |
| **M4** | Story Mode: Map 1 (Suburbs)                   | ✅ Done (E4, E9, F2, F3, I6, J3, J5, J9)                                                                                                             |
| **M5** | Story Mode: Maps 2-5                          | ✅ Done (E5–E8, F4, I7)                                                                                                                              |
| **M6** | Polish & Release                              | 🔶 In progress (G1–G3, H1–H5, I1, I2, I9, J13 done; I3/I5 placeholder-art extensions — real 3D assets still pending; I4 already covered by D14 + I2) |
| **M7** | Car Customization & Combat Expansion          | ✅ Done (L1-L8, O1, M1-M5, N1-N2)                                                                                                                    |
| **M8** | Vehicle & Garage Overhaul                     | ✅ Done (P1, Q1, R1-R4)                                                                                                                              |
| **M9** | Art pass & bug bash                           | 🔶 In progress (S1-S7 done - full art epic complete; T1-T3 done; T4-T7 pending)                                                                      |

## What's Built So Far

- **A1** Vite + TypeScript + Three.js + Rapier scaffold with ESLint, Prettier, Vitest
- **A2** Fixed-step game loop (60 Hz physics, variable-rate render) and state machine
- **A3** Raycast-suspension car on a Rapier rigid body: drive, brake, reverse, handbrake, air control, flip reset
- **A4** Third-person chase camera: speed-based pull-back and FOV, orbit with auto-recenter, wall collision
- **A5** Keyboard + gamepad input with rebindable, persisted bindings
- **A6** 500 m greybox arena: walls, ramps, slalom boxes, pillar grid
- **A7** Typed, validated config for physics, vehicle, camera, zombies, rewards and maps
- **B1–B3** Pooled zombie entities, AI (idle/wander → alerted → chase → attack → dead, 40–80 m detection, loud cars heard further), clustered horde spawner that keeps out of view
- **B4/B5** Run-over kills: damage = relative speed × car mass; slow bumps just shove; heavy ranks hurt the car, armor reduces it
- **C1/C2/C4/C5** Coins by rank with +N popups, 1 coin per 250 m driven, run summary, persisted wallet (keep a share on death)
- **B6/B7** Spitter acid projectiles; the whole horde renders as two instanced draw calls (250 zombies) with head LOD
- **C3** Combo multiplier for chained kills (x2–x4), shown on the HUD and popups
- **I12/K2** Placeholder zombie art and the drive-and-smash demo loop with HUD and game-over screen; `#autoplay` hunts zombies by itself
- **K1/K3/K4/K6** GitHub Pages deploy with a build tag, F1 live tuning panel with JSON export, `#debug` cheat console, demo testing checklist
- **D1/D2/J4** Upgrade model in config and the Garage: buy tiers, mount weapons, before/after stat bars, repair, persisted loadout; the game opens on the garage
- **D3–D7** Engine, tires, health, armor, fuel tank (drains while driving; empty = OUT OF GAS) and repair applied to the live car each run
- **D8–D11** Roof/front weapon mounts with auto-aim: machine gun (heat), shotgun (pellets, magazine), rocket launcher (splash), flamethrower (burning, drinks fuel)
- **D12–D14** Front ram multipliers, nitro boost (Shift), and every owned upgrade visible on the car
- **E1–E3** 2 km open-field map streamed in 250 m chunks, weighted spawn zones, rotating minimap with radar range, F2 detection overlay
- **F1/J1–J12** Main menu → Sandbox setup (map, density, night, infinite money, no-fail) → Garage → run; pause menu, results screen, settings (graphics, draw distance, volumes, rebinding), controls, loading screen
- **I8** Day/night lighting presets per map with headlights at night
- **I10** A hand-drawn icon set (coins, HP, fuel, every upgrade/weapon) and a condensed display font for titles and buttons
- **I11** ZombiePurge wordmark logo on the main menu and loading screen, a left-anchored main menu composition over the live turntable, and a moodier loading screen
- **E4/I6** Map 1: Suburbs — two cul-de-sacs of houses, a park, a signposted exit, all built whole like the greybox arena
- **E9** Gas, repair, coin and ammo pickups placed per map, collected by proximity, each with its own placeholder prop
- **F2/F3** Story progression (per-map objectives unlock the next map) on top of a versioned, multi-slot save system — each slot has its own wallet, garage and story progress
- **J3/J5/J9** Save slot picker (new/select/delete), the story map select screen (locked/unlocked/completed), and the map-complete screen between story maps
- **E5/I7** Map 2: Desert Highway — one long road across a 1.6 km desert, gas stations every few hundred metres, big jump ramps, cacti and rocks instead of trees
- **E6/I7** Map 3: Industrial City — a tight warehouse grid on narrow streets around a clear boss courtyard; the district's first boss
- **E7/I7** Map 4: Frozen Mountain Forest — a dense pine forest split by a road to the mountain pass, always night, looser tire grip on the snow, and Tank/Ice Zombie enemies
- **E8/I7** Map 5: Quarantine Lab Zone — concentric ringed corridors spiralling into a central chamber, glowing containment pods, and the final boss
- **F4** Boss fights from Map 3 on: a shared, config-driven AI (the existing ranged-attack system plus a new AOE ground-slam) gives each boss its own moveset without bespoke code per boss
- **G1** A real graphical HUD — speed, HP/fuel/nitro bars, weapon ammo/heat, coins/kills/combo, objectives — replacing the old debug text readout; the minimap keeps its own place alongside it
- **G2** Hit feedback: camera shake from damage and kills, a brief slow-motion beat on a multi-kill (GameLoop's own tick rate slows down, not just visuals), and blood decals that build up on the car (skipped with the Low Gore setting)
- **G3** Procedural placeholder audio (Web Audio, no assets yet — I2): engine pitch by speed, handbrake skids, impact thumps, a tone per weapon, distance-falloff zombie groans, a per-map ambient drone, and menu click/hover blips, all under the existing volume sliders
- **H1** A config-driven performance budget (60 fps / 200 zombies); a real profiling pass found and fixed a per-tick allocation hotspot in the G3 audio code; the fps overlay now also shows the live zombie count
- **H2** A coins-per-minute balance simulator checks every upgrade tier against a documented play-pace assumption — the existing pricing already clusters around the 10–15 minute target
- **H3** A real coverage pass (`npm run test:coverage`) targeted genuine gaps in config validation, save/load edge cases and wallet/garage resets — and caught a latent crash when a zombie rank's config went missing
- **H4** A versioned release build: the app version now ships in the build tag, and three/Rapier are split into their own cached vendor chunks
- **H5** `docs/DEMO_TESTING.md`'s per-milestone manual checklist, now covering M6's HUD/feedback/audio/perf work too
- **I1** Art direction & style guide (`docs/ART_STYLE.md`): mood-board notes and a per-map palette table alongside the existing `docs/ART_PROMPT.md` spec; no image-generation tool is available in this environment, so the mood-board images themselves aren't rendered yet — nothing in the engine blocks on it
- **I2** Asset pipeline: the `assets/models/{category}/` folder convention, `GameConfig.assetBudget` triangle/texture budgets as real validated config (not just docs), and `AssetLoader.loadModel()` (GLTFLoader-based, resolves to `null` on any failure so placeholder art keeps rendering until real `.glb`s land) - now with Draco geometry compression, meshopt decoding, and KTX2 (Basis Universal) texture decoding wired in (`configureKTX2()` hooks up the last one once a renderer exists), so a real compressed asset works the moment one lands without any further loader changes
- **I3** Car damage-state visuals: the body tints and grows dent decals through clean → dented → wrecked as HP drops, config-driven thresholds (`carDamage`) — a placeholder-art extension; real clean/dented/wrecked models still need a 3D art pass
- **I5** Zombie rank variants + simple motion: per-instance colour jitter so a horde of one rank isn't visually identical clones, plus a procedural walk-bob and attack lunge/scale-pulse in lieu of real animation clips — a placeholder-art extension; real rigged/animated models still need a 3D art pass
- **I9** VFX art gaps: a muzzle flash at the weapon mount on every shot, tyre-skid decals behind the rear wheels while sliding, and dust/snow drive-trail puffs coloured per map's own palette
- **J13** A real Credits screen (team, tools, asset licenses) off the main menu, replacing the old one-line placeholder panel
- **L1/L2** Car customization: a new Garage "Customize" tab lists purchasable/selectable cosmetic options by category; the first category, Paint, offers 7 colours (one free stock colour, six purchasable) applied live to the car body — in the garage turntable, in gameplay, and correctly layered under the existing damage-state tinting (I3)
- **L3** Bumper style selection: 3 purely cosmetic front-bumper looks (stock rubber bar, chrome bar, brush guard), each a distinct primitive shape mounted close against the body so it never visually collides with an owned D12 ram upgrade
- **L4** Driver character: a simple placeholder driver figure seated in the cabin, visible through a now semi-transparent windshield, with 5 purchasable outfit colours
- **O1** Roof-mounted guns (machine gun/shotgun/rockets) now autoshoot the instant the existing auto-aim mount (D8) locks a target in range, instead of also requiring the Fire button held
- **L5** Window customization: 4 cabin-glass tints/finishes (stock, clear, dark, mirrored), each its own colour/opacity/metalness combination, applied to the same cabin material the L4 driver figure is seen through
- **L6** Door style selection: 3 cosmetic door-trim looks (stock/flush, paneled trim, chrome trim), mirrored on both sides of the body, independent of the door's underlying shape
- **L7** Decals: 5 body-side decal options (none, flames, racing stripes, skull, number roundel), each a small mirrored primitive cluster on its own named part - stacks independently of paint (L2) since it never touches the body material
- **L8** Tire cosmetic selection: 4 rim/tread looks (stock, chrome rim, whitewall, off-road tread), applied as trim primitives that ride along inside each wheel mesh's own local space - independent of the D4 tire-grip stat upgrade. Completes the full L1-L8 garage cosmetics set.
- **M1/M2** A new Melee weapon slot/category (front-mounted, alongside the ram and flamethrower) plus its first weapon, the Spike Cluster: flat contact damage and a knockback shove on every car-zombie touch, independent of the speed-scaled run-over damage the Front Ram (D12) multiplies. A growing spike-cluster model shows on the front once equipped.
- **M3** The second melee weapon, Circular Saw: continuous damage every tick a zombie stays touching the car (not one hit per contact like the spikes), tracked across Rapier collision start/stop events. A spinning blade shows at the front whenever it's equipped, with a grinding sound and a spark flash specifically while it's touching something.
- **M4** The third melee weapon, Swinging Hammer: a third distinct mechanic again - a periodic AOE burst on its own cooldown that needs no physical contact at all, hitting everything within a radius of the car with damage and a knockback shove. A one-shot swing animation plays on the front mount each time it fires, with a flash/thump on any hit.
- **M5** The roof turret's shape now reflects whichever weapon is actually equipped, instead of always showing the same generic base-and-barrel silhouette: Machine Gun keeps the single long barrel, Shotgun gets a short stubby double barrel, and Rockets gets a 2x2 cluster of launch tubes. The front-mounted weapons (Flamethrower, Spike Cluster, Circular Saw, Swinging Hammer) already had distinct equipped visuals as of M1-M4, so this closes the same gap for the roof slot.
- **N1** Engine tuning: a free, always-adjustable slider (Garage → Engine tab, once the engine upgrade is owned) that trades the owned engine tier's own top speed bonus against its acceleration bonus, rather than one fixed stat pair per tier. Config-driven via `vehicle.engineTuning.swingFactor` (0.5 by default - up to a 50% swing either way); a balanced slider (0) reproduces the exact pre-N1 stats.
- **N2** Engine replacement: three alternative engine types (V8, Turbo, Electric), each its own top speed/acceleration/weight trade-off, occupying a new `'engine'` mount slot alongside the existing tier ladder (D3/N1) rather than replacing it - only one type is equipped at a time, and swapping is a separate purchase/equip action. Weight actually matters: `Vehicle.setMass()` re-applies the physics body's real simulated mass (not just the config number) whenever it changes, so a heavier V8 or lighter Electric motor is felt in collisions without throwing off the `acceleration` stat's own meaning. The equipped type's own visual cue is the exhaust - stock gets a single small pipe, V8 a chrome dual pipe, Turbo one wide pipe, and Electric none at all.
- **K5** PR preview demos: every pull request now gets its own preview link (`pr-<number>/`), built and published by `.github/workflows/preview.yml` on every push to the PR, with a bot comment carrying the link that updates in place rather than piling up. `deploy.yml` mirrors main's own build alongside those previews on the same `gh-pages` branch, so they coexist without clobbering each other. **Not live by default** - see the CI/CD section below for the one-time Settings step that turns it on.
- **P1** The car no longer flips onto its side/roof from ordinary driving (hard turns, curb clips, glancing zombie hits): a config-driven (`vehicle.stability`) corrective torque pulls it back toward upright while at least one wheel has grip, fading out and capping below what a real hard hit (a ram-speed collision, a bad jump landing) still needs to complete a genuine flip - the existing flip-reset button still works exactly as before for when one does happen.
- **Q1** Slaughtermode: a third game mode alongside Story and Sandbox - build your car in the Garage (real coins, no setup screen since there's only one map), then drive a single long, narrow, dead-straight road (`slaughterRoad`) walled in on both sides, packed with a continuous, config-driven (`spawnerTuning`) stream of zombies. Reaching the far end ends the run cleanly (banking every coin, unlike a wreck's 50% cut); wrecking or running dry along the way ends it the normal way. `#map=slaughterRoad&slaughter=1` resumes straight into the garage after the mode's own map-switch reload, the same way Story mode's own reload resumes.
- **R1** Physical Garage, part one: the Garage screen is no longer just a camera orbiting the car - a walkable player avatar now stands on the build pad inside a simple four-walled room, moved with the same WASD/gamepad axes used for driving, with a third-person camera following behind it. Movement and the room's footprint are config-driven (`garage.walkSpeed`, `garage.bounds`, `garage.cameraLerp`), and the avatar is pure `{x, z, facing}` state clamped to those bounds in code rather than a physics body, since the only thing R2-R4 need from it is a position to check proximity against. Lays the groundwork for walking up to parts and snapping them onto the car (R2-R4, not yet built).
- **R2** Physical Garage, part two: every top-level upgrade/weapon (`garage.upgrades` - not every individual cosmetic colour/style variant) now has a physical pedestal laid out along the room's walls. Walk up and a new `E`/gamepad-B **interact** prompt shows what pressing it will do; unowned parts buy (spending real coins through the same `Garage.buy()` the menu uses), owned parts pick up - the avatar visibly carries one part at a time and can drop it anywhere in the room, where it becomes a walk-up-able prop again. New config: `garage.interactRange`, `garage.stationInset`.
- **R3** Physical Garage, part three: the car itself now has 14 physical snap zones (`snapZones` config) - one per wheel, engine bay (base engine tier and the separate V8/Turbo/Electric engine-_type_ choice both), armor sides, a rear fuel/nitro pair, roof/front weapon mounts, radar and headlights - covering every upgrade category. Carrying a part near a zone that accepts it lights the zone up green and the prompt offers to snap it on; snapping applies the exact same equip effect the old menu-based flow always has (weapons/engine types call the existing `Garage.equip()`; passive upgrades like armor/tires just track as installed, since they've contributed their stats from the moment they were owned regardless of "installed" state). A snapped part can be walked up to and picked back up later. Zones that already hold something never light up for a different part - swapping what's in an occupied zone is R4's job. Bug found in verification: a weapon auto-equips the instant it's first bought (existing, pre-R3 behaviour) - picking it straight back up off its own station needed to undo that too, or it'd read as "occupied" by itself and refuse to snap back into the very zone it came from.
- **R4** Physical Garage, part four: some parts are now valid in more than one zone, chosen explicitly by which one the player walks up to. The machine gun (the one such part) can snap onto its default roof mount, the front mount, or a genuinely new rear-facing mount - a real third weapon slot with its own aim/fire logic (`REAR_MOUNT`, `WeaponSlot: 'rear'`), not just a label, so a rear-mounted gun actually covers zombies chasing from behind. Carrying a part up to a zone that's already occupied by something else swaps them: the new part goes on, the old one comes off straight into the player's now-empty hands. `Garage.equip()` now takes an explicit target slot for this - the part's own default slot when omitted, unchanged for every other (single-slot) upgrade. Bug found in verification: every snap zone's individually-tuned `radius` (0.6-0.9m depending on the zone) turned out to be purely cosmetic - the actual interactability check always used one flat `garage.interactRange` (1.6m) regardless, so a wheel zone's tight radius had no real effect on how close you needed to stand. Fixed so each zone's own radius is what actually gates reach, matching its visual ring size.
- **S1** Art pass on the zombie models: the placeholder capsule+sphere body is now a merged torso+arms silhouette (still one `BufferGeometry`), and every rank has its own non-uniform proportions (`RANK_STYLE.scale: {x, y, z}`) instead of I5's single uniform scale factor - runners leaner and taller, spitters tall and thin, brutes bulky, tanks squat and wide, the boss towering. Still exactly two instanced draw calls for the whole horde (unchanged from I5) - every rank shares the same shared geometry, differentiated only by per-instance transform and colour, so the draw-call budget doesn't regress. Purely cosmetic: the Rapier collider size is fixed per rank and untouched by the new visual scale.
- **S2** Art pass on the player car model: the plain box+cylinder placeholder is now a merged low-poly model - a rear spoiler on two struts added to the chassis slab, and a smoother tire plus a slightly wider hub cap on every wheel - while `body` and each of the four `wheels` stay exactly one `Mesh` each, so every existing system keeps working unchanged: damage tinting/dents (I3), every cosmetic option (paint, bumper, doors, decals, tires, exhaust), and weapon mounts, none of which were ever keyed off the body's actual geometry (all positioned from the vehicle config's own `chassisHalfExtents` instead). Physics collider unchanged, visual only, per the ticket's own scope.
- **S3** Dressed up the R1 walkable Garage room (previously a flat grey floor and four plain walls) with wall baseboard trim, a couple of ceiling light fixtures, painted floor markings around the build pad, and a garage-door silhouette on the back wall - all purely cosmetic, in a new `garage-room-dressing` child group with no colliders, leaving `cfg.bounds` and the avatar's own movement clamp completely untouched.
- **S4** More theme-appropriate detail on each story map's placeholder kit-piece props, via the shared `KitDecorator` hook (`PlaceholderMapKit.ts`) that runs once per piece purely for looks - `buildKitColliders` never calls it. Desert Highway's gas stations get a roof overhang and signage, pumps a nozzle, cacti two side arms; Industrial City's warehouses get a roof cap and vent, crates a strap, gates a lamp; Frozen Forest's boulders get a snow cap; Suburbs' parked cars get a cabin bump on top of the roofs/fountain it already had. Bug found in verification (pre-existing, flagged as a follow-up rather than fixed here since this ticket is visual-only): Industrial City's spawn point sits inside a warehouse's own collider for the map's real seed, pinning the car in place at the start of any run there.
- **S5** More visual punch across the existing VFX systems, purely visual (no gameplay value touched, confirmed by the balance/combat test suites passing unmodified): a secondary shockwave ring alongside the muzzle flash and a sharper fade curve; a ground-hugging shockwave ring alongside rocket blasts; a brighter inner "hot core" cone inside the flamethrower's jet, with per-frame scale pulsing on top of the existing rotation jitter; and per-instance random size/colour/rotation jitter for skid marks, dust/snow drive-trail puffs (plus an ease-out "poof" growth curve), and blood splatters, so repeated instances read as organic rather than stamped copies.
- **S6** A light post-processing pass (`PostFX.ts` - bloom plus a subtle vignette/colour-grade) layered on top of the existing per-map day/night lighting presets (I8), gated entirely off on 'low' graphics quality (alongside shadows, which already followed the same rule) so that setting still means zero composited-pipeline overhead and today's exact look. Toggling graphics quality mid-run flips it on/off immediately, through the same `applySettings()` wiring already used for shadows/pixel ratio - no restart needed.
- **S7** Filled in every remaining generic/placeholder icon gap across the UI, expanding I10's icon set from 28 to 32 icons (`restart`, `clock`, `volume`, `camera`). The R2 walk-up Garage part station prompt now shows the part's own icon (previously had none); the Pause menu's six buttons now carry the same icons their Main Menu equivalents already use; the Settings screen's main rows and its "Controls" heading are icon-led; the Credits screen's three sections each get a heading icon; and the Results screen's per-rank kill rows and Time row - previously falling through to plain text - now get icons like every other row.

## Development

- **Language:** TypeScript (strict mode)
- **Build:** Vite + ESBuild
- **Physics:** Rapier 3D (dimforge/rapier3d-compat)
- **Renderer:** Three.js
- **Testing:** Vitest
- **Linting:** ESLint + Prettier
- **CI/CD:** GitHub Actions — `ci.yml` runs lint, type-check, tests and build on every PR; `deploy.yml` publishes the live demo to GitHub Pages on every push to `main` (repo Settings → Pages → Source is currently **GitHub Actions** - this is the live mechanism today and nothing below changes it on its own)
- **PR previews (K5), opt-in:** `preview.yml` builds and publishes every PR to `pr-<number>/` on the `gh-pages` branch; `deploy.yml` also mirrors main's own build to that branch's root on every push, alongside whichever PR previews are currently open. None of this is reachable yet - `gh-pages` isn't an active Pages source until you switch **Settings → Pages → Build and deployment → Source** from "GitHub Actions" to **"Deploy from a branch"**, branch `gh-pages`, folder `/ (root)`. That switch is reversible any time (flip it back to "GitHub Actions" to return to today's exact deploy mechanism) and is the only manual step - once it's on, both the live demo (root) and every open PR's preview serve from the same site.

## Tickets & Issues

See the [GitHub Issues](https://github.com/jackgary86-dev/ZombiePurge/issues) for the full ticket backlog (85 tickets across 11 epics, M0–M6).

Each ticket is tagged with:

- **Epic:** A–K (11 epics)
- **Milestone:** M0–M6
- **Priority:** high/medium/low
- **Category:** core, ai, gameplay, economy, shop, story, etc.

## License

TBD
