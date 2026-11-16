// The river itself: ferry physics, drifting wisps and mines, the six
// lighthouse lamps, scoring and the win/lose rules. This file knows
// nothing about drawing or the DOM; it only advances a plain state
// object one fixed step at a time and reports what happened as events.
import {
  BANK_HEIGHT,
  CARRY_MAX,
  CURRENT_PER_LAMP,
  CURRENT_START,
  DASH_COOLDOWN,
  DASH_SPEED,
  DASH_TIME,
  FERRY_ACCEL,
  FERRY_DAMPING,
  FERRY_MAX_SPEED,
  FERRY_RADIUS,
  INVULN_SECONDS,
  LAMPS,
  LAMPS_TO_WIN,
  MINE_RADIUS,
  MINE_SPAWN_MIN,
  MINE_SPAWN_START,
  MINE_SPEED_PER_LAMP,
  MINE_SPEED_START,
  SCORE_DELIVER,
  SCORE_PICKUP,
  SCORE_WIN,
  SCORE_WIN_PER_HEART,
  SHAKE_SECONDS,
  START_HEARTS,
  STEP,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WISP_PICKUP_RADIUS,
  WISP_RADIUS,
  WISP_SPAWN_SECONDS,
} from './config.js';

export const EVENT_PICKUP = 'pickup';
export const EVENT_DELIVER = 'deliver';
export const EVENT_HIT = 'hit';
export const EVENT_WIN = 'win';
export const EVENT_LOSE = 'lose';
export const EVENT_DASH = 'dash';

export function createWorld(random) {
  return {
    random,
    time: 0,
    ferry: {
      x: VIEW_WIDTH / 2,
      y: VIEW_HEIGHT - BANK_HEIGHT - 30,
      vx: 0,
      vy: 0,
      facing: -Math.PI / 2,
      dashLeft: 0,
      dashCooldown: 0,
    },
    wisps: [],
    mines: [],
    motes: [],
    lampsLit: LAMPS.map(() => false),
    hearts: START_HEARTS,
    carried: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    delivered: 0,
    pickedUp: 0,
    invuln: 0,
    shake: 0,
    flash: 0,
    wispTimer: 1.2,
    mineTimer: 2.0,
    status: 'playing', // 'playing' | 'won' | 'lost'
    events: [],
  };
}

export function lampsLitCount(world) {
  return world.lampsLit.filter(Boolean).length;
}

function currentStrength(world) {
  return CURRENT_START + CURRENT_PER_LAMP * lampsLitCount(world);
}

function mineSpeed(world) {
  return MINE_SPEED_START + MINE_SPEED_PER_LAMP * lampsLitCount(world);
}

function mineSpawnInterval(world) {
  const lit = lampsLitCount(world);
  return Math.max(MINE_SPAWN_MIN, MINE_SPAWN_START - lit * 0.32);
}

function spawnWisp(world) {
  const { random } = world;
  world.wisps.push({
    x: random.range(50, VIEW_WIDTH - 50),
    y: random.range(BANK_HEIGHT + 40, VIEW_HEIGHT * 0.55),
    sway: random.range(0, Math.PI * 2),
    swaySpeed: random.range(0.6, 1.4),
    drift: random.range(6, 16),
    phase: random.range(0, Math.PI * 2),
  });
}

function spawnMine(world) {
  const { random } = world;
  world.mines.push({
    x: random.range(40, VIEW_WIDTH - 40),
    y: -24,
    speed: mineSpeed(world) * random.range(0.85, 1.2),
    sway: random.range(0, Math.PI * 2),
    swaySpeed: random.range(0.5, 1.1),
    swayAmp: random.range(8, 26),
    rot: random.range(0, Math.PI * 2),
    rotSpeed: random.range(-0.8, 0.8),
  });
}

function scatterCarried(world) {
  const { ferry, random } = world;
  for (let i = 0; i < world.carried; i += 1) {
    world.wisps.push({
      x: Math.min(
        Math.max(ferry.x + random.range(-70, 70), 40),
        VIEW_WIDTH - 40,
      ),
      y: Math.min(
        Math.max(ferry.y + random.range(-60, 60), BANK_HEIGHT + 30),
        VIEW_HEIGHT - BANK_HEIGHT - 20,
      ),
      sway: random.range(0, Math.PI * 2),
      swaySpeed: random.range(0.6, 1.4),
      drift: random.range(6, 16),
      phase: random.range(0, Math.PI * 2),
    });
  }
  world.carried = 0;
}

function burstMotes(world, x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.random.range(0, Math.PI * 2);
    const speed = world.random.range(20, 90);
    world.motes.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life: world.random.range(0.5, 1.1),
      maxLife: 1.1,
      color,
      size: world.random.range(1.5, 3.5),
    });
  }
}

/** Advance the world one fixed step. Returns the events of this step. */
export function updateWorld(world, input, dt = STEP) {
  world.events.length = 0;
  if (world.status !== 'playing') return world.events;
  world.time += dt;
  const ferry = world.ferry;

  // --- Ferry: thrust, drag, the river's current, and the dash. ---
  const axis = input.axis();
  ferry.vx += axis.x * FERRY_ACCEL * dt;
  ferry.vy += axis.y * FERRY_ACCEL * dt;
  ferry.vy += currentStrength(world) * dt;
  const damp = Math.exp(-FERRY_DAMPING * dt);
  ferry.vx *= damp;
  ferry.vy *= damp;
  const speed = Math.hypot(ferry.vx, ferry.vy);
  if (speed > FERRY_MAX_SPEED && ferry.dashLeft <= 0) {
    ferry.vx = (ferry.vx / speed) * FERRY_MAX_SPEED;
    ferry.vy = (ferry.vy / speed) * FERRY_MAX_SPEED;
  }
  if (input.pressed('Space') && ferry.dashCooldown <= 0) {
    const dirX = axis.x !== 0 || axis.y !== 0 ? axis.x : Math.cos(ferry.facing);
    const dirY = axis.x !== 0 || axis.y !== 0 ? axis.y : Math.sin(ferry.facing);
    ferry.vx = dirX * DASH_SPEED;
    ferry.vy = dirY * DASH_SPEED;
    ferry.dashLeft = DASH_TIME;
    ferry.dashCooldown = DASH_COOLDOWN;
    world.events.push(EVENT_DASH);
  }
  ferry.dashLeft = Math.max(0, ferry.dashLeft - dt);
  ferry.dashCooldown = Math.max(0, ferry.dashCooldown - dt);
  ferry.x += ferry.vx * dt;
  ferry.y += ferry.vy * dt;
  ferry.x = Math.min(Math.max(ferry.x, FERRY_RADIUS + 6), VIEW_WIDTH - FERRY_RADIUS - 6);
  ferry.y = Math.min(
    Math.max(ferry.y, BANK_HEIGHT + FERRY_RADIUS),
    VIEW_HEIGHT - BANK_HEIGHT - FERRY_RADIUS,
  );
  if (speed > 12) ferry.facing = Math.atan2(ferry.vy, ferry.vx);
  if (world.invuln > 0) world.invuln -= dt;
  if (world.shake > 0) world.shake -= dt;
  if (world.flash > 0) world.flash -= dt;

  // --- Spawning: wisps to gather, mines to dodge. ---
  world.wispTimer -= dt;
  if (world.wispTimer <= 0) {
    world.wispTimer = WISP_SPAWN_SECONDS;
    if (world.wisps.length < 7) spawnWisp(world);
  }
  world.mineTimer -= dt;
  if (world.mineTimer <= 0) {
    world.mineTimer = mineSpawnInterval(world);
    spawnMine(world);
  }

  // --- Wisps drift down-river, swaying; the ferry gathers them. ---
  for (let i = world.wisps.length - 1; i >= 0; i -= 1) {
    const wisp = world.wisps[i];
    wisp.sway += wisp.swaySpeed * dt;
    wisp.phase += dt * 2;
    wisp.y += (wisp.drift + currentStrength(world) * 0.4) * dt;
    wisp.x += Math.sin(wisp.sway) * 14 * dt;
    if (wisp.y > VIEW_HEIGHT - BANK_HEIGHT - 8) {
      world.wisps.splice(i, 1);
      continue;
    }
    const dx = wisp.x - ferry.x;
    const dy = wisp.y - ferry.y;
    if (
      world.carried < CARRY_MAX &&
      dx * dx + dy * dy < WISP_PICKUP_RADIUS * WISP_PICKUP_RADIUS
    ) {
      world.wisps.splice(i, 1);
      world.carried += 1;
      world.pickedUp += 1;
      world.score += SCORE_PICKUP;
      burstMotes(world, wisp.x, wisp.y, 8, '#9fe8ff');
      world.events.push(EVENT_PICKUP);
    }
  }

  // --- Mines drift down-river; one touch costs a heart. ---
  for (let i = world.mines.length - 1; i >= 0; i -= 1) {
    const mine = world.mines[i];
    mine.sway += mine.swaySpeed * dt;
    mine.rot += mine.rotSpeed * dt;
    mine.y += mine.speed * dt;
    mine.x += Math.sin(mine.sway) * mine.swayAmp * dt;
    if (mine.y > VIEW_HEIGHT + 30) {
      world.mines.splice(i, 1);
      continue;
    }
    const dx = mine.x - ferry.x;
    const dy = mine.y - ferry.y;
    const hitR = MINE_RADIUS + FERRY_RADIUS - 4;
    if (world.invuln <= 0 && dx * dx + dy * dy < hitR * hitR) {
      world.mines.splice(i, 1);
      world.hearts -= 1;
      world.combo = 0;
      world.invuln = INVULN_SECONDS;
      world.shake = SHAKE_SECONDS;
      world.flash = 0.35;
      burstMotes(world, ferry.x, ferry.y, 16, '#ff6b81');
      scatterCarried(world);
      world.events.push(EVENT_HIT);
      if (world.hearts <= 0) {
        world.status = 'lost';
        world.events.push(EVENT_LOSE);
        return world.events;
      }
    }
  }

  // --- Deliveries: touch a dark lighthouse dock while carrying a wisp. ---
  for (let i = 0; i < LAMPS.length; i += 1) {
    if (world.lampsLit[i] || world.carried <= 0) continue;
    const lamp = LAMPS[i];
    const dx = lamp.x - ferry.x;
    const dy = lamp.y + 14 - ferry.y;
    if (dx * dx + dy * dy < 42 * 42) {
      world.lampsLit[i] = true;
      world.carried -= 1;
      world.delivered += 1;
      world.combo += 1;
      world.bestCombo = Math.max(world.bestCombo, world.combo);
      world.score += SCORE_DELIVER * world.combo;
      burstMotes(world, lamp.x, lamp.y + 10, 22, '#ffd27a');
      world.events.push(EVENT_DELIVER);
      if (lampsLitCount(world) >= LAMPS_TO_WIN) {
        world.status = 'won';
        world.score += SCORE_WIN + SCORE_WIN_PER_HEART * world.hearts;
        world.events.push(EVENT_WIN);
        return world.events;
      }
      break;
    }
  }

  // --- Motes fade. ---
  for (let i = world.motes.length - 1; i >= 0; i -= 1) {
    const mote = world.motes[i];
    mote.life -= dt;
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    mote.vy += 30 * dt;
    if (mote.life <= 0) world.motes.splice(i, 1);
  }

  return world.events;
}
