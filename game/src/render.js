// Neon Rooftop Infiltration — everything you see, drawn on one canvas:
// a parallax neon skyline, the rooftops and their cover, the patrol drones
// with their vision cones, the infiltrator, and every screen and HUD bar.

import { VIEW_W, VIEW_H, PALETTE, mulberry32, clamp } from './config.js';
import { conePolygon } from './detection.js';

const skylineRand = mulberry32(20261121);

function skylineLayer(seed, count, minW, maxW, minH, maxH) {
  const rnd = mulberry32(seed);
  const out = [];
  let x = -40;
  for (let i = 0; i < count; i++) {
    const w = minW + rnd() * (maxW - minW);
    const h = minH + rnd() * (maxH - minH);
    const windows = [];
    const cols = Math.floor(w / 26);
    const rows = Math.floor(h / 34);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() < 0.34) windows.push({ dx: 8 + c * 26, dy: 12 + r * 34, lit: rnd() < 0.7 });
      }
    }
    out.push({ x, w, h, windows, antenna: rnd() < 0.4 });
    x += w + 6 + rnd() * 30;
  }
  return out;
}

const FAR_TOWERS = skylineLayer(77, 26, 90, 190, 120, 300);
const NEAR_TOWERS = skylineLayer(913, 20, 130, 260, 180, 420);
const STARS = Array.from({ length: 90 }, (_, i) => {
  const r = mulberry32(5000 + i);
  return { x: r() * VIEW_W * 2, y: r() * 320, s: 0.6 + r() * 1.6, tw: r() * 6.28 };
});
const RAIN = Array.from({ length: 90 }, (_, i) => {
  const r = mulberry32(9000 + i);
  return { x: r() * (VIEW_W + 200), y: r() * VIEW_H, len: 14 + r() * 18, sp: 520 + r() * 260 };
});

function drawSky(ctx, camX, time) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyMid);
  g.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Stars, twinkling slowly.
  for (const s of STARS) {
    const sx = ((s.x - camX * 0.08) % (VIEW_W * 2) + VIEW_W * 2) % (VIEW_W * 2) - VIEW_W / 2;
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 1.4 + s.tw);
    ctx.fillStyle = '#cfe6ff';
    ctx.fillRect(sx, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;

  // Low neon moon.
  ctx.save();
  ctx.fillStyle = '#f4f0ff';
  ctx.beginPath();
  ctx.arc(1080 - camX * 0.05, 92, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,120,255,0.25)';
  ctx.beginPath();
  ctx.arc(1080 - camX * 0.05, 92, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawTowers(ctx, FAR_TOWERS, camX, 0.18, '#0b1230', 0.5);
  drawTowers(ctx, NEAR_TOWERS, camX, 0.42, '#0d1430', 0.85);
}

function drawTowers(ctx, towers, camX, parallax, color, windowAlpha) {
  ctx.save();
  for (const t of towers) {
    const span = 3200;
    let sx = ((t.x - camX * parallax) % span + span) % span - 200;
    const base = VIEW_H + 40;
    ctx.fillStyle = color;
    ctx.fillRect(sx, base - t.h, t.w, t.h);
    if (t.antenna) {
      ctx.fillRect(sx + t.w / 2 - 1, base - t.h - 34, 2, 34);
      ctx.fillStyle = '#ff3355';
      ctx.fillRect(sx + t.w / 2 - 2, base - t.h - 38, 4, 4);
    }
    ctx.globalAlpha = windowAlpha;
    for (const w of t.windows) {
      ctx.fillStyle = w.lit ? PALETTE.windowLit : PALETTE.windowDark;
      ctx.fillRect(sx + w.dx, base - t.h + w.dy, 12, 16);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawRain(ctx, time) {
  ctx.save();
  ctx.strokeStyle = 'rgba(160,200,255,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const r of RAIN) {
    const y = (r.y + time * r.sp) % (VIEW_H + 40) - 20;
    const x = (r.x - time * 60) % (VIEW_W + 200);
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + r.len);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRoofs(ctx, level, camX) {
  for (const plat of level.platforms) {
    const x = plat.x - camX;
    const y = plat.y;
    // Facade down to the bottom of the screen.
    ctx.fillStyle = PALETTE.facade;
    ctx.fillRect(x, y, plat.w, VIEW_H - y);
    // Lit windows on the facade.
    ctx.fillStyle = PALETTE.windowDark;
    for (let wx = x + 18; wx < x + plat.w - 20; wx += 46) {
      for (let wy = y + 34; wy < VIEW_H - 16; wy += 44) {
        if (((wx * 7 + wy * 13) % 5) < 2) {
          ctx.fillStyle = PALETTE.windowLit;
          ctx.globalAlpha = 0.5;
        } else {
          ctx.fillStyle = PALETTE.windowDark;
          ctx.globalAlpha = 0.8;
        }
        ctx.fillRect(wx, wy, 20, 24);
      }
    }
    ctx.globalAlpha = 1;
    // Roof slab and its neon edge.
    ctx.fillStyle = PALETTE.roof;
    ctx.fillRect(x, y, plat.w, 14);
    ctx.fillStyle = plat.y < 600 ? PALETTE.roofEdge2 : PALETTE.roofEdge;
    ctx.fillRect(x, y, plat.w, 3);
    ctx.fillStyle = 'rgba(34,230,255,0.16)';
    ctx.fillRect(x, y + 3, plat.w, 2);
  }
}

function drawCover(ctx, c, camX, time) {
  const x = c.x - camX;
  const y = c.y;
  if (c.kind === 'ac') {
    ctx.fillStyle = PALETTE.acBody;
    ctx.fillRect(x, y, c.w, c.h);
    ctx.fillStyle = PALETTE.acDark;
    ctx.fillRect(x, y, c.w, 6);
    ctx.strokeStyle = '#3d5178';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, c.w - 2, c.h - 2);
    // Fan, spinning slowly.
    const cx = x + c.w / 2;
    const cy = y + c.h / 2 + 4;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 1.2);
    ctx.strokeStyle = '#8fb8d8';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -14);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#0b1226';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    // Blinking status LED.
    ctx.fillStyle = Math.sin(time * 4) > 0 ? '#a6ff3e' : '#2c4a2c';
    ctx.fillRect(x + c.w - 10, y + 8, 4, 4);
  } else if (c.kind === 'vent') {
    ctx.fillStyle = PALETTE.ventBody;
    ctx.fillRect(x, y, c.w, c.h);
    ctx.fillStyle = '#171226';
    ctx.fillRect(x, y, c.w, 6);
    ctx.strokeStyle = '#5a4a86';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const sy = y + 14 + i * 10;
      ctx.beginPath();
      ctx.moveTo(x + 6, sy);
      ctx.lineTo(x + c.w - 6, sy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,46,166,0.7)';
    ctx.fillRect(x + 6, y + c.h - 8, c.w - 12, 3);
  } else {
    // Pipe stack.
    ctx.fillStyle = PALETTE.pipeBody;
    ctx.fillRect(x, y, c.w, c.h);
    ctx.fillStyle = '#241c40';
    ctx.fillRect(x, y, c.w, 8);
    ctx.fillStyle = 'rgba(166,255,62,0.55)';
    ctx.fillRect(x + 8, y + 16, 4, c.h - 24);
    ctx.fillRect(x + c.w - 12, y + 16, 4, c.h - 24);
  }
}

function drawExit(ctx, exit, camX, time) {
  const x = exit.x - camX;
  const y = exit.y;
  const cx = x + exit.w / 2;
  const cy = y + exit.h / 2;
  // Helipad disc.
  ctx.save();
  ctx.fillStyle = '#101a2e';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 26, exit.w / 2, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.helipad;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.65 + 0.35 * Math.sin(time * 3);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 26, exit.w / 2, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Big H.
  ctx.fillStyle = PALETTE.helipad;
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', cx, cy + 2);
  // Rising extraction beam.
  const beam = ctx.createLinearGradient(0, y - 150, 0, y + 40);
  beam.addColorStop(0, 'rgba(166,255,62,0)');
  beam.addColorStop(1, 'rgba(166,255,62,0.22)');
  ctx.fillStyle = beam;
  ctx.fillRect(cx - 26, y - 150, 52, 190);
  // Label.
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#d8ffd0';
  ctx.fillText('EXTRACT', cx, y - 158);
  ctx.restore();
}

function drawChip(ctx, chip, camX, time) {
  if (chip.taken) return;
  const x = chip.x - camX;
  const y = chip.y + Math.sin(time * 2.4 + chip.x * 0.05) * 5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 2 + chip.x) * 0.25);
  ctx.shadowColor = PALETTE.chip;
  ctx.shadowBlur = 14;
  ctx.fillStyle = PALETTE.chip;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 11);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#062a33';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(4, 0);
  ctx.lineTo(0, 5);
  ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDrone(ctx, drone, camX, meter, alarm, time) {
  const poly = conePolygon(drone);
  const eye = poly.eye;
  // Vision cone: amber normally, red while the alarm runs.
  const base = alarm ? '255,51,85' : PALETTE.cone;
  const grad = ctx.createLinearGradient(eye.x - camX, eye.y, poly.p1.x - camX, poly.p1.y);
  const hot = meter > 55;
  grad.addColorStop(0, `rgba(${base},${hot || alarm ? 0.34 : 0.2})`);
  grad.addColorStop(1, `rgba(${base},0.02)`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(eye.x - camX, eye.y);
  ctx.lineTo(poly.p1.x - camX, poly.p1.y);
  ctx.lineTo(poly.p2.x - camX, poly.p2.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(${base},0.4)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(eye.x - camX, eye.y);
  ctx.lineTo(poly.p1.x - camX, poly.p1.y);
  ctx.moveTo(eye.x - camX, eye.y);
  ctx.lineTo(poly.p2.x - camX, poly.p2.y);
  ctx.stroke();
  ctx.restore();

  // Drone body.
  const x = drone.x - camX;
  const y = drone.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rotor blur.
  ctx.strokeStyle = 'rgba(200,220,255,0.5)';
  ctx.lineWidth = 2;
  const rotor = 26 + Math.sin(time * 40) * 2;
  ctx.beginPath();
  ctx.moveTo(-rotor, -16);
  ctx.lineTo(rotor, -16);
  ctx.stroke();
  // Hull.
  ctx.fillStyle = PALETTE.droneBody;
  ctx.beginPath();
  ctx.roundRect(-20, -10, 40, 18, 8);
  ctx.fill();
  ctx.fillStyle = '#5a6b8a';
  ctx.fillRect(-20, 2, 40, 4);
  // Sensor eye, facing the patrol direction.
  ctx.fillStyle = alarm ? '#ff2244' : PALETTE.droneEye;
  ctx.shadowColor = PALETTE.droneEye;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(drone.dir * 12, -1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Searchlight dot under the hull.
  ctx.fillStyle = `rgba(${base},0.9)`;
  ctx.beginPath();
  ctx.arc(0, 10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, p, camX, time) {
  const x = p.x - camX;
  const y = p.y;
  const w = p.w;
  const h = p.h;
  ctx.save();
  // Soft shadow on the roof.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const bob = p.onGround && p.moving ? Math.sin(time * 14) * 1.5 : 0;
  ctx.translate(x + w / 2, y + h);
  ctx.scale(p.dir, 1);
  // Cloak.
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.beginPath();
  if (p.crouch) {
    ctx.moveTo(-13, 0);
    ctx.lineTo(-9, -h + 6);
    ctx.lineTo(4, -h + 2);
    ctx.lineTo(13, 0);
  } else {
    ctx.moveTo(-12, 0);
    ctx.lineTo(-8, -h + 8 + bob);
    ctx.lineTo(2, -h + bob);
    ctx.lineTo(12, 0);
  }
  ctx.closePath();
  ctx.fill();
  // Dark inner fold.
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-2, -h + 10 + bob);
  ctx.lineTo(6, -h + 2 + bob);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();
  // Hood + glowing visor.
  const hy = p.crouch ? -h + 4 : -h + 2 + bob;
  ctx.fillStyle = '#0e2f26';
  ctx.beginPath();
  ctx.arc(3, hy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.visor;
  ctx.shadowColor = PALETTE.visor;
  ctx.shadowBlur = 8;
  ctx.fillRect(4, hy - 2, 8, 3);
  ctx.shadowBlur = 0;
  // Sneak lean line.
  if (p.sneak && !p.crouch) {
    ctx.strokeStyle = 'rgba(125,249,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-14, -2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(ctx, particles, camX) {
  for (const pt of particles) {
    ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - camX - 2, pt.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

export class Renderer {
  drawWorld(ctx, game) {
    const level = game.level;
    const camX = game.cameraX;
    const time = game.time;
    drawSky(ctx, camX, time);
    drawRoofs(ctx, level, camX);
    for (const c of level.covers) drawCover(ctx, c, camX, time);
    drawExit(ctx, level.exit, camX, time);
    for (const chip of level.chips) drawChip(ctx, chip, camX, time);
    for (const d of level.drones) drawDrone(ctx, d, camX, game.meter, game.alarmT > 0, time);
    drawPlayer(ctx, game.player, camX, time);
    drawParticles(ctx, game.particles, camX);
    drawRain(ctx, time);
    // Vignette.
    const vg = ctx.createRadialGradient(640, 360, 320, 640, 360, 780);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawHUD(ctx, game) {
    const level = game.level;
    ctx.save();
    // Top bar.
    ctx.fillStyle = 'rgba(5,8,18,0.72)';
    ctx.fillRect(0, 0, VIEW_W, 54);
    ctx.fillStyle = 'rgba(34,230,255,0.35)';
    ctx.fillRect(0, 54, VIEW_W, 1);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(level.name, 20, 20);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(level.sub, 20, 40);

    // Detection meter: an eye that opens as the meter rises.
    const mx = 480;
    const my = 27;
    ctx.fillStyle = '#0a1226';
    ctx.strokeStyle = game.meter > 70 ? PALETTE.alarm : '#3d5178';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(mx, my - 11, 220, 22, 11);
    ctx.fill();
    ctx.stroke();
    const frac = game.meter / 100;
    const mg = ctx.createLinearGradient(mx, 0, mx + 220, 0);
    mg.addColorStop(0, '#ffd65a');
    mg.addColorStop(0.6, '#ff9a3d');
    mg.addColorStop(1, '#ff3355');
    ctx.fillStyle = mg;
    if (frac > 0.01) {
      ctx.beginPath();
      ctx.roundRect(mx + 2, my - 9, 216 * frac, 18, 9);
      ctx.fill();
    }
    ctx.fillStyle = game.alarmT > 0 ? PALETTE.alarm : PALETTE.text;
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(game.alarmT > 0 ? 'ALARM!' : 'DETECTION', mx + 232, my + 1);
    // Eye glyph.
    ctx.fillStyle = game.meter > 55 ? PALETTE.alarm : '#cfe6ff';
    ctx.beginPath();
    ctx.ellipse(mx - 22, my, 11, 6 + frac * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05070f';
    ctx.beginPath();
    ctx.arc(mx - 22, my, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Chips collected.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.chip;
    ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
    const got = level.chips.filter((c) => c.taken).length;
    ctx.fillText(`◆ ${got}/3 DATA`, 820, my + 1);
    // Lives.
    ctx.fillStyle = PALETTE.alarm;
    let lx = 950;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < game.lives ? 1 : 0.22;
      ctx.beginPath();
      ctx.moveTo(lx, my + 6);
      ctx.lineTo(lx + 7, my - 6);
      ctx.lineTo(lx + 14, my + 6);
      ctx.lineTo(lx + 7, my + 11);
      ctx.closePath();
      ctx.fill();
      lx += 22;
    }
    ctx.globalAlpha = 1;
    // Timer + score.
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(fmtTime(game.levelTime), 1240, 20);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SCORE ${game.score}`, 1240, 40);

    // Bottom hints.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(230,240,255,0.75)';
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(
      '← → move · SPACE jump · ↓ crouch behind cover · SHIFT sneak · R restart · M mute',
      VIEW_W / 2, VIEW_H - 12,
    );
    ctx.restore();
  }

  drawTitle(ctx, game) {
    this.drawWorld(ctx, game);
    ctx.save();
    ctx.fillStyle = 'rgba(4,7,16,0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.roofEdge;
    ctx.shadowColor = PALETTE.roofEdge;
    ctx.shadowBlur = 26;
    ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('NEON ROOFTOP', VIEW_W / 2, 218);
    ctx.fillStyle = '#ff2ea6';
    ctx.shadowColor = '#ff2ea6';
    ctx.fillText('INFILTRATION', VIEW_W / 2, 292);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Slip past the patrol drones. Crouch behind vents and AC units.', VIEW_W / 2, 348);
    ctx.fillText('Grab the data chips. Reach the helipad — unseen.', VIEW_W / 2, 378);
    ctx.fillStyle = '#a6ff3e';
    ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    const blink = Math.sin(game.time * 3) > -0.2;
    if (blink) ctx.fillText('— PRESS ENTER OR CLICK TO START —', VIEW_W / 2, 448);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('3 rooftops · 9 data chips · 3 lives · the cones are watching', VIEW_W / 2, 500);
    ctx.fillText('A / D or ← → move · SPACE jump · ↓ crouch · SHIFT sneak · M mute', VIEW_W / 2, 530);
    ctx.restore();
  }

  drawBanner(ctx, title, sub, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,7,16,0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(title, VIEW_W / 2, 320);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(sub, VIEW_W / 2, 372);
    ctx.restore();
  }

  drawClear(ctx, game) {
    this.drawWorld(ctx, game);
    this.drawBanner(
      ctx,
      game.levelIndex >= 2 ? 'EXTRACTED — ALL ROOFTOPS CLEAR' : 'ROOFTOP CLEAR',
      `Score ${game.score} · press ENTER for the next rooftop`,
      '#a6ff3e',
    );
  }

  drawOver(ctx, game) {
    this.drawWorld(ctx, game);
    this.drawBanner(ctx, 'COVER BLOWN', 'No lives left — press ENTER to try again', PALETTE.alarm);
  }

  drawCaught(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.alarm;
    ctx.shadowColor = PALETTE.alarm;
    ctx.shadowBlur = 24;
    ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('SPOTTED!', VIEW_W / 2, 240);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('A drone locked onto you — falling back to the entry point…', VIEW_W / 2, 290);
    ctx.restore();
  }
}

export function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
