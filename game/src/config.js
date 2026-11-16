// Lantern Ferry — every number that tunes the game lives here, so the
// rest of the code reads like rules instead of arithmetic.
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 600;
export const BANK_HEIGHT = 64; // top bank (lighthouses) and bottom dock strip
export const STEP = 1 / 60;
export const BEST_KEY = 'lantern-ferry-best';

export const FERRY_RADIUS = 18;
export const FERRY_ACCEL = 1500;
export const FERRY_MAX_SPEED = 265;
export const FERRY_DAMPING = 2.6; // per second, exponential
export const DASH_SPEED = 540;
export const DASH_COOLDOWN = 1.6;
export const DASH_TIME = 0.22;

export const START_HEARTS = 3;
export const CARRY_MAX = 3;
export const LAMPS_TO_WIN = 6;
export const WISP_RADIUS = 11;
export const WISP_PICKUP_RADIUS = 30;
export const MINE_RADIUS = 16;

export const WISP_SPAWN_SECONDS = 2.1;
export const MINE_SPAWN_START = 3.4;
export const MINE_SPAWN_MIN = 1.35;
export const MINE_SPEED_START = 42;
export const MINE_SPEED_PER_LAMP = 9;
export const CURRENT_START = 14; // px/s pushing the ferry downstream
export const CURRENT_PER_LAMP = 7;

export const SCORE_PICKUP = 10;
export const SCORE_DELIVER = 100;
export const SCORE_WIN = 500;
export const SCORE_WIN_PER_HEART = 50;

export const INVULN_SECONDS = 2.0;
export const SHAKE_SECONDS = 0.45;

// Lighthouse docks along the top bank, evenly spaced across the river.
export const LAMPS = [80, 240, 400, 560, 720, 880].map((x, index) => ({
  x,
  y: 46,
  index,
}));

export const PALETTE = {
  skyTop: '#0a0e24',
  skyBottom: '#182a52',
  bank: '#12291f',
  bankEdge: '#2c4a35',
  waterTop: '#16224d',
  waterBottom: '#0a1026',
  wave: 'rgba(120, 170, 255, 0.10)',
  lampLit: '#ffd27a',
  lampDark: '#3a3f5c',
  ferryHull: '#8a5a2b',
  ferryTrim: '#ffd27a',
  ferryGlow: 'rgba(255, 210, 122, 0.55)',
  wisp: '#9fe8ff',
  wispCore: '#eafcff',
  mine: '#1c1f2e',
  mineSpike: '#3d4361',
  mineGlint: '#ff5a5a',
  heart: '#ff6b81',
  heartEmpty: '#3a3f5c',
  ink: '#eef2ff',
  inkDim: '#aab4d4',
  panel: 'rgba(8, 12, 30, 0.82)',
  gold: '#ffd27a',
};
