// Neon Rooftop Infiltration — tuning, palette and the three hand-built levels.
// Every rooftop, vent, drone patrol and data chip below is placed by hand;
// nothing in the levels is copied from another game.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const WORLD_H = 720;
export const GRAVITY = 2300;
export const MOVE_SPEED = 250;
export const SNEAK_SPEED = 118;
export const JUMP_VEL = -830;
export const PLAYER_W = 26;
export const PLAYER_H = 46;
export const PLAYER_CROUCH_H = 28;
export const CONE_LENGTH = 300;
export const CONE_HALF = 0.48;
export const CONE_DIP = 0.61; // cone axis, radians below the horizontal
export const MAX_LIVES = 3;

export const PALETTE = {
  skyTop: '#070b1a',
  skyMid: '#0d1530',
  skyLow: '#1a1440',
  roof: '#12182b',
  roofEdge: '#22e6ff',
  roofEdge2: '#ff2ea6',
  facade: '#0a0f20',
  windowLit: '#ffd166',
  windowDark: '#1b2745',
  acBody: '#232f4d',
  acDark: '#161f36',
  ventBody: '#2a2140',
  pipeBody: '#3a2f5e',
  droneBody: '#c8d4e8',
  droneEye: '#ff3355',
  cone: '255, 214, 90',
  playerCloak: '#1de9b6',
  playerDark: '#0b3d31',
  visor: '#7df9ff',
  chip: '#22e6ff',
  helipad: '#a6ff3e',
  exitGlow: '#a6ff3e',
  text: '#e8f4ff',
  dim: '#8fa3c8',
  alarm: '#ff3355',
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }

// One level: rooftops you run across, cover you crouch behind, drones whose
// vision cones you must slip past, chips to grab, and a helipad to reach.
export const LEVELS = [
  {
    name: 'ROOFTOP 07',
    sub: 'Meridian Spire — first light',
    width: 2600,
    parTime: 75,
    playerStart: { x: 60, y: 620 },
    platforms: [
      { x: 0, y: 620, w: 520, h: 100 },
      { x: 600, y: 620, w: 420, h: 100 },
      { x: 1100, y: 540, w: 380, h: 180 },
      { x: 1560, y: 620, w: 420, h: 100 },
      { x: 2060, y: 560, w: 540, h: 160 },
    ],
    covers: [
      { x: 300, y: 556, w: 64, h: 64, kind: 'ac' },
      { x: 760, y: 566, w: 90, h: 54, kind: 'vent' },
      { x: 1240, y: 476, w: 64, h: 64, kind: 'ac' },
      { x: 1700, y: 566, w: 90, h: 54, kind: 'vent' },
      { x: 2200, y: 496, w: 70, h: 64, kind: 'pipe' },
    ],
    drones: [
      { x: 700, y: 468, minX: 620, maxX: 1000, speed: 70 },
      { x: 1500, y: 468, minX: 1400, maxX: 1920, speed: 92 },
    ],
    chips: [
      { x: 430, y: 566 },
      { x: 1290, y: 478 },
      { x: 1900, y: 566 },
    ],
    exit: { x: 2400, y: 470, w: 130, h: 90 },
  },
  {
    name: 'ROOFTOP 12',
    sub: 'Kestrel Tower — crosswinds',
    width: 2800,
    parTime: 90,
    playerStart: { x: 60, y: 620 },
    platforms: [
      { x: 0, y: 620, w: 460, h: 100 },
      { x: 540, y: 560, w: 300, h: 160 },
      { x: 920, y: 620, w: 380, h: 100 },
      { x: 1380, y: 520, w: 320, h: 200 },
      { x: 1780, y: 620, w: 400, h: 100 },
      { x: 2260, y: 560, w: 540, h: 160 },
    ],
    covers: [
      { x: 240, y: 556, w: 64, h: 64, kind: 'ac' },
      { x: 640, y: 506, w: 90, h: 54, kind: 'vent' },
      { x: 1080, y: 566, w: 64, h: 64, kind: 'ac' },
      { x: 1480, y: 466, w: 90, h: 54, kind: 'vent' },
      { x: 1960, y: 556, w: 64, h: 64, kind: 'ac' },
      { x: 2400, y: 496, w: 70, h: 64, kind: 'pipe' },
    ],
    drones: [
      { x: 620, y: 420, minX: 520, maxX: 900, speed: 95 },
      { x: 1200, y: 470, minX: 1080, maxX: 1560, speed: 110 },
      { x: 1900, y: 468, minX: 1760, maxX: 2200, speed: 85 },
    ],
    chips: [
      { x: 680, y: 500 },
      { x: 1520, y: 462 },
      { x: 2100, y: 556 },
    ],
    exit: { x: 2600, y: 470, w: 130, h: 90 },
  },
  {
    name: 'ROOFTOP 21',
    sub: 'Helipad Crown — the last roof',
    width: 3000,
    parTime: 105,
    playerStart: { x: 60, y: 620 },
    platforms: [
      { x: 0, y: 620, w: 420, h: 100 },
      { x: 500, y: 540, w: 300, h: 180 },
      { x: 880, y: 620, w: 360, h: 100 },
      { x: 1320, y: 500, w: 300, h: 220 },
      { x: 1700, y: 620, w: 360, h: 100 },
      { x: 2140, y: 540, w: 320, h: 180 },
      { x: 2540, y: 560, w: 460, h: 160 },
    ],
    covers: [
      { x: 200, y: 556, w: 64, h: 64, kind: 'ac' },
      { x: 600, y: 486, w: 90, h: 54, kind: 'vent' },
      { x: 1000, y: 566, w: 64, h: 64, kind: 'ac' },
      { x: 1420, y: 446, w: 90, h: 54, kind: 'vent' },
      { x: 1820, y: 566, w: 70, h: 64, kind: 'pipe' },
      { x: 2260, y: 486, w: 64, h: 64, kind: 'ac' },
      { x: 2640, y: 496, w: 70, h: 64, kind: 'pipe' },
    ],
    drones: [
      { x: 560, y: 400, minX: 480, maxX: 860, speed: 115 },
      { x: 1100, y: 470, minX: 980, maxX: 1380, speed: 100 },
      { x: 1600, y: 400, minX: 1480, maxX: 1900, speed: 125 },
      { x: 2200, y: 420, minX: 2080, maxX: 2480, speed: 140 },
    ],
    chips: [
      { x: 640, y: 480 },
      { x: 1460, y: 440 },
      { x: 2300, y: 480 },
    ],
    exit: { x: 2800, y: 470, w: 130, h: 90 },
  },
];
