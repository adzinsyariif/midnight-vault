// The thief: keyboard movement with furniture collision, pocketing loot he gets close to,
// standing exposed at the vault wheel while the crack runs, and the two doors that end a
// room — the exit door once its lock opens, and the getaway van once the vault is cracked.
import { EVENT_CRACKED, EVENT_LOOT, EVENT_ROOM_CLEAR, EVENT_WIN, PLAYER, VAULT } from './config.js';
import { distance } from './vision.js';

/** Does a circle at (x, y) overlap any blocker rectangle? */
function circleHitsBlockers(x, y, radius, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    const b = blockers[i];
    const nearX = Math.max(b.x, Math.min(x, b.x + b.w));
    const nearY = Math.max(b.y, Math.min(y, b.y + b.h));
    if (distance(x, y, nearX, nearY) < radius) return true;
  }
  return false;
}

/** Is the thief's circle inside (or overlapping) a rectangle, e.g. a door or the van? */
function circleTouchesRect(x, y, radius, rect) {
  const nearX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return distance(x, y, nearX, nearY) <= radius;
}

/**
 * Advance the thief by dt seconds under `input` ({ moveX, moveY }). Movement is resolved one
 * axis at a time so he slides along desks and pillars instead of sticking to them. Returns
 * the EVENT_* flags the move raised (loot pocketed, vault cracked, room cleared, night won).
 */
export function stepPlayer(state, input, dt) {
  let events = 0;
  const player = state.player;
  const length = Math.hypot(input.moveX, input.moveY);
  player.moving = length > 0.01;
  player.cracking = false;
  if (player.moving) {
    const nx = (input.moveX / length) * PLAYER.speed * dt;
    const ny = (input.moveY / length) * PLAYER.speed * dt;
    player.angle = Math.atan2(input.moveY, input.moveX);
    if (!circleHitsBlockers(player.x + nx, player.y, PLAYER.radius, state.blockers)) player.x += nx;
    if (!circleHitsBlockers(player.x, player.y + ny, PLAYER.radius, state.blockers)) player.y += ny;
  }

  // Loot is pocketed by getting close: it sits on desks and in cases he cannot climb onto.
  for (let i = 0; i < state.loot.length; i += 1) {
    const item = state.loot[i];
    if (!item.taken && distance(player.x, player.y, item.x, item.y) <= PLAYER.pickupRadius) {
      item.taken = true;
      state.roomLoot += item.value;
      state.totalLoot += item.value;
      events |= EVENT_LOOT;
    }
  }

  // The great vault: stand at the wheel and the crack advances; step away and it holds.
  if (state.vaultWheel && !state.vaultCracked) {
    if (distance(player.x, player.y, state.vaultWheel.x, state.vaultWheel.y) <= VAULT.zoneRadius) {
      player.cracking = true;
      state.crackProgress = Math.min(1, state.crackProgress + dt / VAULT.crackSeconds);
      if (state.crackProgress >= 1) {
        state.vaultCracked = true;
        events |= EVENT_CRACKED;
      }
    }
  }

  // Doors: the exit to the next room, or the van and the end of the night.
  if (state.exit && state.exitUnlocked && circleTouchesRect(player.x, player.y, PLAYER.radius, state.exit)) {
    events |= EVENT_ROOM_CLEAR;
  }
  if (state.van && state.vaultCracked && circleTouchesRect(player.x, player.y, PLAYER.radius, state.van)) {
    events |= EVENT_WIN;
  }
  return events;
}
