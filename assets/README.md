# assets/ (I2 asset pipeline)

This is where real art (`.glb` models, their textures, skyboxes) lives once it's produced. It's
currently empty on purpose: every folder below has a `.gitkeep` so the layout is real and
version-controlled, but no real assets have been delivered yet. Until then, the game runs entirely
on procedural placeholder art (`src/game/art/placeholders.ts`, `upgradeParts.ts` — see I12), and
`src/game/art/AssetLoader.ts` degrades to that placeholder automatically when a named model isn't
found here.

See `docs/ART_PROMPT.md` for the actual generation prompts and the full delivery checklist, and
`docs/ART_STYLE.md` for the approved look and per-map palette. This file is just the folder map.

## Layout

```
assets/models/
  car/            player car body (clean/dented/wrecked) - ticket I3
  parts/          upgrade parts (weapons, armor, tyres, tanks...) - ticket I4
  zombies/        zombie ranks, rigged with idle/walk/run/attack/hit/death clips - ticket I5
  env/suburbs/    Map 1 environment kit - ticket I6
  env/desert/     Map 2 environment kit - ticket E5/I7
  env/industrial/ Map 3 environment kit - ticket E6/I7
  env/frozen/     Map 4 environment kit - ticket E7/I7
  env/lab/        Map 5 environment kit - ticket E8/I7
  vfx/            VFX sprites/meshes (muzzle flash, fire, explosions...) - ticket I9
  ui/             UI icon source files, if not built as inline SVG (see src/ui/icons.ts) - ticket I10
  sky/            equirectangular skyboxes, day/night per map - ticket I8
```

## Naming

`assets/models/{category}/{name}_{variant}.glb`, lowercase, no spaces, textures named
`{name}_albedo.png` / `{name}_normal.png` / `{name}_orm.png` next to the model. Full rules,
triangle/texture budgets and the car's named attachment points are in `docs/ART_PROMPT.md` §2; the
budget numbers themselves are also in code as `GameConfig.assetBudget`
(`src/data/defaults.ts`) so a future budget-checking tool doesn't have to parse markdown.

Licence/attribution for anything not made in-house goes in `assets/LICENSES.md` (create it with the
first delivered asset).
