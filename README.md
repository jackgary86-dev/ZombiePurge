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

| #      | Goal                                          | Status                                                                                     |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **M0** | Foundation (scaffold, car, camera)            | ✅ Done (A1–A7)                                                                            |
| **M1** | Zombie Smash Prototype (zombies, coins, demo) | ✅ Done (B1–B7, C1–C5, I12, K1–K4, K6; K5 PR previews deferred until Actions runners work) |
| **M2** | Shop & Upgrades                               | ✅ Done (D1–D14, J4; K5 deferred)                                                          |
| **M3** | Sandbox Mode (first playable)                 | ✅ Done (E1–E3, F1, I8, J1/J2/J6–J8/J10–J12; I10/I11 art passes pending)                   |
| **M4** | Story Mode: Map 1 (Suburbs)                   | ⬜ TODO                                                                                    |
| **M5** | Story Mode: Maps 2-5                          | ⬜ TODO                                                                                    |
| **M6** | Polish & Release                              | ⬜ TODO                                                                                    |

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

## Development

- **Language:** TypeScript (strict mode)
- **Build:** Vite + ESBuild
- **Physics:** Rapier 3D (dimforge/rapier3d-compat)
- **Renderer:** Three.js
- **Testing:** Vitest
- **Linting:** ESLint + Prettier
- **CI/CD:** GitHub Actions — `ci.yml` runs lint, type-check, tests and build on every PR; `deploy.yml` publishes the live demo to GitHub Pages on every push to `main` (repo Settings → Pages → Source must be **GitHub Actions**)

## Tickets & Issues

See the [GitHub Issues](https://github.com/jackgary86-dev/ZombiePurge/issues) for the full ticket backlog (85 tickets across 11 epics, M0–M6).

Each ticket is tagged with:

- **Epic:** A–K (11 epics)
- **Milestone:** M0–M6
- **Priority:** high/medium/low
- **Category:** core, ai, gameplay, economy, shop, story, etc.

## License

TBD
