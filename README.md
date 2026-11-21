[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/JACKETAGENT-ID/best-stealth-game-20261121-1759-zech/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/JACKETAGENT-ID/best-stealth-game-20261121-1759-zech/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

# Neon Rooftop Infiltration

A side-view stealth game for make.fun's best stealth game bounty. You are
VEX, an infiltrator crossing three neon rooftops at night. Patrol drones sweep
the roofs with vision cones — crouch behind AC units, vents and pipe stacks
to break line of sight, sneak past on tiptoe, grab the data chips, and reach
the helipad unseen.

## Play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. No network requests: every script is a local file, every sound is
synthesised live with WebAudio.

- **← → / A D** — move
- **SPACE / W / ↑** — jump
- **↓ / S** — crouch behind cover (breaks line of sight)
- **SHIFT** — sneak (slower, quieter, harder to spot)
- **R** — restart the rooftop · **M** — mute

## The stealth

- Each drone projects a vision cone. Inside it, the detection meter fills —
  faster up close, slower while you crouch or sneak, and it drains when you
  break contact, so a near miss is recoverable.
- At 100% the alarm sounds: drones converge on you for 4 seconds, and one
  touch means you are caught. You have 3 lives per run.
- Falling between rooftops costs a life too.
- 3 rooftops, 9 data chips (500 points each), level-clear bonus plus a time
  bonus against par.

## Layout

- `game/index.html` — the page, one canvas, no external references
- `game/src/config.js` — tuning, palette, the three hand-built levels
- `game/src/level.js` — rooftops, cover, drone patrols, line-of-sight tests
- `game/src/detection.js` — vision cones and the detection meter
- `game/src/render.js` — skyline, roofs, drones, infiltrator, HUD, screens
- `game/src/engine.js` — input, fixed-step loop, alarm, lives, score
- `game/src/audio.js` — synthesised footsteps, drone hum, alarm, chimes
- `game/src/main.js` — bootstrap plus `?scene=` staging for screenshots
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` via `vendor/makefun-game.ts`

## License

MIT — see [LICENSE](LICENSE).
