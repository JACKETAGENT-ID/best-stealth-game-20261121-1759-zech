// Neon Rooftop Infiltration — the level: rooftops, cover, patrol drones and
// the line-of-sight tests that decide whether a drone can actually see you.

import { PLAYER_W, PLAYER_H, PLAYER_CROUCH_H, clamp } from './config.js';

export class Level {
  constructor(def) {
    this.def = def;
    this.name = def.name;
    this.sub = def.sub;
    this.width = def.width;
    this.parTime = def.parTime;
    this.platforms = def.platforms.map((p) => ({ ...p }));
    this.covers = def.covers.map((c) => ({ ...c }));
    this.drones = def.drones.map((d) => ({
      x: d.x, y: d.y, baseY: d.y,
      minX: d.minX, maxX: d.maxX,
      speed: d.speed, dir: 1, bobPhase: d.x * 0.013,
    }));
    this.chips = def.chips.map((c) => ({ x: c.x, y: c.y, taken: false }));
    this.exit = { ...def.exit };
    this.playerStart = { ...def.playerStart };
  }

  reset() {
    this.drones = this.def.drones.map((d) => ({
      x: d.x, y: d.y, baseY: d.y,
      minX: d.minX, maxX: d.maxX,
      speed: d.speed, dir: 1, bobPhase: d.x * 0.013,
    }));
    this.chips = this.def.chips.map((c) => ({ x: c.x, y: c.y, taken: false }));
  }

  updateDrones(dt, time, alarm) {
    for (const d of this.drones) {
      const speed = d.speed * (alarm ? 1.7 : 1);
      if (alarm && this.alarmTargetX !== undefined) {
        // Alarmed drones steer toward the intruder, inside their patrol beat.
        const want = clamp(this.alarmTargetX, d.minX - 60, d.maxX + 60);
        const dx = want - d.x;
        if (Math.abs(dx) > 4) {
          d.dir = dx > 0 ? 1 : -1;
          d.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        }
      } else {
        d.x += d.dir * speed * dt;
        if (d.x >= d.maxX) { d.x = d.maxX; d.dir = -1; }
        if (d.x <= d.minX) { d.x = d.minX; d.dir = 1; }
      }
      d.y = d.baseY + Math.sin(time * 1.6 + d.bobPhase) * 10;
    }
  }

  // One-way rooftops: you land on a roof only while falling onto its top.
  landPlayer(p, prevBottom) {
    p.onGround = false;
    for (const plat of this.platforms) {
      if (p.vy < 0) continue;
      const feet = p.y + p.h;
      const overlapsX = p.x + p.w > plat.x + 2 && p.x < plat.x + plat.w - 2;
      if (overlapsX && prevBottom <= plat.y + 10 && feet >= plat.y && feet <= plat.y + 26) {
        p.y = plat.y - p.h;
        p.vy = 0;
        p.onGround = true;
        return plat;
      }
    }
    return null;
  }

  groundTopAt(x) {
    let top = Infinity;
    for (const plat of this.platforms) {
      if (x >= plat.x && x <= plat.x + plat.w && plat.y < top) top = plat.y;
    }
    return top;
  }

  // True when the segment eye->target crosses any cover box (AC unit, vent,
  // pipe). Cover only hides you when something solid stands between you.
  losBlocked(x1, y1, x2, y2) {
    for (const c of this.covers) {
      if (segmentHitsRect(x1, y1, x2, y2, c)) return true;
    }
    return false;
  }

  // Crouching flat behind a unit on the same roof breaks line of sight even
  // when the drone is high: the box stands between its eye and your visor.
  coverHiding(p) {
    if (!p.crouch) return false;
    const cx = p.x + p.w / 2;
    const feet = p.y + p.h;
    for (const c of this.covers) {
      if (cx >= c.x - 6 && cx <= c.x + c.w + 6 && Math.abs(feet - (c.y + c.h)) < 48) {
        return c;
      }
    }
    return null;
  }

  nearestDrone(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const d of this.drones) {
      const dist = Math.hypot(d.x - x, d.y - y);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return { drone: best, dist: bestD };
  }
}

export function segmentHitsRect(x1, y1, x2, y2, r) {
  // Slab test: does the segment cross the rectangle's x/y slabs together?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function makePlayer(start) {
  return {
    x: start.x, y: start.y - PLAYER_H,
    w: PLAYER_W, h: PLAYER_H,
    vx: 0, vy: 0,
    dir: 1, crouch: false, sneak: false,
    onGround: false, stepAcc: 0, moving: false,
  };
}

export function playerCenter(p) {
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

export function setCrouch(p, crouch) {
  if (crouch === p.crouch) return;
  if (crouch) {
    p.y += PLAYER_H - PLAYER_CROUCH_H;
    p.h = PLAYER_CROUCH_H;
  } else {
    p.y -= PLAYER_H - PLAYER_CROUCH_H;
    p.h = PLAYER_H;
  }
  p.crouch = crouch;
}
