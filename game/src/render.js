// The renderer: paints the bank from the world state, nothing else. Floors and furniture
// first, then the vision cones (furniture drawn over them is what makes cover read as cover),
// loot, the thief and the guards, a darkness pass with pools of lamplight, the HUD, and —
// over everything — the title, busted and getaway panels.
import { ALARM, FIELD, FONT, GUARD, CAMERA, PALETTE } from './config.js';
import { finalScore, rankFor, timeBonus } from './world.js';
import { guardViewAngle } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WIN = 'win';

const TAU = Math.PI * 2;

/** Format a dollar amount the way the HUD and panels show it. */
export function formatMoney(value) {
  return '$' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Format seconds as m:ss. */
export function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Create the renderer bound to the canvas; draw(state, screen, best) paints one frame. */
export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');
  const shade = document.createElement('canvas');
  shade.width = FIELD.width;
  shade.height = FIELD.height;
  const shadeCtx = shade.getContext('2d');

  function draw(state, screen, best) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawFloor(state);
    drawWalls(state);
    if (state.vaultWheel) drawVaultDoor(state);
    if (state.exit) drawExitDoor(state);
    if (state.van) drawVan(state);
    drawCones(state);
    drawCover(state);
    drawLoot(state);
    if (state.coinPing) drawCoinPing(state);
    for (let i = 0; i < state.guards.length; i += 1) drawGuard(state, state.guards[i]);
    drawThief(state);
    drawDarkness(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_BUSTED) drawBusted(state);
    else if (screen === SCREEN_WIN) drawWin(state, best);
  }

  /** The floor: checker marble in the lobby, wood planks in the counting house, green carpet in the vault. */
  function drawFloor(state) {
    const top = FIELD.wallTop;
    if (state.floor === 'marble') {
      ctx.fillStyle = '#272c2e';
      ctx.fillRect(0, top, FIELD.width, FIELD.height - top);
      const tile = 48;
      for (let y = top; y < FIELD.height; y += tile) {
        for (let x = 0; x < FIELD.width; x += tile) {
          const odd = ((x / tile) + (y / tile)) % 2 === 0;
          ctx.fillStyle = odd ? 'rgba(207,212,209,0.10)' : 'rgba(120,130,126,0.10)';
          ctx.fillRect(x, y, tile, tile);
        }
      }
    } else if (state.floor === 'wood') {
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(0, top, FIELD.width, FIELD.height - top);
      for (let y = top; y < FIELD.height; y += 32) {
        ctx.fillStyle = ((y - top) / 32) % 2 === 0 ? 'rgba(255,220,160,0.05)' : 'rgba(0,0,0,0.10)';
        ctx.fillRect(0, y, FIELD.width, 32);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, y, FIELD.width, 2);
      }
    } else {
      ctx.fillStyle = PALETTE.carpet;
      ctx.fillRect(0, top, FIELD.width, FIELD.height - top);
      ctx.fillStyle = PALETTE.carpetDark;
      ctx.fillRect(26, top + 26, FIELD.width - 52, FIELD.height - top - 52);
      ctx.strokeStyle = PALETTE.brass;
      ctx.lineWidth = 3;
      ctx.strokeRect(26, top + 26, FIELD.width - 52, FIELD.height - top - 52);
      ctx.fillStyle = 'rgba(242,201,76,0.08)';
      for (let y = top + 70; y < FIELD.height - 40; y += 56) {
        for (let x = 70; x < FIELD.width - 40; x += 56) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  /** The outer walls: dark wood with a brass rail, so the room reads as a bank, not a maze. */
  function drawWalls(state) {
    for (let i = 0; i < state.blockers.length; i += 1) {
      const wall = state.blockers[i];
      if (wall.kind !== 'wall') continue;
      ctx.fillStyle = '#241a12';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = 'rgba(201,162,39,0.5)';
      if (wall.w > wall.h) ctx.fillRect(wall.x, wall.y + wall.h - 3, wall.w, 3);
      else ctx.fillRect(wall.x + wall.w - 3, wall.y, 3, wall.h);
    }
  }

  /** The great vault door: a huge gold circle of rings and spokes set into the top wall. */
  function drawVaultDoor(state) {
    const cx = 576;
    const cy = 185;
    const r = 100;
    const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.5);
    glow.addColorStop(0, 'rgba(242,201,76,0.20)');
    glow.addColorStop(1, 'rgba(242,201,76,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);
    ctx.fillStyle = '#8a6d1f';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath(); ctx.arc(cx, cy, r - 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a8842a';
    ctx.beginPath(); ctx.arc(cx, cy, r - 26, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6e5518';
    ctx.lineWidth = 5;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
      ctx.lineTo(cx + Math.cos(a) * (r - 30), cy + Math.sin(a) * (r - 30));
      ctx.stroke();
    }
    ctx.fillStyle = state.vaultCracked ? '#7dc95e' : '#54430f';
    ctx.beginPath(); ctx.arc(cx, cy, 17, 0, TAU); ctx.fill();
    // The name plaque sits on the wall above the door, clear of the wheel and the thief.
    ctx.fillStyle = state.vaultCracked ? '#7dc95e' : PALETTE.brass;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(state.vaultCracked ? '— VAULT OPEN —' : '— THE MERIDIAN VAULT —', cx, 71);
    // The wheel the thief must stand at, and the ring that fills while he cracks it.
    const wheel = state.vaultWheel;
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(wheel.x, wheel.y, 15, 0, TAU); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wheel.x - 15, wheel.y); ctx.lineTo(wheel.x + 15, wheel.y);
    ctx.moveTo(wheel.x, wheel.y - 15); ctx.lineTo(wheel.x, wheel.y + 15);
    ctx.stroke();
    if (!state.vaultCracked && state.crackProgress > 0) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(wheel.x, wheel.y, 26, -Math.PI / 2, -Math.PI / 2 + state.crackProgress * TAU);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(`CRACKING ${Math.round(state.crackProgress * 100)}%`, wheel.x, wheel.y + 52);
    }
  }

  /** The exit door in the top wall: red and labelled with the quota until it opens green. */
  function drawExitDoor(state) {
    const exit = state.exit;
    ctx.fillStyle = state.exitUnlocked ? '#2e7d46' : '#6e2a24';
    ctx.fillRect(exit.x, FIELD.wallTop, exit.w, 34);
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 2;
    ctx.strokeRect(exit.x, FIELD.wallTop, exit.w, 34);
    ctx.fillStyle = '#f0e9d8';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    const label = state.exitUnlocked ? 'EXIT — OPEN' : `EXIT — ${formatMoney(state.roomLoot)} / ${formatMoney(state.quota)}`;
    ctx.fillText(label, exit.x + exit.w / 2, FIELD.wallTop + 58);
  }

  /** The getaway van waiting at the vault room's entrance, headlights on once the vault is open. */
  function drawVan(state) {
    const van = state.van;
    ctx.fillStyle = '#2b3a4a';
    ctx.fillRect(van.x, van.y, van.w, van.h);
    ctx.fillStyle = '#3d5a74';
    ctx.fillRect(van.x + van.w - 30, van.y + 8, 22, van.h - 16);
    ctx.fillStyle = '#10151c';
    ctx.beginPath();
    ctx.arc(van.x + 22, van.y + van.h - 4, 10, 0, TAU);
    ctx.arc(van.x + van.w - 22, van.y + van.h - 4, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = state.vaultCracked ? '#ffe9a3' : '#5a6672';
    ctx.beginPath();
    ctx.arc(van.x + van.w - 6, van.y + 14, 5, 0, TAU);
    ctx.arc(van.x + van.w - 6, van.y + van.h - 14, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f0e9d8';
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('GETAWAY VAN', van.x + van.w / 2, van.y - 8);
  }

  /** One vision cone, clipped by range and angle; red while it holds the thief. */
  function drawCone(x, y, angle, range, halfAngle, colour, spotting) {
    const gradient = ctx.createRadialGradient(x, y, 8, x, y, range);
    const rgb = spotting ? PALETTE.dangerCone : colour;
    gradient.addColorStop(0, rgb + '0.34)');
    gradient.addColorStop(1, rgb + '0.03)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    ctx.closePath();
    ctx.fill();
  }

  /** Every cone in the room: cameras first, then the guards' flashlights. */
  function drawCones(state) {
    for (let i = 0; i < state.cameras.length; i += 1) {
      const camera = state.cameras[i];
      if (camera.disabled > 0) continue;
      drawCone(camera.x, camera.y, camera.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, PALETTE.cameraCone, camera.spotting);
    }
    for (let i = 0; i < state.guards.length; i += 1) {
      const guard = state.guards[i];
      drawCone(guard.x, guard.y, guardViewAngle(guard), GUARD.viewRange, GUARD.viewHalfAngle, PALETTE.guardCone, guard.spotting);
    }
  }

  /** The furniture: desks, counters, pillars, crates, planters and display cases. */
  function drawCover(state) {
    for (let i = 0; i < state.cover.length; i += 1) {
      const c = state.cover[i];
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(c.x + 4, c.y + 5, c.w, c.h);
      if (c.kind === 'desk') {
        ctx.fillStyle = PALETTE.wood;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = 'rgba(240,233,216,0.85)';
        ctx.fillRect(c.x + 12, c.y + 10, 26, 16);
        ctx.fillRect(c.x + c.w - 42, c.y + c.h - 24, 26, 16);
        ctx.fillStyle = PALETTE.brass;
        ctx.fillRect(c.x, c.y, c.w, 4);
      } else if (c.kind === 'counter') {
        ctx.fillStyle = PALETTE.wood;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = PALETTE.brass;
        ctx.fillRect(c.x, c.y + 4, c.w, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(c.x, c.y + c.h - 8, c.w, 8);
      } else if (c.kind === 'pillar') {
        ctx.fillStyle = '#5a5e60';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = PALETTE.brass;
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x + 6, c.y + 6, c.w - 12, c.h - 12);
      } else if (c.kind === 'crate') {
        ctx.fillStyle = '#6b4a2a';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = '#3d2a16';
        ctx.lineWidth = 4;
        ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
        ctx.beginPath();
        ctx.moveTo(c.x + 4, c.y + 4); ctx.lineTo(c.x + c.w - 4, c.y + c.h - 4);
        ctx.moveTo(c.x + c.w - 4, c.y + 4); ctx.lineTo(c.x + 4, c.y + c.h - 4);
        ctx.stroke();
      } else if (c.kind === 'planter') {
        ctx.fillStyle = '#2c4a34';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = '#3f7a4c';
        for (let k = 0; k < 4; k += 1) {
          ctx.beginPath();
          ctx.arc(c.x + 12 + k * (c.w - 20) / 3, c.y + c.h / 2, 9, 0, TAU);
          ctx.fill();
        }
      } else if (c.kind === 'case') {
        ctx.fillStyle = '#1d2733';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = PALETTE.brass;
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
        ctx.fillStyle = 'rgba(160,220,235,0.16)';
        ctx.fillRect(c.x + 6, c.y + 5, c.w - 12, 10);
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(c.x + c.w / 2, c.y + c.h - 13, 5, 0, TAU);
        ctx.fill();
      }
    }
    // The cameras themselves: a dark box on the wall, a lens, and sparks while EMP'd.
    for (let i = 0; i < state.cameras.length; i += 1) {
      const camera = state.cameras[i];
      ctx.fillStyle = '#14181f';
      ctx.fillRect(camera.x - 11, camera.y - 8, 22, 16);
      ctx.fillStyle = camera.disabled > 0 ? '#444c55' : (camera.spotting ? '#ff5040' : '#8ce1eb');
      ctx.beginPath();
      ctx.arc(camera.x + Math.cos(camera.angle) * 6, camera.y + Math.sin(camera.angle) * 6, 4, 0, TAU);
      ctx.fill();
      if (camera.disabled > 0) {
        ctx.strokeStyle = '#ffd94d';
        ctx.lineWidth = 2;
        for (let s = 0; s < 3; s += 1) {
          const a = camera.phase + s * 2.1 + Math.floor(state.roomTime * 9 + s) % 3;
          ctx.beginPath();
          ctx.moveTo(camera.x, camera.y);
          ctx.lineTo(camera.x + Math.cos(a) * 15, camera.y + Math.sin(a) * 15);
          ctx.stroke();
        }
        ctx.fillStyle = '#ffd94d';
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('OFFLINE', camera.x, camera.y + 26);
      }
    }
  }

  /** Loot still on the floor plan: cash stacks, gold bars and gems, glowing against the dark. */
  function drawLoot(state) {
    for (let i = 0; i < state.loot.length; i += 1) {
      const item = state.loot[i];
      if (item.taken) continue;
      const glow = ctx.createRadialGradient(item.x, item.y, 2, item.x, item.y, 30);
      glow.addColorStop(0, 'rgba(242,201,76,0.35)');
      glow.addColorStop(1, 'rgba(242,201,76,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(item.x - 30, item.y - 30, 60, 60);
      if (item.kind === 'cash') {
        ctx.fillStyle = '#4e9b3a';
        ctx.fillRect(item.x - 13, item.y - 8, 26, 16);
        ctx.fillStyle = '#7dc95e';
        ctx.fillRect(item.x - 13, item.y - 3, 26, 6);
        ctx.fillStyle = '#e9f5e0';
        ctx.fillRect(item.x - 3, item.y - 8, 6, 16);
      } else if (item.kind === 'gold') {
        ctx.fillStyle = '#d9a92c';
        ctx.fillRect(item.x - 14, item.y - 2, 28, 9);
        ctx.fillStyle = '#f2c94c';
        ctx.fillRect(item.x - 9, item.y - 11, 18, 9);
      } else {
        ctx.fillStyle = '#6ee7e0';
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - 12);
        ctx.lineTo(item.x + 10, item.y);
        ctx.lineTo(item.x, item.y + 12);
        ctx.lineTo(item.x - 10, item.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - 12);
        ctx.lineTo(item.x + 5, item.y - 2);
        ctx.lineTo(item.x - 5, item.y - 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /** The expanding rings of a tossed coin's ping. */
  function drawCoinPing(state) {
    const ping = state.coinPing;
    const age = 1 - ping.timer / 4;
    ctx.strokeStyle = 'rgba(255,233,163,0.8)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 3; r += 1) {
      const radius = 8 + ((age * 90 + r * 22) % 66);
      ctx.globalAlpha = Math.max(0, 0.75 - radius / 90);
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, radius, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe9a3';
    ctx.beginPath();
    ctx.arc(ping.x, ping.y, 4, 0, TAU);
    ctx.fill();
  }

  /** A guard: navy uniform and cap, a brass badge, and a warning mark while he spots you. */
  function drawGuard(state, guard) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(guard.x, guard.y + 11, 13, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#26355e';
    ctx.beginPath(); ctx.arc(guard.x, guard.y, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b2745';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, guard.angle - 2.2, guard.angle + 2.2);
    ctx.lineTo(guard.x, guard.y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.brass;
    ctx.beginPath(); ctx.arc(guard.x, guard.y, 3, 0, TAU); ctx.fill();
    if (guard.spotting) {
      ctx.fillStyle = '#ff5040';
      ctx.font = `bold 22px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 22);
    } else if (guard.mode === 'investigate' || guard.mode === 'look') {
      ctx.fillStyle = '#ffe9a3';
      ctx.font = `bold 17px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('?', guard.x, guard.y - 20);
    }
  }

  /** The thief: dark clothes, a cream-banded flat cap, a warm pool of light at his feet, and the loot sack on his back. */
  function drawThief(state) {
    const player = state.player;
    // A warm pool of light at his feet, subtler than the loot's glow, so he reads against the dark floor.
    const glow = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, 38);
    glow.addColorStop(0, 'rgba(242,201,76,0.20)');
    glow.addColorStop(1, 'rgba(242,201,76,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(player.x - 38, player.y - 38, 76, 76);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(player.x, player.y + 12, 14, 5, 0, 0, TAU); ctx.fill();
    // The sack slung on his back, opposite the way he faces: plain dark canvas while it is
    // empty, tan with a dark $ once it holds the night's take.
    const bagX = player.x - Math.cos(player.angle) * 12;
    const bagY = player.y - Math.sin(player.angle) * 12;
    if (state.totalLoot > 0) {
      ctx.fillStyle = '#c9a35f';
      ctx.beginPath(); ctx.arc(bagX, bagY, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8a6d3b';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bagX, bagY, 9, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#4a3517';
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('$', bagX, bagY + 4);
    } else {
      ctx.fillStyle = '#5c4a2a';
      ctx.beginPath(); ctx.arc(bagX, bagY, 8, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#22262e';
    ctx.beginPath(); ctx.arc(player.x, player.y, 15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#454c59';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(player.x, player.y, 14, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#12151a';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 14.5, player.angle - 1.9, player.angle + 1.9);
    ctx.lineTo(player.x + Math.cos(player.angle) * 19, player.y + Math.sin(player.angle) * 19);
    ctx.closePath(); ctx.fill();
    // The pale band across his cap, so his head stays readable at a glance.
    ctx.strokeStyle = '#e9dfc8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 9, player.angle - 1.25, player.angle + 1.25);
    ctx.stroke();
    if (player.cracking) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('...', player.x, player.y - 22);
    }
  }

  /** Darkness with pools of light: lamps, flashlights, the thief's own small pool, the vault's glow. */
  function drawDarkness(state) {
    shadeCtx.clearRect(0, 0, FIELD.width, FIELD.height);
    shadeCtx.fillStyle = 'rgba(4,6,11,0.47)';
    shadeCtx.fillRect(0, 0, FIELD.width, FIELD.height);
    shadeCtx.globalCompositeOperation = 'destination-out';
    const pools = state.lamps.map((lamp) => ({ x: lamp.x, y: lamp.y, r: lamp.r, a: 0.9 }));
    for (let i = 0; i < state.guards.length; i += 1) pools.push({ x: state.guards[i].x, y: state.guards[i].y, r: 95, a: 0.45 });
    pools.push({ x: state.player.x, y: state.player.y, r: 85, a: 0.6 });
    for (let i = 0; i < pools.length; i += 1) {
      const pool = pools[i];
      const gradient = shadeCtx.createRadialGradient(pool.x, pool.y, 4, pool.x, pool.y, pool.r);
      gradient.addColorStop(0, `rgba(0,0,0,${pool.a})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      shadeCtx.fillStyle = gradient;
      shadeCtx.fillRect(pool.x - pool.r, pool.y - pool.r, pool.r * 2, pool.r * 2);
    }
    shadeCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(shade, 0, 0);
    if (state.alarm > 0.7 && !state.won) {
      const pulse = 0.10 + 0.06 * Math.sin(state.time * 10);
      ctx.strokeStyle = `rgba(255,60,40,${pulse + 0.12})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, FIELD.width - 10, FIELD.height - 10);
    }
  }

  /** The top bar: room, the take, the segmented ALARM meter, the tools left, and the clock. */
  function drawHud(state) {
    ctx.fillStyle = PALETTE.hudBar;
    ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(0, FIELD.hudHeight - 3, FIELD.width, 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillText(state.roomName, 16, 35);
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`TAKE ${formatMoney(state.totalLoot)}`, 300, 35);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    const objective = state.vaultWheel
      ? (state.getaway ? 'REACH THE VAN' : 'CRACK THE VAULT')
      : `EXIT AT ${formatMoney(state.quota)}`;
    ctx.fillText(objective, 300, 51);
    // The alarm meter: twelve segments that fill green, amber, then red.
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillStyle = state.seenNow ? PALETTE.alarmHigh : PALETTE.text;
    ctx.fillText('ALARM', 545, 22);
    const segments = 12;
    const filled = Math.round(state.alarm * segments);
    for (let i = 0; i < segments; i += 1) {
      const x = 545 + i * 17;
      const on = i < filled;
      const ratio = i / segments;
      ctx.fillStyle = !on ? '#33302a' : ratio < 0.45 ? PALETTE.alarmLow : ratio < 0.75 ? PALETTE.alarmMid : PALETTE.alarmHigh;
      if (on && state.alarm > 0.55 && i === filled - 1 && Math.sin(state.time * 10) > 0) ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, 28, 14, 16);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`EMP x${state.empLeft} [E]`, 905, 35);
    ctx.fillText(`COIN x${state.coinsLeft}`, 1005, 35);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(formatTime(state.time), 1136, 35);
    ctx.textAlign = 'left';
  }

  /** A centred panel with a title and lines of text, used by every non-play screen. */
  function drawPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(3,5,8,0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 620;
    const h = 92 + lines.length * 30;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    ctx.fillStyle = '#171310';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, y + 58);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `17px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, y + 100 + i * 30));
    ctx.textAlign = 'left';
  }

  function drawTitle(state, best) {
    drawPanel('MIDNIGHT VAULT', [
      'Three rooms. One vault. Every guard and camera is watching.',
      'WASD / arrows to move — reach the loot quota to open each exit.',
      'Click a floor point to toss a coin. E fires the EMP (cameras dark, 6s).',
      'Fill the ALARM meter and the night is over. M mutes.',
      best > 0 ? `Best take so far: ${formatMoney(best)}` : '',
      'Click or press Enter to go in.',
    ], PALETTE.brass);
  }

  function drawPaused() {
    drawPanel('PAUSED', ['Press P or click to go back in.'], PALETTE.muted);
  }

  function drawBusted(state) {
    drawPanel('BUSTED', [
      `Spotted by ${state.bustedBy}. The alarm hit the top.`,
      'This room resets and its loot goes back — earlier rooms stay banked.',
      'Click or press Enter to try the room again.',
    ], PALETTE.alarmHigh);
  }

  function drawWin(state, best) {
    const score = finalScore(state);
    drawPanel('CLEAN GETAWAY', [
      `The take: ${formatMoney(state.totalLoot)}`,
      `Tools cost: -${formatMoney(state.spentOnTools)}`,
      `Time bonus: +${formatMoney(timeBonus(state))}  (${formatTime(state.time)})`,
      `FINAL SCORE: ${formatMoney(score)}`,
      `Rank: ${rankFor(state)}${state.spotCount === 0 ? ' — never seen, start to finish' : ` — seen ${state.spotCount} time${state.spotCount === 1 ? '' : 's'}`}`,
      best > 0 ? `Best: ${formatMoney(Math.max(best, score))}` : '',
      'Click or press Enter to run it again.',
    ], PALETTE.alarmLow);
  }

  return { draw };
}
