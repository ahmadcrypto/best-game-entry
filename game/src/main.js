// Boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between five
// screens: title, play, paused, win and game over.
//
// ?seed=N fixes the river's pattern. ?shot=start|play|end|over (with
// &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSoundBank } from './audio.js';
import {
  ACTION_CONFIRM,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  createInput,
} from './input.js';
import {
  EVENT_DELIVER,
  EVENT_DASH,
  EVENT_HIT,
  EVENT_LOSE,
  EVENT_PICKUP,
  EVENT_WIN,
  createWorld,
  updateWorld,
} from './world.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam)
  ? seedParam
  : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sound = createSoundBank();
const input = createInput(canvas);
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts one visit.
  }
}

let world = createWorld(createRandom(seed));
let screen = SCREEN_TITLE;
let best = readBest();

function playEvents(events) {
  for (const event of events) {
    if (event === EVENT_PICKUP) sound.pickup();
    else if (event === EVENT_DELIVER) sound.deliver(world.combo);
    else if (event === EVENT_DASH) sound.dash();
    else if (event === EVENT_HIT) sound.hit();
    else if (event === EVENT_WIN) sound.win();
    else if (event === EVENT_LOSE) sound.lose();
  }
}

function startGame() {
  world = createWorld(createRandom(seed));
  screen = SCREEN_PLAY;
  sound.unlock();
  sound.click();
}

function runShot(name) {
  const staged = stageShot(name, world, best);
  screen = staged.screen;
  best = staged.best;
  let painted = 0;
  function paint() {
    renderer.draw(world, screen, best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    if (input.pressed(ACTION_MUTE)) {
      const muted = sound.toggleMuted();
      status.textContent = muted ? 'Sound off' : 'Sound on';
    }

    if (screen === SCREEN_TITLE) {
      if (input.pressed(ACTION_CONFIRM) || input.pressed('Mouse')) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (input.pressed(ACTION_PAUSE) || input.pressed('Escape')) {
        screen = SCREEN_PAUSED;
        sound.click();
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const events = updateWorld(world, input, STEP);
          playEvents(events);
          if (world.status === 'won') {
            screen = SCREEN_WIN;
            if (world.score > best) {
              best = world.score;
              saveBest(best);
            }
          } else if (world.status === 'lost') {
            screen = SCREEN_OVER;
            if (world.score > best) {
              best = world.score;
              saveBest(best);
            }
          }
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.pressed(ACTION_PAUSE) || input.pressed('Escape') || input.pressed(ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        sound.click();
      }
    } else if (screen === SCREEN_WIN || screen === SCREEN_OVER) {
      if (input.pressed(ACTION_RESTART) || input.pressed(ACTION_CONFIRM) || input.pressed('Mouse')) {
        startGame();
      }
    }

    renderer.draw(world, screen, best);
    status.textContent =
      screen === SCREEN_PLAY
        ? `Score ${world.score}, lamps ${world.delivered} of 6, hearts ${world.hearts}`
        : screen;
    input.endFrame();
  }
  requestAnimationFrame(frame);
}

// A handle for automated play-testing: state only, no control over the
// game beyond what a player could do with keys.
window.__lanternFerry = {
  get screen() {
    return screen;
  },
  get score() {
    return world.score;
  },
  get hearts() {
    return world.hearts;
  },
  get delivered() {
    return world.delivered;
  },
  get carried() {
    return world.carried;
  },
  get status() {
    return world.status;
  },
  get ferry() {
    return { x: world.ferry.x, y: world.ferry.y };
  },
};

if (shot) runShot(shot);
else runGame();
