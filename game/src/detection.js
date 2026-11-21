// Neon Rooftop Infiltration — the vision cone and the detection meter.
// A drone sees you when you stand inside its cone with a clear line of
// sight. The meter fills faster up close, slower when you crouch or sneak,
// and drains when you break contact — so a near miss is recoverable.

import { CONE_LENGTH, CONE_HALF, CONE_DIP, clamp } from './config.js';
import { playerCenter } from './level.js';

export function droneEye(drone) {
  return { x: drone.x, y: drone.y + 6 };
}

// Returns { seen, rate, hidden, dist }: rate is meter points per second.
export function senseDrone(drone, player, level) {
  const eye = droneEye(drone);
  const c = playerCenter(player);
  const dx = c.x - eye.x;
  const dy = c.y - eye.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_LENGTH) return { seen: false, rate: 0, hidden: false, dist };
  const ax = drone.dir * Math.cos(CONE_DIP);
  const ay = Math.sin(CONE_DIP);
  const dot = clamp((dx * ax + dy * ay) / dist, -1, 1);
  const angle = Math.acos(dot);
  if (angle > CONE_HALF) return { seen: false, rate: 0, hidden: false, dist };
  if (level.coverHiding(player)) return { seen: false, rate: 0, hidden: true, dist };
  if (level.losBlocked(eye.x, eye.y, c.x, c.y)) return { seen: false, rate: 0, hidden: false, dist };
  const proximity = 1 - dist / CONE_LENGTH;
  let rate = 20 + 55 * proximity;
  if (player.crouch) rate *= 0.45;
  if (player.sneak) rate *= 0.6;
  if (!player.onGround) rate *= 1.4;
  return { seen: true, rate, hidden: false, dist };
}

// Cone polygon corners (world space) for the renderer.
export function conePolygon(drone) {
  const eye = droneEye(drone);
  const axis = drone.dir > 0 ? CONE_DIP : Math.PI - CONE_DIP;
  const a1 = axis - CONE_HALF;
  const a2 = axis + CONE_HALF;
  return {
    eye,
    p1: { x: eye.x + Math.cos(a1) * CONE_LENGTH, y: eye.y + Math.sin(a1) * CONE_LENGTH },
    p2: { x: eye.x + Math.cos(a2) * CONE_LENGTH, y: eye.y + Math.sin(a2) * CONE_LENGTH },
  };
}

export function updateMeter(meter, senses, dt) {
  let rise = 0;
  let anySeen = false;
  let nearest = Infinity;
  for (const s of senses) {
    nearest = Math.min(nearest, s.dist);
    if (s.seen) { anySeen = true; rise = Math.max(rise, s.rate); }
  }
  if (anySeen) meter += rise * dt;
  else meter -= 30 * dt;
  return { meter: clamp(meter, 0, 100), anySeen, nearest };
}
