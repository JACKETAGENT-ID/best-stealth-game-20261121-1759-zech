// Neon Rooftop Infiltration — the game itself: input, fixed-step loop, the
// detection meter, alarms, lives, chips, the helipad, and the score.

import {
  VIEW_W, GRAVITY, MOVE_SPEED, SNEAK_SPEED, JUMP_VEL,
  LEVELS, MAX_LIVES, clamp,
} from './config.js';
import { Level, makePlayer, setCrouch, playerCenter } from './level.js';
import { senseDrone, updateMeter } from './detection.js';
import { Renderer } from './render.js';
import { SoundEngine } from './audio.js';

const STEP = 1 / 60;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new Renderer();
    this.sound = new SoundEngine();
    this.state = 'title'; // title | play | caught | clear | over | win
    this.levelIndex = 0;
    this.level = new Level(LEVELS[0]);
    this.player = makePlayer(this.level.playerStart);
    this.cameraX = 0;
    this.meter = 0;
    this.lives = MAX_LIVES;
    this.score = 0;
    this.levelTime = 0;
    this.time = 0;
    this.alarmT = 0;
    this.stateT = 0;
    this.particles = [];
    this.keys = {};
    this.sawCone = false;
    this.staged = false;
    this.last = 0;
    this.acc = 0;
    this.bindInput();
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.sound.unlock();
      if (e.repeat) return;
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'm' || e.key === 'M') this.sound.toggleMute();
      if (e.key === 'r' || e.key === 'R') this.restartLevel();
      if (e.key === 'Enter') this.advance();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      this.sound.unlock();
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.click(x, y);
    });
    window.addEventListener('blur', () => { this.keys = {}; });
  }

  click(x, y) {
    void x; void y;
    if (this.state === 'title' || this.state === 'over' || this.state === 'win') this.advance();
    else if (this.state === 'clear') this.advance();
  }

  advance() {
    if (this.state === 'title') {
      this.startRun();
    } else if (this.state === 'clear') {
      if (this.levelIndex >= LEVELS.length - 1) {
        this.state = 'win';
        this.stateT = 0;
      } else {
        this.levelIndex += 1;
        this.startLevel(this.levelIndex);
      }
    } else if (this.state === 'over' || this.state === 'win') {
      this.startRun();
    }
  }

  startRun() {
    this.levelIndex = 0;
    this.score = 0;
    this.lives = MAX_LIVES;
    this.startLevel(0);
  }

  startLevel(i) {
    this.levelIndex = i;
    this.level = new Level(LEVELS[i]);
    this.player = makePlayer(this.level.playerStart);
    this.meter = 0;
    this.levelTime = 0;
    this.alarmT = 0;
    this.particles = [];
    this.state = 'play';
    this.stateT = 0;
    this.updateCamera(true);
  }

  restartLevel() {
    if (this.state !== 'play' && this.state !== 'caught') return;
    this.startLevel(this.levelIndex);
  }

  loseLife(reason) {
    this.lives -= 1;
    this.sound.caught();
    this.burst(playerCenter(this.player).x, playerCenter(this.player).y, '#ff3355', 26);
    if (this.lives <= 0) {
      this.state = 'over';
      this.stateT = 0;
    } else {
      this.state = 'caught';
      this.stateT = 0;
    }
    void reason;
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const sp = 60 + (i % 5) * 40;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: 0.7, max: 0.7, color,
      });
    }
  }

  updateCamera(snap) {
    const target = clamp(
      this.player.x + this.player.w / 2 - VIEW_W * 0.42,
      0, this.level.width - VIEW_W,
    );
    if (snap) this.cameraX = target;
    else this.cameraX += (target - this.cameraX) * 0.12;
  }

  update(dt) {
    this.time += dt;
    if (this.state === 'title') {
      // Attract mode: the first level idles behind the title.
      this.level.updateDrones(dt, this.time, false);
      return;
    }
    if (this.staged) {
      // A photographed moment: the clock runs (rain, LEDs, rotor blur) but
      // the posed player, drones and camera hold exactly where the scene put them.
      for (const d of this.level.drones) {
        d.y = d.baseY + Math.sin(this.time * 1.6 + d.bobPhase) * 10;
      }
      this.updateParticles(dt);
      return;
    }
    if (this.state === 'caught') {
      this.stateT += dt;
      this.updateParticles(dt);
      if (this.stateT > 1.6) this.startLevel(this.levelIndex);
      return;
    }
    if (this.state === 'clear' || this.state === 'over' || this.state === 'win') {
      this.stateT += dt;
      this.level.updateDrones(dt, this.time, false);
      this.updateParticles(dt);
      return;
    }

    // --- play ---
    this.levelTime += dt;
    const p = this.player;
    const k = this.keys;
    const left = k['arrowleft'] || k['a'];
    const right = k['arrowright'] || k['d'];
    const jump = k[' '] || k['arrowup'] || k['w'];
    const crouchKey = k['arrowdown'] || k['s'];
    const sneak = k['shift'];
    p.sneak = !!sneak && p.onGround;

    const speed = p.sneak ? SNEAK_SPEED : MOVE_SPEED;
    let vx = 0;
    if (left) { vx -= speed; p.dir = -1; }
    if (right) { vx += speed; p.dir = 1; }
    if (crouchKey && p.onGround) vx = 0;
    p.vx = vx;
    p.moving = vx !== 0 && p.onGround;
    setCrouch(p, !!(crouchKey && p.onGround));

    if (jump && p.onGround) {
      p.vy = JUMP_VEL;
      p.onGround = false;
      this.sound.jump();
    }
    p.vy += GRAVITY * dt;
    if (p.vy > 1400) p.vy = 1400;
    const prevBottom = p.y + p.h;
    p.x += p.vx * dt;
    p.x = clamp(p.x, 0, this.level.width - p.w);
    p.y += p.vy * dt;
    const landed = this.level.landPlayer(p, prevBottom);
    if (landed && prevBottom < landed.y - 4) this.sound.land();

    // Footsteps tell you — and the drones — where you are.
    if (p.moving) {
      p.stepAcc += dt * (p.sneak ? 4 : 7);
      if (p.stepAcc > 1) { p.stepAcc = 0; this.sound.step(p.sneak); }
    }

    // Fell between the rooftops.
    if (p.y > 760) { this.loseLife('fall'); return; }

    // Drones patrol; alarmed ones hunt your last known roof.
    this.level.alarmTargetX = p.x + p.w / 2;
    this.level.updateDrones(dt, this.time, this.alarmT > 0);

    // Vision cones and the detection meter.
    const senses = this.level.drones.map((d) => senseDrone(d, p, this.level));
    const res = updateMeter(this.meter, senses, dt);
    this.meter = res.meter;
    if (res.anySeen) this.sawCone = true;
    if (this.meter >= 100 && this.alarmT <= 0) {
      this.alarmT = 4;
      this.sound.alarmStart();
    }
    if (this.alarmT > 0) {
      this.alarmT -= dt;
      if (this.alarmT <= 0) {
        this.alarmT = 0;
        this.meter = 40;
        this.sound.alarmStop();
      }
    }

    // A drone that reaches you during an alarm catches you.
    if (this.alarmT > 0) {
      for (const d of this.level.drones) {
        if (Math.hypot(d.x - (p.x + p.w / 2), d.y - (p.y + p.h / 2)) < 34) {
          this.loseLife('caught');
          return;
        }
      }
    }

    // Drone hum follows the nearest patrol.
    const near = this.level.nearestDrone(p.x + p.w / 2, p.y + p.h / 2);
    this.sound.setHum(clamp(near.dist / 700, 0, 1));

    // Data chips.
    for (const chip of this.level.chips) {
      if (chip.taken) continue;
      if (Math.hypot(chip.x - (p.x + p.w / 2), chip.y - (p.y + p.h / 2)) < 34) {
        chip.taken = true;
        this.score += 500;
        this.sound.pickup();
        this.burst(chip.x, chip.y, '#22e6ff', 14);
      }
    }

    // The helipad: reach it unseen and the rooftop is yours.
    const ex = this.level.exit;
    const pc = playerCenter(p);
    if (pc.x > ex.x && pc.x < ex.x + ex.w && pc.y > ex.y - 20 && pc.y < ex.y + ex.h + 60) {
      const timeBonus = Math.max(0, Math.round((this.level.parTime - this.levelTime) * 10));
      this.score += 1000 + timeBonus;
      this.sound.clear();
      this.state = 'clear';
      this.stateT = 0;
      this.burst(ex.x + ex.w / 2, ex.y + 20, '#a6ff3e', 30);
      return;
    }

    this.updateCamera(false);
    this.updateParticles(dt);
  }

  updateParticles(dt) {
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 300 * dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, 720);
    if (this.state === 'title') {
      this.renderer.drawTitle(ctx, this);
    } else if (this.state === 'clear') {
      this.renderer.drawClear(ctx, this);
    } else if (this.state === 'over') {
      this.renderer.drawOver(ctx, this);
    } else if (this.state === 'win') {
      this.renderer.drawWorld(ctx, this);
      this.renderer.drawBanner(
        ctx,
        'ALL ROOFTOPS CLEAR',
        `Final score ${this.score} — VEX vanishes into the neon night. Press ENTER to run it again.`,
        '#a6ff3e',
      );
    } else {
      this.renderer.drawWorld(ctx, this);
      this.renderer.drawHUD(ctx, this);
      if (this.state === 'caught') this.renderer.drawCaught(ctx);
      if (this.alarmT > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,51,85,${0.35 + 0.25 * Math.sin(this.time * 8)})`;
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, VIEW_W - 6, 714);
        ctx.restore();
      }
    }
  }

  frame(t) {
    const now = t / 1000;
    if (!this.last) this.last = now;
    let dt = now - this.last;
    this.last = now;
    if (dt > 0.25) dt = 0.25;
    this.acc += dt;
    while (this.acc >= STEP) {
      this.update(STEP);
      this.acc -= STEP;
    }
    this.render();
    requestAnimationFrame((tt) => this.frame(tt));
  }

  start() {
    requestAnimationFrame((t) => this.frame(t));
  }
}
