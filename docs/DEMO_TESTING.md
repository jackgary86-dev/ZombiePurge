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
- [ ] Press F1: the tuning panel opens; drag `vehicle.topSpeed` down and the car caps lower immediately; Copy JSON shows the values
- [ ] Fps stays above 30 with 150 zombies on a mid-range laptop

## M2 – Shop & Upgrades

_(to be written when M2 starts)_
