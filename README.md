# Midnight Vault

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/adzinsyariif/midnight-vault/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/adzinsyariif/midnight-vault/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down bank heist in vanilla JavaScript and canvas — no libraries, no build step, no network. You are the thief inside the Meridian Trust after hours: cross the Lobby, the Counting House and the Grand Vault, pocket enough loot in each room to open its exit, then stand exposed at the great vault's wheel and crack it while every guard and camera in the bank watches the floor. Guards patrol waypoint routes and sweep their flashlight cones; wall cameras swing their own cones; desks, pillars, crates and planters block line of sight, so cover is real. Being seen fills the ALARM meter — fill it and you are busted, the room resets, and the screen names who spotted you. Once the vault cracks, the alarm locks high and the guards hurry: get back to the getaway van to bank the night. Your score is the take minus what your tools cost, plus a time bonus, and the rank runs from GHOST (never seen) down to LOUD.

## How to play

- **Move:** WASD or the arrow keys.
- **Coin toss:** click any floor point — guards within earshot leave their patrol to investigate the ping. Each coin costs $50 from the score. You carry 3.
- **EMP pulse:** press **E** — every camera in the room goes dark for 6 seconds. Each pulse costs $150. You carry 2.
- **Pause:** P or Escape. **Mute:** M.
- Each room's exit door shows its loot quota; it opens green when the quota is met. In the Grand Vault there is no quota — stand at the vault wheel until the crack ring fills, then reach the van.

## Run it

```sh
node serve.ts          # serves game/ at http://localhost:8080
```

Node 22 or later, nothing to install. Open the page in a desktop browser and press Enter to go in.

## Layout

- `game/index.html` — the page shell and canvas.
- `game/src/config.js` — every tuning number, colour and event flag.
- `game/src/world.js` — the three room layouts and the simulation step (alarm, scoring, progression).
- `game/src/vision.js` — vision cones and line of sight against cover.
- `game/src/guards.js` — patrols, waypoint sweeps, coin investigation.
- `game/src/cameras.js` — sweeping wall cameras and EMP disable.
- `game/src/player.js` — the thief: movement, loot, the vault crack, the doors.
- `game/src/render.js` — floors, furniture, cones, sprites, darkness, HUD and panels.
- `game/src/input.js` — keyboard and mouse. `game/src/audio.js` — a small WebAudio synth.
- `game/src/shots.js` — the deterministic screenshot scenes (`?shot=cover|vault|tools|getaway&seed=1`).
- `main.ts` — the hand-in: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.
