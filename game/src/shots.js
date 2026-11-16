// Staged scenes for the three screenshots: each one builds a world in
// a chosen state and says which screen the renderer should paint, so a
// screenshot is a real render of the game's own code — never a picture
// drawn for the occasion. ?shot=start|play|end (with &seed=N) picks one.
import { LAMPS_TO_WIN } from './config.js';
import { createWorld } from './world.js';
import {
  SCREEN_OVER,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';

function placeWisp(world, x, y) {
  world.wisps.push({
    x,
    y,
    sway: 0.4,
    swaySpeed: 0.8,
    drift: 10,
    phase: 1.2,
  });
}

function placeMine(world, x, y, speed = 50) {
  world.mines.push({
    x,
    y,
    speed,
    sway: 0.6,
    swaySpeed: 0.8,
    swayAmp: 14,
    rot: 0.5,
    rotSpeed: 0.3,
  });
}

/**
 * Stage one named scene. Returns { screen, best } for the renderer.
 * The world it returns is a genuine world object: the play scene is
 * mid-game with a real HUD, the end scene is a real win.
 */
export function stageShot(name, world, best) {
  if (name === 'play') {
    world.lampsLit[0] = true;
    world.lampsLit[2] = true;
    world.lampsLit[4] = true;
    world.carried = 2;
    world.score = 640;
    world.combo = 3;
    world.bestCombo = 3;
    world.delivered = 3;
    world.pickedUp = 5;
    world.time = 83;
    world.ferry.x = 480;
    world.ferry.y = 330;
    world.ferry.vx = 120;
    world.ferry.vy = -60;
    world.ferry.facing = -0.5;
    placeWisp(world, 300, 210);
    placeWisp(world, 620, 250);
    placeWisp(world, 700, 420);
    placeMine(world, 350, 430, 55);
    placeMine(world, 640, 170, 48);
    placeMine(world, 830, 330, 60);
    return { screen: SCREEN_PLAY, best: Math.max(best, 640) };
  }
  if (name === 'end') {
    for (let i = 0; i < LAMPS_TO_WIN; i += 1) world.lampsLit[i] = true;
    world.score = 1420;
    world.combo = 4;
    world.bestCombo = 4;
    world.delivered = 6;
    world.pickedUp = 9;
    world.time = 214;
    world.hearts = 2;
    world.status = 'won';
    world.ferry.x = 400;
    world.ferry.y = 150;
    world.ferry.facing = -Math.PI / 2;
    placeWisp(world, 560, 300);
    placeWisp(world, 240, 380);
    return { screen: SCREEN_WIN, best: Math.max(best, 1420) };
  }
  if (name === 'over') {
    world.lampsLit[0] = true;
    world.lampsLit[3] = true;
    world.score = 380;
    world.delivered = 2;
    world.pickedUp = 4;
    world.time = 122;
    world.hearts = 0;
    world.status = 'lost';
    world.ferry.x = 520;
    world.ferry.y = 380;
    placeMine(world, 480, 330, 50);
    placeWisp(world, 680, 240);
    return { screen: SCREEN_OVER, best: Math.max(best, 380) };
  }
  // 'start' and anything else: the title screen over a lively river.
  world.ferry.x = 480;
  world.ferry.y = 480;
  world.ferry.facing = -Math.PI / 2;
  placeWisp(world, 240, 240);
  placeWisp(world, 700, 300);
  placeWisp(world, 420, 180);
  placeMine(world, 560, 400, 45);
  return { screen: SCREEN_TITLE, best };
}

export function stageShotWorld(name, random, best) {
  const world = createWorld(random);
  const staged = stageShot(name, world, best);
  return { world, screen: staged.screen, best: staged.best };
}
