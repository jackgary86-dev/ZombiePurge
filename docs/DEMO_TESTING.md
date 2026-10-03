# Demo testing checklist

Short lists of things to try in the live demo after each milestone. Open
https://jackgary86-dev.github.io/ZombiePurge/ (or `npm run dev` locally), check the build tag in the
bottom-right corner matches the latest merge, then work down the list for the current milestone.
Tick items in the PR that closes the milestone.

**Browsers:** try Chrome, Edge and Firefox at least once per milestone. Note the fps shown in the HUD.

## M0 – Foundation

- [ ] Page loads to a lit scene with the red car on the grey arena; no errors in the browser console (F12)
- [ ] W / arrow-up accelerates, S brakes then reverses, A/D steer, Space handbrake slides the rear
- [ ] Drive up a ramp: the car leaves the ground and lands without flipping
- [ ] Flip the car (hit a ramp edge sideways), press R: it rights itself
- [ ] Camera pulls back and widens as speed rises; click the game and move the mouse to orbit; it recenters when you drive
- [ ] Drive at a wall or the big block: the camera never goes through it
- [ ] Esc pauses (HUD says PAUSED) and resumes
- [ ] Plug in a gamepad: right trigger drives, left stick steers, A handbrake, Y flip, Start pauses

## M1 – Zombie Smash Prototype

- [ ] Zombies are visible within a few seconds; the HUD "zombies" count is around 150
- [ ] Zombies far away ignore you; drive within ~50 m and they turn and chase
- [ ] Run over a walker at speed: it drops, a **+1** pops up, coins go up by 1
- [ ] Nudge a zombie at walking pace: it's shoved, not killed
- [ ] Stop inside a horde: HP drains as they attack; drive off and it stops
- [ ] Drive 250 m in a straight line: coins tick up by 1 with no kill
- [ ] Let the car die: WRECKED screen shows kills, distance, coins earned and coins kept; Enter restarts
- [ ] Reload the page: the kept coins are still in the wallet (check browser localStorage `zombiepurge.wallet`)
- [ ] Add `#autoplay` to the URL: the car hunts zombies on its own
- [ ] Open the page with `#debug`, press `(backquote):`spawn tank 3`puts three Tanks ahead of the car,`god`makes you immortal,`tp 0 0` teleports to the centre
- [ ] Press F1: the tuning panel opens; drag `vehicle.topSpeed` down and the car caps lower immediately; Copy JSON shows the values
- [ ] Fps stays above 30 with 150 zombies on a mid-range laptop

## M2 – Shop & Upgrades

- [ ] The page opens on the GARAGE with the car on a slow turntable and your coin balance in the header
- [ ] Cards explain themselves: "Need N more coins", "Unlocks on map N", "Fully upgraded"; stat bars show before → after
- [ ] Buy Engine tier 1: balance drops by 150, the pips fill, the next tier's price appears
- [ ] Buy the Machine Gun: it shows "Equipped" and a turret appears on the roof
- [ ] DRIVE, then hold F (or click): tracers, zombies drop, the gun bar fills and reads OVERHEATED if you hold it; let go and it cools
- [ ] Equip the Shotgun instead: each shot sprays tracers, `ammo 5/6` counts down, then `reloading`
- [ ] Equip the Rocket Launcher: rockets fly and explode with a blast sphere; a horde in the blast dies together
- [ ] Buy the Flamethrower (front): holding F shows a flame jet, zombies glow orange and keep burning after you let go, and fuel drops faster
- [ ] Buy Nitro, hold Shift: BOOST on the HUD, the car surges, the bar drains and slowly refills
- [ ] Buy Armor / Ram / Fuel Tank / Radar / Headlights: the matching parts appear on the car in the garage
- [ ] Fuel gauge drops while driving; stop with an empty tank and you get OUT OF GAS
- [ ] Get wrecked: WRECKED screen, Enter returns to the garage with a Repair (price) button; repairing charges per missing HP
- [ ] With `#debug`, `then`unlockall`: every card is maxed and the top-tier gun is mounted
- [ ] Reload the page: purchases, loadout and coins are still there

## M3 – Sandbox Mode

- [ ] Loading screen: the ZombiePurge logo on a moody red-glow background, a tip, then the main menu with the same logo left-anchored over the car turntable; arrow keys / gamepad move the highlight, Enter/A selects, Esc/B goes back
- [ ] Every menu button, garage tab and upgrade card shows an icon (play, wrench, gear, gun/flame/rocket per weapon, coin on the balance and results screen)
- [ ] Sandbox: pick Open Field (2 km), drag density to 50%, tick Night, DRIVE → Garage → DRIVE: dark sky, headlights on, about half as many zombies
- [ ] Drive for a minute across the field: buildings, trees and roads appear ahead and vanish behind (chunk streaming) without hitches
- [ ] The minimap rotates with you, shows roads, the radar ring and green/red blips; buy Radar in the garage and the ring grows
- [ ] F2: rings around zombies (blue idle, yellow alerted, red chasing) and the big view-distance ring
- [ ] Esc: pause menu; Resume continues, Restart run resets, Return to Garage / Quit to Main Menu work
- [ ] Wreck or run dry: results screen with kills by rank, distance, time, coins by source; Retry / Garage / Main Menu
- [ ] Settings: lower draw distance (fog closes in), change camera sensitivity, rebind Handbrake to another key, reload — all remembered
- [ ] Infinite money + no-fail: garage shows ∞ coins and everything buyable; the car can't be wrecked or run dry; purchases don't persist after leaving sandbox
- [ ] `#map=greybox` still loads the tuning arena

## M4 – Story Mode: Map 1 (Suburbs)

- [ ] Main menu → Story Mode: the save slot screen; New Game creates a slot named "New Game"
- [ ] The world map shows "Map 1: Suburbs" unlocked with its objectives listed, Play starts it
- [ ] Suburbs loads: two cul-de-sacs of houses with peaked roofs, low fences, a parked car here and there, a park with trees, a fountain and benches, and a signposted gate on the far edge
- [ ] The garage balance is this save's own coins (0 on a new slot), separate from the sandbox wallet
- [ ] The HUD shows both objectives ("Clear 10 zombies…", "Drive out through the exit gate") and updates the kill count live
- [ ] Driving over a pickup (gas/repair/coins/ammo) removes its prop immediately and has the expected effect (fuel/HP/coins/ammo topped up)
- [ ] Killing 10 zombies and reaching the exit gate ends the run with the Map Complete screen, not the wreck/results screen
- [ ] Map Complete shows kills/distance/coins, names the next map (or says it was the last one), and Continue returns to the world map
- [ ] Back on the world map, Suburbs now shows "Completed" and (once a Map 2 exists) the next map is unlocked
- [ ] Back at the save slot screen, the slot's coins and play time reflect the run; Delete needs a second click to confirm and removes the slot
- [ ] Wrecking or running dry during a story run banks coins into that save's wallet (not the sandbox one) and does not unlock the next map

## M5 – Story Mode: Maps 2-5

- [ ] Completing Suburbs unlocks Map 2 on the world map
- [ ] Desert Highway: a long straight road across a sandy 1.6 km map, gas stations every few hundred metres, big jump ramps, cacti/rocks instead of trees; kills + reach-the-end objectives
- [ ] Industrial City: a tight grid of warehouses on narrow streets around an open centre; the HUD lists a Brute Boss objective alongside the kill count
- [ ] Driving into the centre courtyard finds the boss — it's visibly larger, slams the car for AOE damage on a cooldown when close, and its kill completes that objective and pays 100 coins
- [ ] Frozen Mountain Forest always loads at night with headlights on; the car handles noticeably looser (E7 ground grip) than on the other maps
- [ ] The forest's Frost Boss lobs a ranged attack from a distance as well as slamming up close
- [ ] Quarantine Lab Zone: concentric ringed corridors, each ring's one doorway in a different place, spiralling into a central chamber with glowing pods and the final boss (ranged + slam, tankiest of the three)
- [ ] Beating each map's boss and reaching its exit unlocks the next map and shows the Map Complete screen with the new enemies and upgrades
- [ ] `#map=desertHighway` (and `industrialCity`, `frozenForest`, `quarantineLab`) load directly in Sandbox for a quick look without playing through the story

## M6 – HUD, hit feedback, audio, polish (in progress: G1-G3, H1-H5, I1/I2/I9, J13, I3/I5 partial)

- [ ] The old text HUD is gone: a graphical speed readout, HP/fuel bars (flash red near empty), coins/kills counters that pulse when they change, and a combo badge when chained kills reach x2+
- [ ] Equip each weapon in turn: the machine gun shows a heat bar that reads OVERHEATED when full, the shotgun/rockets show a magazine count and a reload timer, the flamethrower shows FIRING while held
- [ ] Buy Nitro: a nitro bar appears next to the other readouts and turns gold while boosting
- [ ] Story objectives still list under the HUD, and the minimap keeps its own spot in the bottom-left
- [ ] Ram through a small cluster of zombies at speed: the camera visibly jitters, harder on a bigger hit; a run-over kill leaves a blood decal on the front of the car (toggle Low Gore in Settings and it stops)
- [ ] Ram through several zombies in the same instant: everything briefly runs in slow motion before ramping back to normal speed
- [ ] With sound on: the engine note rises with speed and jumps in pitch on Nitro, the handbrake slide has its own skid sound, every weapon has a distinct fire sound, nearby zombies groan (louder up close, silent once they're far enough away), each map has its own ambient drone, and menu buttons click/hover
- [ ] The Settings volume sliders (master/music/effects) and Low Gore toggle all do what they say, live, without needing a restart
- [ ] Turn on Show FPS (Settings): the corner readout now shows the live zombie count next to fps (H1); it stays smooth with a full horde on screen
- [ ] The build tag (bottom-right) now leads with a version number (`v0.6.0 · build #… · …`), confirming H4's versioned release build
- [ ] Fire any weapon: a brief flash appears at the roof turret's barrel on every shot (I9)
- [ ] Hold handbrake while moving fast: dark skid decals appear behind the rear wheels and fade out after a few seconds (I9)
- [ ] Drive fast in a straight line: small puffs appear behind the car and fade quickly; their colour matches the current map (tan on Desert Highway, white on Frozen Mountain Forest, grey on the greybox arena) (I9)
- [ ] Take repeated damage from zombies without repairing: the car body visibly tints darker and picks up dent decals in two stages (dented, then wrecked) as HP drops; repairing in the garage restores the clean look (I3)
- [ ] Look at a horde of the same zombie rank: individual zombies show slightly different shades rather than being identical clones, and visibly bob while walking and lunge forward when attacking (I5)
- [ ] Main menu → Credits: a real panel listing Team, Tools and Asset Licenses (not the old one-line blurb); Back returns to the main menu (J13)

## M7 – Car Customization & Combat Expansion (L1-L8, O1, M1-M5, N1-N2)

- [ ] Garage → Customize tab: a "Paint" section lists 7 colour swatches; Stock Red shows "Equipped" and can't be bought again
- [ ] Buy a colour you can afford: the button becomes "Equipped", its card gets a gold border, and the car turntable recolours immediately
- [ ] Buying a colour you can't afford shows "Need N more coins" and does nothing when clicked
- [ ] After owning two or more colours, switching between them (via their "Select" button) recolours the car without spending more coins
- [ ] DRIVE with a purchased colour equipped: the car is the new colour in gameplay too, not just in the garage
- [ ] Take damage with a custom colour equipped: the body still tints darker through dented/wrecked (I3) on top of the new paint, and repairing restores the _painted_ colour, not the original stock red
- [ ] DRIVE toward a zombie with a roof gun equipped and never touch Fire: the gun opens up on its own once the zombie is in range/cone, exactly as if Fire were held
- [ ] The flamethrower still requires holding Fire - it doesn't autoshoot
- [ ] Garage → Customize tab: a "Bumper" section lists Stock/Chrome Bar/Brush Guard; buying and equipping each one visibly changes the shape mounted at the car's front, not just its colour
- [ ] Garage → Customize tab: a "Driver" section lists 5 outfit colours; a small figure is visible sitting in the car's cabin through the (now semi-transparent) windshield, and buying/equipping a colour recolours it immediately
- [ ] DRIVE with a non-stock bumper and driver colour equipped: both are still visible in gameplay, not just in the garage
- [ ] Garage → Customize tab: a "Windows" section lists Stock Tint/Clear Glass/Dark Tint/Mirrored; equipping Clear Glass makes the driver figure much easier to see, and Dark Tint makes it much harder, through the same cabin glass
- [ ] Garage → Customize tab: a "Doors" section lists Stock/Paneled Trim/Chrome Trim; equipping a non-stock style adds a mirrored trim piece to both sides of the car
- [ ] DRIVE with a non-stock window tint and door trim equipped: both are still visible in gameplay, not just in the garage
- [ ] Garage → Customize tab: a "Decals" section lists None/Flames/Racing Stripes/Skull/Number Roundel; equipping a non-stock one adds a mirrored decal to both flanks of the car
- [ ] Equip a decal alongside a non-stock paint colour: both show at once - the decal never gets overwritten or hidden by paint (L2)
- [ ] Garage → Customize tab: a "Tires" section lists Stock/Chrome Rim/Whitewall/Off-Road Tread; equipping a non-stock style visibly changes the wheels (a rim disc, a white ring, or tread lugs)
- [ ] DRIVE with a non-stock tire style equipped: it's still visible on the wheels in gameplay, not just in the garage, and follows each wheel's steering/spin correctly
- [ ] Garage → Melee tab: a "Spike Cluster" card lists 3 tiers; buying tier 1 auto-equips it into the front slot (same slot as Ram/Flamethrower) and a spike cluster appears at the front of the car
- [ ] DRIVE and bump into a zombie with Spikes equipped, at low/no speed: the zombie still takes damage and gets knocked back, unlike a bare run-over which needs real speed to hurt anything
- [ ] Buy the Front Ram or Flamethrower after owning Spikes: it takes over the front slot and the spike cluster disappears (only one front-mounted weapon shows at a time)
- [ ] Garage → Melee tab: a "Circular Saw" card lists 3 tiers; buying it equips it into the front slot and a spinning blade appears at the front of the car, spinning continuously
- [ ] DRIVE and stay in contact with a zombie with the Saw equipped (nudge it and hold position): it keeps taking damage the whole time it's touching, not just once, with a grinding sound and a spark flash while it's actually touching
- [ ] Back off from the zombie with the Saw still equipped: the grinding sound stops but the blade keeps spinning (it's still equipped, just not touching anything)
- [ ] Garage → Melee tab: a "Swinging Hammer" card lists 3 tiers; buying it equips it into the front slot and a hammer arm appears at the front, at rest
- [ ] DRIVE near a horde with the Hammer equipped and just wait (no need to touch a zombie): it periodically swings on its own cooldown, damaging and knocking back everything within its radius, with the arm playing a one-shot swing animation and a flash/thump when it connects
- [ ] Only one of Ram/Flamethrower/Spikes/Saw/Hammer shows or works at a time - buying a new one always takes over the front slot from whichever was equipped before
- [ ] Garage → Weapons tab: buy and equip Machine Gun - the roof turret shows a single long barrel
- [ ] Switch to Shotgun: the roof turret's barrel changes to a short, stubby double barrel, not the machine gun's single barrel
- [ ] Switch to Rockets: the roof turret's barrel changes to a 2x2 cluster of launch tubes
- [ ] DRIVE with each roof weapon equipped in turn: the turret's shape in gameplay matches whichever one was equipped in the garage, not just in the garage turntable
- [ ] Garage → Engine tab, before owning the Engine upgrade: no tuning slider is shown
- [ ] Buy Engine tier 1: an "Engine Tuning" slider appears above the Engine card, starting "Balanced" in the middle
- [ ] Drag the slider toward "Top Speed": a live readout updates (e.g. "60% toward Top Speed"); releasing it updates the Engine card's own top speed/acceleration preview - top speed goes up, acceleration goes down from the balanced values
- [ ] Drag the slider toward "Acceleration" instead: the opposite trade - acceleration goes up, top speed goes down
- [ ] Adjusting the slider costs no coins and can be changed as many times as you like
- [ ] DRIVE with the slider tuned toward Top Speed vs. toward Acceleration: the car's actual handling changes to match (noticeably higher top speed, or noticeably snappier off the line)
- [ ] Leave the Garage and come back (or reload the page): the tuning slider keeps whatever position it was left at
- [ ] Garage → Engine tab: three more cards appear alongside the tier-ladder Engine card - V8 Engine, Turbo Engine, Electric Motor
- [ ] Buy V8 Engine: it auto-equips (same as a weapon's first purchase) and the car's exhaust changes from the single stock pipe to a dual chrome pipe at the rear
- [ ] Buy Turbo Engine too: it's owned but does NOT take over - the V8 stays equipped and its dual exhaust stays showing (the slot was already taken)
- [ ] Equip Turbo Engine explicitly: the exhaust changes to a single wide pipe, and the V8's stat bonuses stop applying
- [ ] Buy and equip Electric Motor: the exhaust disappears entirely (no pipe at all)
- [ ] DRIVE with each engine type equipped in turn: the exhaust in gameplay matches whichever type was equipped in the garage, not just in the garage turntable
- [ ] Buy/upgrade the regular Engine tier ladder (D3/N1) while an engine type is equipped: both bonuses stack - top speed/acceleration are higher than either one alone
- [ ] With the V8 equipped, ram a zombie or wall: the car feels heavier/punchier than stock; with Electric equipped, it feels lighter - the `acceleration` stat itself (how fast 0-to-top-speed feels) stays consistent with what the Engine Tuning slider and tier cards show, regardless of which type is equipped

## M8 – Vehicle & Garage Overhaul (done: P1, Q1, R1, R2, R3, R4)

- [ ] Corner hard, clip a curb, or take a glancing zombie hit: the car leans but no longer
      tips onto its side/roof from ordinary driving
- [ ] Ram straight into a Tank at speed, or launch off a jump ramp badly: the car can still
      flip - the stability assist raises the threshold, it doesn't remove flipping entirely
- [ ] Flip it anyway (drive into a ramp edge sideways hard enough) and press R: it still
      rights itself exactly as before
- [ ] Main menu shows a "Slaughtermode" button alongside Story Mode and Sandbox; picking it
      goes straight to the Garage (one click, no detour back to the main menu)
- [ ] The Garage works exactly as normal in Slaughtermode - buy/equip anything, real coins
- [ ] DRIVE: a single long, narrow, straight road walled in on both sides, no side routes,
      packed with zombies almost immediately - the HUD's zombie count sits near the map's
      full budget (200) from the start
- [ ] Kill your way down the road: coins/kills tick up exactly like any other mode
- [ ] Wreck or run dry partway down: the usual WRECKED/OUT OF GAS results screen, banking
      only the normal share of that run's coins (same as any other mode)
- [ ] Reach the far end (or use `#debug`'s `tp 0 1085` to jump there): a "ROAD CLEARED"
      results screen instead, banking every coin from the run - not the reduced wreck share
- [ ] Quit to the main menu and pick "Continue": it resumes Slaughtermode directly (same as
      Sandbox's own Continue), not Sandbox's last map
- [ ] Open the Garage: your car sits on its build pad inside a simple walled room, and a
      standing player figure is visible nearby instead of the old fixed camera orbit
- [ ] Walk the avatar with WASD (or the left stick): the camera follows behind it, turning to
      face the direction you're walking
- [ ] Walk into any of the four walls: the avatar stops right at it - it never clips through
- [ ] The Garage's buy/equip UI on the left still works exactly as before while walking around
- [ ] Walk up to a pedestal along either wall: a prompt appears at the bottom of the screen
      naming the part and, if you don't own it yet, its price
- [ ] Press E on an unowned pedestal with enough coins: it's bought (coins deducted, matching
      the menu's own price) and the prompt now offers to pick it up
- [ ] Press E on an unowned pedestal without enough coins: nothing is bought, the prompt stays
- [ ] Press E again to pick the part up: a small marker appears above the avatar's head and the
      prompt now offers to drop it
- [ ] Walk elsewhere and press E: the part drops at your feet, appears as a small prop on the
      floor, and can be walked up to and picked back up the same way
- [ ] While carrying a part, walking up to a different pedestal and pressing E always drops
      the carried part instead of buying/picking up the other one - only one at a time
- [ ] Carry a bought part toward the car: a faint ring is visible at every attachment point,
      and the one matching your carried part's own category turns bright green as you approach
- [ ] Press E in a bright-green zone: the part snaps onto the car (prompt confirms it, and for
      a weapon, the roof/front weapon model visibly appears)
- [ ] Try this for a few different categories (a wheel/tires, armor, a roof weapon, engine):
      every one of them lights up some zone on the car - if a carried part never lights up
      anything anywhere, that's a bug
- [ ] Carry a part to a zone that's already occupied by something else: it does not light up -
      walk elsewhere and it can still be dropped normally
- [ ] Press E while standing at an occupied (green-eligible-for-pickup) zone with empty hands:
      the part there is picked back up and can be carried, dropped, or snapped somewhere else
- [ ] A snapped weapon's stats apply exactly as they did through the old menu (check HP/speed/
      etc. before and after against the Garage's own stat display)
- [ ] Buy or `unlockall` the machine gun (roof by default): carry it up to the front mount and
      the rear mount (behind the car) - both light up green, since it's valid at either
- [ ] Snap the machine gun onto the rear mount and drive: a turret model is visible on the
      back of the car and it fires backward at zombies chasing from behind, independently of
      whatever's on the roof/front
- [ ] With a different weapon already on the front mount, carry the machine gun up to front
      and press E: the prompt says "Swap in ... (bumps ...)" - pressing E puts the machine gun
      on front and the old weapon ends up in your hands, ready to carry, drop, or snap
      elsewhere
- [ ] Every other part (anything besides the machine gun) still only has the one zone it had
      before - no unexpected multi-zone prompts anywhere else

## M9 – Art pass & bug bash (in progress: S1-S7 - art epic complete; T1-T3 done)

- [ ] Spawn a full-density horde (Sandbox at 100% zombie density, or `#debug`'s `spawn <rank> N`)
      and drive past it: each rank's silhouette is distinguishable from the others at range, not
      just by colour - the boss towers over a walker, tanks read as squat and wide, runners as
      leaner and taller
- [ ] The horde still renders as two draw calls total (check the debug HUD's zombie count moves
      normally with no fps cliff as the horde grows toward the map's budget)
- [ ] Run over/shoot a zombie of any rank: it dies and ragdolls/despawns exactly as before - the
      new geometry doesn't change hit detection or death behaviour (the physics capsule size is
      unchanged regardless of rank)
- [ ] Zombies still walk/attack with the existing bob and lunge motion (I5) - the new geometry
      doesn't look stiff or broken mid-animation
- [ ] Drive the car in Sandbox or Story mode: the body reads as a proper low-poly car (a rear
      spoiler visible from behind) rather than a plain box, and the wheels show a visible hub cap
- [ ] Open the Garage and cycle through paint colours, bumper/door/decal/tire styles, and engine
      types: every cosmetic option still swaps in cleanly on the new body/wheel model, exactly as
      before
- [ ] Take damage until the car reaches the dented and wrecked visual stages: the tint change and
      dent decals still apply correctly to the new body model
- [ ] Equip a roof and a front weapon: both still mount and aim correctly on the new body - no
      visual clipping or misalignment from the model change
- [ ] Enter the Garage (walk-up avatar mode): the room shows dark baseboard trim along the base
      of the walls, a couple of ceiling light fixtures, a painted parking-bay outline on the
      floor around the build pad, and a garage-door panel with horizontal grooves on the back
      wall - it reads as a garage, not a bare grey box
- [ ] Walk the avatar around the room (WASD): movement, the bounds clamp, and the camera follow
      all behave exactly as before R1's own testing - none of the new dressing blocks movement or
      changes the walkable area
- [ ] Drive Story Mode's Suburbs, Desert Highway, Frozen Forest, and Quarantine Lab maps: each is
      visually distinguishable from the others at a glance - Desert Highway's gas stations now
      have a roof overhang and signage, Frozen Forest's boulders have a snow cap, Suburbs' parked
      cars have a cabin bump
- [ ] Industrial City: warehouses show a roof cap and vent, crates a banding strap, gates a lamp -
      **known pre-existing issue**, unrelated to this art pass: the story map's spawn point sits
      inside a warehouse's own collider, so the car can't move from the start of a run there yet
      (see the follow-up ticket); the props themselves are still verifiable by looking around at
      spawn, or via `#debug`'s `tp` cheat once clear of the stuck spawn
- [ ] Fire any hitscan weapon (machine gun/shotgun): the muzzle flash now shows a brief
      expanding ring alongside the core flash, and reads as a sharper pop than before
- [ ] Fire a rocket and let it hit something: the blast now shows a ground-hugging shockwave
      ring racing outward alongside the fireball
- [ ] Equip and fire the flamethrower: the jet now shows a brighter inner core and flickers more
      (both the outer cone and inner core pulse slightly each frame, on top of the existing jitter)
- [ ] Handbrake-turn or power-slide: skid marks vary slightly in tint and width mark to mark,
      instead of every mark being an identical stamp
- [ ] Drive fast enough to kick up the dust/snow trail: puffs now vary in size/offset and grow
      with an eased "poof" rather than a flat linear expansion
- [ ] Run over several zombies with Low Gore off: blood splatters on the car vary in size and
      aspect ratio instead of all being the same square decal
- [ ] None of the above changes any gameplay value - kill/hit behaviour, damage, and weapon
      timing windows are unaffected (the existing balance/combat test suites cover this)
- [ ] Drive at night with graphics quality set to High or Medium (Settings): bright light
      sources (headlights, muzzle flashes, fire) show a soft bloom glow, and the frame edges
      are subtly darker/vignetted compared to the centre
- [ ] Drive in daylight with graphics quality High: same subtle vignette/colour-grade look,
      just without much to bloom
- [ ] Switch graphics quality to Low (Settings, no restart needed): the bloom/vignette
      disappear immediately and the scene matches today's plain look exactly - the toggle takes
      effect the moment you leave Settings, not on the next map load
- [ ] Walk up to a part station in the Garage's walk-up avatar mode: the E-prompt now shows the
      part's own icon next to the key-cap, not just plain text
- [ ] Open the Pause menu: all six buttons (Resume, Restart run, Settings, Controls, Return to
      Garage, Quit to Main Menu) show an icon, matching the same icons the Main Menu's
      equivalent buttons already use
- [ ] Open Settings: graphics quality, draw distance, the three volume sliders, camera
      sensitivity/invert, low gore, and show fps all show a leading icon, and the "Controls"
      heading has one too
- [ ] Open Credits: Team, Tools, and Asset Licenses each show a heading icon
- [ ] Finish a run and reach the Results screen: every row has an icon, including the per-rank
      kill breakdown rows and the Time row (previously plain text)

- [ ] Roll/flip the car onto its side against a wall or rock (e.g. a hard ram hit, or landing
      badly off a jump ramp) rather than fully upside down: pressing R (flip reset) now rights it
      even though it never passed the old "fully upside down" threshold - it no longer gets stuck
      unable to drive or reset
- [ ] Flip reset still does nothing while the car is upright or only mildly tilted (a normal hard
      turn or curb clip) - P1's own stability assist still handles those on its own
- [ ] Stack nitro with a top-tier engine and hold throttle: speed still caps smoothly at the
      combined top speed, no jitter or runaway velocity
- [ ] Drive through a cluster of several zombies at once: each one is hit and damaged
      independently in the same step, no missed or double-counted impacts
- [ ] Play Slaughtermode (The Gutter) for a stretch and watch the horde as it spawns ahead:
      every zombie lands on the drivable strip, none appear stranded inside or beyond the
      flanking walls
- [ ] Let a zombie notice the car, then drive away far enough to break line of sight/range: it
      gives up and returns to idle/wander rather than chasing forever
- [ ] Run over a zombie, then keep driving through where its corpse landed: the corpse can still
      be nudged by the car for a few seconds (ragdoll), but never damages the car or gets
      re-killed for coins/score
- [ ] Earn coins (kills/distance/pickups), reload the page: the balance persists exactly, never
      shows "NaN" or resets unexpectedly
- [ ] Buy/equip garage parts, reload the page: ownership and loadout persist exactly
- [ ] Open the Story Mode save-slot picker with no saves yet: shows "No saves yet - start a new
      game" and a working "+ New Game" button, no console errors

### Known quirks (non-blocking)

- Holding throttle in a dead-straight line for many seconds can drift the car slightly off a
  perfectly straight path with no steering input - a minor artifact of the suspension/tire
  physics settling asymmetrically, not a bug introduced by any milestone's own work. Noticeable
  mainly in scripted/headless testing (holding W for 5+ seconds unattended); a human driver
  correcting with the stick never notices it.
