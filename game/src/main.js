// Neon Rooftop Infiltration — bootstrap: build the game, stage a scene when
// the URL asks for one, and start the loop. The scene parameter exists so
// the game's own code can be photographed mid-play: ?scene=cover|patrol|
// alarm|title renders a fixed, deterministic moment of the real game.

import { Game } from './engine.js';
import { setCrouch } from './level.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// Deterministic staged moments, used for the entry's screenshots. Each one
// sets the exact world state (level, player pose, drone positions, meter)
// and then freezes the clock, so the same URL always renders the same frame.
function applyScene(scene) {
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') || 1);
  void seed;
  if (scene === 'cover') {
    // Near the helipad: crouched behind the pipe, a drone sweeping in,
    // the exit glowing ahead. Shows level, cone, cover and exit at once.
    game.startLevel(0);
    game.time = 12.5;
    const p = game.player;
    p.x = 2190; p.y = 560 - p.h; p.dir = 1;
    setCrouch(p, true);
    game.level.drones[1].x = 2080;
    game.level.drones[1].dir = 1;
    game.meter = 42;
    game.cameraX = 1320;
    game.level.chips[2].taken = true;
    game.score = 500;
  } else if (scene === 'patrol') {
    // Opening roof: crouched behind the AC unit while a drone's cone sweeps
    // the gap ahead. The classic stealth beat of this game.
    game.startLevel(0);
    game.time = 8.0;
    const p = game.player;
    p.x = 312; p.y = 620 - p.h; p.dir = 1;
    setCrouch(p, true);
    game.level.drones[0].x = 830;
    game.level.drones[0].dir = -1;
    game.meter = 38;
    game.cameraX = 0;
  } else if (scene === 'alarm') {
    // Second rooftop mid-alarm: meter nearly full, drones converging.
    game.startLevel(1);
    game.time = 20.0;
    const p = game.player;
    p.x = 1500; p.y = 520 - p.h; p.dir = -1; // standing on the 520 roof
    game.level.drones[1].x = 1420;
    game.level.drones[1].dir = 1;
    game.level.drones[2].x = 1760;
    game.level.drones[2].dir = -1;
    game.meter = 88;
    game.alarmT = 2.5;
    game.lives = 2;
    game.score = 1500;
    game.level.chips[0].taken = true;
    game.cameraX = 900;
  } else if (scene === 'title') {
    game.state = 'title';
    game.time = 4.0;
    game.level.drones[0].x = 760;
    game.cameraX = 0;
  }
}

const scene = new URLSearchParams(location.search).get('scene');
if (scene) {
  applyScene(scene);
  if (scene !== 'title') game.staged = true;
}
game.start();
