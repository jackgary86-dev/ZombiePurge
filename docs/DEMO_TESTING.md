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

## M6 – HUD, hit feedback, audio (in progress: G1-G3)

- [ ] The old text HUD is gone: a graphical speed readout, HP/fuel bars (flash red near empty), coins/kills counters that pulse when they change, and a combo badge when chained kills reach x2+
- [ ] Equip each weapon in turn: the machine gun shows a heat bar that reads OVERHEATED when full, the shotgun/rockets show a magazine count and a reload timer, the flamethrower shows FIRING while held
- [ ] Buy Nitro: a nitro bar appears next to the other readouts and turns gold while boosting
- [ ] Story objectives still list under the HUD, and the minimap keeps its own spot in the bottom-left
- [ ] Ram through a small cluster of zombies at speed: the camera visibly jitters, harder on a bigger hit; a run-over kill leaves a blood decal on the front of the car (toggle Low Gore in Settings and it stops)
- [ ] Ram through several zombies in the same instant: everything briefly runs in slow motion before ramping back to normal speed
- [ ] With sound on: the engine note rises with speed and jumps in pitch on Nitro, the handbrake slide has its own skid sound, every weapon has a distinct fire sound, nearby zombies groan (louder up close, silent once they're far enough away), each map has its own ambient drone, and menu buttons click/hover
- [ ] The Settings volume sliders (master/music/effects) and Low Gore toggle all do what they say, live, without needing a restart
