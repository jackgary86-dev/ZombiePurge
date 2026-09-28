# ZombiePurge – Art Style Guide (I1)

The approved look, picked from the draft in `docs/ART_PROMPT.md` (see that file's history for how it
got here). This is the short reference version — anyone generating or drawing an asset should still
read `ART_PROMPT.md` for the actual prompt blocks, technical rules and delivery checklist; this file
is the "what and why," not the "how."

## The look

**Stylized low-poly, toy-diorama proportions.** Chunky, slightly exaggerated shapes with strong,
readable silhouettes that stay clear at 300 m — the game's whole visibility-advantage mechanic (the
player sees zombies before zombies see the player) depends on silhouettes reading correctly at
range, so "readable from far away" beats "detailed up close" every time. Flat-shaded faces with
soft hand-painted gradients, no photorealism, no high-frequency detail. Cartoon violence only.

**Why this look, concretely:**

- Low-poly keeps a 200-zombie horde at 60 fps in a browser (the H1 performance budget).
- Bold silhouettes sell "spot them before they spot you" at 40-300 m, well before texture detail
  would even resolve.
- A consistent stylised look hides the fact that a horde reuses a handful of models with colour
  variants (I5), and that early maps reuse a handful of building/prop kits (I6/I7).

**Palette:** saturated but grimy — warm rust-orange and blood-red accents against desaturated
greys, teals and olive greens. Every map gets its own primary/accent pair (below) so the five
story maps read as distinct places, not palette-swaps of the same scene.

## Mood board — one line per map

| Map                      | Mood                                        | Primary                   | Accent                   |
| ------------------------ | ------------------------------------------- | ------------------------- | ------------------------ |
| Greybox (test arena)     | neutral, nothing to distract from tuning    | flat grey `#5a5a5a`       | signal red `#c8402e`     |
| 1 Suburbs                | warm late afternoon, quiet-before-the-storm | sandy beige `#c9b99a`     | warning red `#d94a3a`    |
| 2 Desert Highway         | hot, dusty, sun going down                  | sun-baked tan `#e0b073`   | road-sign teal `#2fa6a0` |
| 3 Industrial City        | overcast, sodium-lamp orange in the gloom   | rust brown `#7d5f45`      | hazard yellow `#f2b705`  |
| 4 Frozen Mountain Forest | cold, moonlit, always night (E7)            | frost blue-grey `#33475f` | ice-glow cyan `#7fd7ff`  |
| 5 Quarantine Lab Zone    | sickly green, hazard lights, the finale     | ash green `#8a9a8f`       | toxic green `#9cff3a`    |

Full sky/fog/ground hex values are in `ART_PROMPT.md` §3.5; the shipped day/night lighting presets
in `src/game/world/lighting.ts` were tuned to match this table (e.g. Suburbs day sky `0xa9c4d9`,
Frozen Forest's always-night sky `0x1c2740` — spot-checked against the table above while writing
this guide, no drift found).

## Reference sheet — silhouette notes

Until real models land (I3/I5), the shipped placeholder art (`src/game/art/placeholders.ts`,
`upgradeParts.ts`) is deliberately built from the _same_ silhouette rules an artist would follow,
so the eventual swap to real assets changes surface detail, not readability:

- **Car:** boxy wagon body + a narrower cabin block sitting high and back — reads as "car" at a
  glance, leaves the roof clear for a turret silhouette.
- **Zombie ranks, by scale and colour, not detail** (see the table in `ART_PROMPT.md` §3.2):
  Walker (1×, olive-grey) → Runner (0.95×, leaner olive) → Spitter (1×, acid green, glowing throat)
  → Brute (1.35×, brown) → Tank (1.8×, dark grey-green) → Boss (2.8×, hazard orange). Ice Zombie is
  any rank retextured pale blue. A horde reads its threat mix from height and colour alone, before
  the player is close enough to see a face.
- **Weapons/upgrades:** bigger and more welded-looking per tier (a stat upgrade should _look_ like
  an upgrade), sitting on the same named mount points a real model will use (§2.1 in `ART_PROMPT.md`).

A literal mood-board image (concept sketches, reference photography) is still open — flag it to the
owner if/when there's a human artist or an image-generation pass to run `ART_PROMPT.md` through;
nothing in the engine blocks on it, since the asset pipeline (I2) reads real `.glb` files by name
and falls back to these primitives when one isn't present yet.

## Status

- [x] Look picked (stylised low-poly, toy-diorama) — matches what's already shipped as placeholder art
- [x] Palette per map — matches the shipped lighting presets
- [ ] Mood boards / reference photography — not generated in this session (no image-generation tool
      available here); `ART_PROMPT.md` is ready to hand to one
- [x] Saved as `docs/ART_STYLE.md`
