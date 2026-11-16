// Every pixel Lantern Ferry shows: the night river, its banks and
// lighthouses, the ferry, the wisps and mines, the HUD, and the four
// screens (title, play, paused, win, game over). Drawing is the only
// job here; the rules live in world.js.
import {
  BANK_HEIGHT,
  CARRY_MAX,
  FERRY_RADIUS,
  LAMPS,
  LAMPS_TO_WIN,
  MINE_RADIUS,
  PALETTE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WISP_RADIUS,
} from './config.js';
import { lampsLitCount } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -5);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.heart : PALETTE.heartEmpty;
  ctx.fill();
  ctx.restore();
}

function drawLampIcon(ctx, x, y, lit, size = 10) {
  ctx.save();
  ctx.translate(x, y);
  if (lit) {
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, size * 2.2);
    glow.addColorStop(0, 'rgba(255, 210, 122, 0.8)');
    glow.addColorStop(1, 'rgba(255, 210, 122, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = lit ? PALETTE.lampLit : PALETTE.lampDark;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-size * 0.45, size * 0.5, size * 0.9, size * 0.9);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = Math.min(canvas.width / VIEW_WIDTH, canvas.height / VIEW_HEIGHT);
    offsetX = (canvas.width - VIEW_WIDTH * scale) / 2;
    offsetY = (canvas.height - VIEW_HEIGHT * scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  function drawWater(world) {
    const grad = ctx.createLinearGradient(0, BANK_HEIGHT, 0, VIEW_HEIGHT - BANK_HEIGHT);
    grad.addColorStop(0, PALETTE.waterTop);
    grad.addColorStop(1, PALETTE.waterBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, BANK_HEIGHT, VIEW_WIDTH, VIEW_HEIGHT - 2 * BANK_HEIGHT);
    // Slow travelling wave lines, so the water reads as moving.
    ctx.strokeStyle = PALETTE.wave;
    ctx.lineWidth = 2;
    for (let row = 0; row < 5; row += 1) {
      const y = BANK_HEIGHT + 46 + row * 88;
      ctx.beginPath();
      for (let x = 0; x <= VIEW_WIDTH; x += 24) {
        const yy = y + Math.sin(x * 0.02 + world.time * 0.9 + row * 1.7) * 5;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  function drawBanks(world) {
    // Top bank: the lighthouse row. Bottom bank: the home dock.
    ctx.fillStyle = PALETTE.bank;
    ctx.fillRect(0, 0, VIEW_WIDTH, BANK_HEIGHT);
    ctx.fillRect(0, VIEW_HEIGHT - BANK_HEIGHT, VIEW_WIDTH, BANK_HEIGHT);
    ctx.fillStyle = PALETTE.bankEdge;
    ctx.fillRect(0, BANK_HEIGHT - 4, VIEW_WIDTH, 4);
    ctx.fillRect(0, VIEW_HEIGHT - BANK_HEIGHT, VIEW_WIDTH, 4);
    // Moon and stars over the top bank.
    ctx.fillStyle = 'rgba(238, 242, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(916, 26, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.skyTop;
    ctx.beginPath();
    ctx.arc(922, 22, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(238, 242, 255, 0.75)';
    for (let i = 0; i < 14; i += 1) {
      const sx = ((i * 137) % 880) + 20;
      const sy = 8 + ((i * 53) % 34);
      ctx.fillRect(sx, sy, 2, 2);
    }
    // Home dock sign at the bottom bank.
    ctx.fillStyle = PALETTE.inkDim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('H O M E   D O C K', VIEW_WIDTH / 2, VIEW_HEIGHT - 26);
  }

  function drawLighthouses(world) {
    for (let i = 0; i < LAMPS.length; i += 1) {
      const lamp = LAMPS[i];
      const lit = world.lampsLit[i];
      // Dock pier.
      ctx.fillStyle = '#241a12';
      ctx.fillRect(lamp.x - 26, BANK_HEIGHT - 14, 52, 16);
      // Tower.
      ctx.fillStyle = lit ? '#5a4632' : '#2c2f42';
      ctx.fillRect(lamp.x - 9, lamp.y - 22, 18, 26);
      ctx.fillStyle = lit ? '#7a5c38' : '#3a3f5c';
      ctx.fillRect(lamp.x - 9, lamp.y - 22, 18, 6);
      // Lamp room and its light.
      drawLampIcon(ctx, lamp.x, lamp.y - 26, lit, 11);
      if (lit) {
        // A soft cone of light spilling down-river from the lamp.
        ctx.fillStyle = 'rgba(255, 210, 122, 0.13)';
        ctx.beginPath();
        ctx.moveTo(lamp.x - 8, lamp.y - 22);
        ctx.lineTo(lamp.x - 58, lamp.y + 26);
        ctx.lineTo(lamp.x - 30, lamp.y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(lamp.x + 8, lamp.y - 22);
        ctx.lineTo(lamp.x + 58, lamp.y + 26);
        ctx.lineTo(lamp.x + 30, lamp.y + 30);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawWisps(world) {
    for (const wisp of world.wisps) {
      const pulse = 0.75 + 0.25 * Math.sin(wisp.phase);
      const glow = ctx.createRadialGradient(
        wisp.x, wisp.y, 1, wisp.x, wisp.y, WISP_RADIUS * 2.6 * pulse,
      );
      glow.addColorStop(0, 'rgba(159, 232, 255, 0.7)');
      glow.addColorStop(1, 'rgba(159, 232, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, WISP_RADIUS * 2.6 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.wispCore;
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, WISP_RADIUS * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.wisp;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, WISP_RADIUS * 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawMines(world) {
    for (const mine of world.mines) {
      ctx.save();
      ctx.translate(mine.x, mine.y);
      ctx.rotate(mine.rot);
      ctx.fillStyle = PALETTE.mineSpike;
      for (let s = 0; s < 8; s += 1) {
        const angle = (s / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * MINE_RADIUS * 0.7, Math.sin(angle) * MINE_RADIUS * 0.7);
        ctx.lineTo(
          Math.cos(angle + 0.18) * MINE_RADIUS * 1.35,
          Math.sin(angle + 0.18) * MINE_RADIUS * 1.35,
        );
        ctx.lineTo(
          Math.cos(angle + 0.36) * MINE_RADIUS * 0.7,
          Math.sin(angle + 0.36) * MINE_RADIUS * 0.7,
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = PALETTE.mine;
      ctx.beginPath();
      ctx.arc(0, 0, MINE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.mineGlint;
      ctx.beginPath();
      ctx.arc(-4, -5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMotes(world) {
    for (const mote of world.motes) {
      const alpha = Math.max(0, mote.life / mote.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = mote.color;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFerry(world) {
    const ferry = world.ferry;
    if (world.invuln > 0 && Math.floor(world.time * 12) % 2 === 0) return; // blink
    ctx.save();
    ctx.translate(ferry.x, ferry.y);
    // Lantern glow around the boat.
    const glow = ctx.createRadialGradient(0, -6, 2, 0, -6, 54);
    glow.addColorStop(0, PALETTE.ferryGlow);
    glow.addColorStop(1, 'rgba(255, 210, 122, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -6, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(ferry.facing + Math.PI / 2);
    // Hull: a little wooden boat with a lit lantern at its mast.
    ctx.fillStyle = PALETTE.ferryHull;
    ctx.beginPath();
    ctx.moveTo(0, -FERRY_RADIUS);
    ctx.quadraticCurveTo(FERRY_RADIUS, -4, FERRY_RADIUS * 0.7, FERRY_RADIUS * 0.8);
    ctx.quadraticCurveTo(0, FERRY_RADIUS * 1.1, -FERRY_RADIUS * 0.7, FERRY_RADIUS * 0.8);
    ctx.quadraticCurveTo(-FERRY_RADIUS, -4, 0, -FERRY_RADIUS);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.ferryTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(-2, -FERRY_RADIUS + 2, 4, 16);
    ctx.fillStyle = PALETTE.lampLit;
    ctx.beginPath();
    ctx.arc(0, -FERRY_RADIUS + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    // Carried wisps ride in a row along the deck.
    for (let i = 0; i < world.carried; i += 1) {
      ctx.fillStyle = PALETTE.wispCore;
      ctx.beginPath();
      ctx.arc(-8 + i * 8, 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Dash cooldown arc under the boat.
    if (ferry.dashCooldown > 0) {
      ctx.strokeStyle = 'rgba(238, 242, 255, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        ferry.x, ferry.y, FERRY_RADIUS + 8,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (1 - ferry.dashCooldown / 1.6),
      );
      ctx.stroke();
    }
  }

  function drawHud(world, best) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Hearts.
    for (let i = 0; i < 3; i += 1) {
      drawHeart(ctx, 28 + i * 26, VIEW_HEIGHT - 34, 22, i < world.hearts);
    }
    // Lamps lit, carried wisps, score, combo, time.
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`Lamps  ${lampsLitCount(world)}/${LAMPS_TO_WIN}`, 108, VIEW_HEIGHT - 26);
    drawLampIcon(ctx, 250, VIEW_HEIGHT - 33, lampsLitCount(world) > 0, 9);
    ctx.fillText(`Carried  ${world.carried}/${CARRY_MAX}`, 272, VIEW_HEIGHT - 26);
    ctx.textAlign = 'right';
    ctx.fillText(`Score  ${world.score}`, VIEW_WIDTH - 24, VIEW_HEIGHT - 26);
    if (world.combo >= 2) {
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText(`Combo x${world.combo}`, VIEW_WIDTH - 24, VIEW_HEIGHT - 48);
    }
    ctx.fillStyle = PALETTE.inkDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`Time  ${formatTime(world.time)}`, VIEW_WIDTH - 24, VIEW_HEIGHT - 70);
    if (best > 0) {
      ctx.fillText(`Best  ${best}`, 108, VIEW_HEIGHT - 48);
    }
  }

  function drawPanel(title, lines, accent) {
    const w = 560;
    const h = 96 + lines.length * 30;
    const x = (VIEW_WIDTH - w) / 2;
    const y = (VIEW_HEIGHT - h) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(title, VIEW_WIDTH / 2, y + 58);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '17px system-ui, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, VIEW_WIDTH / 2, y + 100 + i * 30);
    });
  }

  function drawTitle(world, best) {
    drawPanel('LANTERN FERRY', [
      'Gather the lost wisps. Light all 6 lamps. Dodge the drifting mines.',
      'WASD or arrow keys to sail  ·  Space to dash',
      'P to pause  ·  M for sound',
      'Carry up to 3 wisps, then touch a dark lighthouse to light it.',
      best > 0 ? `Best score: ${best}` : 'No voyages yet — the river is waiting.',
      'Press Enter or click to set sail',
    ], PALETTE.gold);
    ctx.fillStyle = PALETTE.inkDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'A complete game: sail, gather, deliver, dodge — 6 lamps to light, 3 hearts to lose.',
      VIEW_WIDTH / 2,
      VIEW_HEIGHT - 84,
    );
  }

  function drawPaused() {
    drawPanel('PAUSED', ['The river waits for you.', 'Press P or Enter to keep sailing.'], PALETTE.inkDim);
  }

  function drawWin(world, best) {
    drawPanel('THE RIVER IS LIT', [
      `All ${LAMPS_TO_WIN} lamps burn — score ${world.score}  ·  best ${Math.max(best, world.score)}`,
      `Delivered ${world.delivered} wisps in ${formatTime(world.time)} — best combo x${Math.max(world.bestCombo, 1)}.`,
      'Press R or Enter to sail again',
    ], PALETTE.gold);
  }

  function drawOver(world, best) {
    drawPanel('THE RIVER WENT DARK', [
      `Score ${world.score}  ·  best ${Math.max(best, world.score)}  ·  lamps lit ${lampsLitCount(world)}/${LAMPS_TO_WIN}`,
      'The mines took the last heart — but the wisps are still out there.',
      'Press R or Enter to sail again',
    ], PALETTE.heart);
  }

  return {
    draw(world, screen, best) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PALETTE.skyTop;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      ctx.save();
      if (world.shake > 0) {
        const mag = world.shake * 18;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }
      drawWater(world);
      drawBanks(world);
      drawLighthouses(world);
      drawWisps(world);
      drawMines(world);
      drawMotes(world);
      drawFerry(world);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(world, best);
      if (screen === SCREEN_TITLE) drawTitle(world, best);
      if (screen === SCREEN_PAUSED) drawPaused();
      if (screen === SCREEN_WIN) drawWin(world, best);
      if (screen === SCREEN_OVER) drawOver(world, best);
      ctx.restore();
      if (world.flash > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = `rgba(255, 60, 60, ${world.flash * 0.5})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    },
  };
}
