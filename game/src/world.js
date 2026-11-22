// The world: the three rooms of the Meridian Trust bank, the state of one night's work, and
// the fixed-step simulation that advances it. Rooms are crossed in order — Lobby, Counting
// House, Grand Vault. Each room's exit door opens when its loot quota is met; the Vault's
// door is the way back to the getaway van and opens only once the great vault is cracked,
// after which the alarm locks high and every guard hurries.
import {
  ALARM, CAMERA, EVENT_BUSTED, EVENT_COIN, EVENT_CRACKED, EVENT_EMP, EVENT_LOOT, EVENT_NONE,
  EVENT_ROOM_CLEAR, EVENT_SPOTTED, EVENT_WIN, FIELD, GUARD, PAR_SECONDS, TIME_BONUS_PER_SECOND,
  TOOLS, VAULT,
} from './config.js';
import { coneSees, distance } from './vision.js';
import { createGuard, guardViewAngle, sendGuardToInvestigate, stepGuard } from './guards.js';
import { createCamera, disableCameras, stepCamera } from './cameras.js';
import { stepPlayer } from './player.js';

export {
  EVENT_NONE, EVENT_LOOT, EVENT_BUSTED, EVENT_ROOM_CLEAR, EVENT_CRACKED, EVENT_WIN,
  EVENT_SPOTTED, EVENT_EMP, EVENT_COIN,
};

const DEG = Math.PI / 180;

/** The room's outer walls as blocker rectangles (the HUD bar sits above the top wall). */
function borderWalls() {
  return [
    { x: 0, y: FIELD.wallTop, w: FIELD.width, h: 18, kind: 'wall' },
    { x: 0, y: 750, w: FIELD.width, h: 18, kind: 'wall' },
    { x: 0, y: FIELD.wallTop, w: 16, h: 712, kind: 'wall' },
    { x: 1136, y: FIELD.wallTop, w: 16, h: 712, kind: 'wall' },
  ];
}

function cover(x, y, w, h, kind) {
  return { x, y, w, h, kind };
}

function lootItem(x, y, kind, value) {
  return { x, y, kind, value, taken: false };
}

/**
 * The three rooms. Cover rectangles block both movement and sight, and their layout always
 * leaves at least two lanes across: down the sides, through the middle, behind the furniture.
 */
export const ROOM_DEFS = [
  {
    name: 'I. The Lobby',
    floor: 'marble',
    quota: 600,
    spawn: { x: 70, y: 690 },
    exit: { x: 1000, y: 74, w: 90, h: 24 },
    van: null,
    vaultWheel: null,
    cover: [
      cover(180, 180, 150, 54, 'desk'), cover(180, 330, 150, 54, 'desk'), cover(180, 480, 150, 54, 'desk'),
      cover(700, 180, 150, 54, 'desk'), cover(700, 330, 150, 54, 'desk'),
      cover(400, 560, 280, 44, 'counter'),
      cover(520, 200, 44, 44, 'pillar'), cover(520, 430, 44, 44, 'pillar'), cover(940, 470, 44, 44, 'pillar'),
      cover(380, 116, 64, 36, 'planter'), cover(880, 116, 64, 36, 'planter'), cover(420, 660, 64, 36, 'planter'),
    ],
    loot: [
      lootItem(255, 192, 'cash', 150), lootItem(255, 342, 'cash', 150),
      lootItem(775, 192, 'cash', 200), lootItem(775, 342, 'cash', 150),
      lootItem(540, 548, 'cash', 200), lootItem(990, 640, 'cash', 150),
    ],
    guards: [
      { name: 'Guard Dario', waypoints: [[100, 168], [1000, 168], [1000, 282], [100, 282]] },
      { name: 'Guard Marta', waypoints: [[100, 715], [900, 715], [900, 420], [1000, 420], [1000, 715]] },
    ],
    cameras: [
      { name: 'Lobby Camera', x: 576, y: 80, baseAngle: 90 * DEG, phase: 0 },
    ],
    lamps: [{ x: 300, y: 300, r: 165 }, { x: 850, y: 300, r: 165 }, { x: 576, y: 620, r: 150 }],
  },
  {
    name: 'II. The Counting House',
    floor: 'wood',
    quota: 900,
    spawn: { x: 70, y: 690 },
    exit: { x: 1000, y: 74, w: 90, h: 24 },
    van: null,
    vaultWheel: null,
    cover: [
      cover(140, 300, 380, 40, 'counter'), cover(640, 300, 380, 40, 'counter'),
      cover(180, 480, 140, 50, 'desk'), cover(460, 480, 140, 50, 'desk'), cover(740, 480, 140, 50, 'desk'),
      cover(240, 140, 54, 54, 'crate'), cover(880, 140, 54, 54, 'crate'), cover(560, 616, 54, 54, 'crate'),
      cover(90, 140, 40, 40, 'pillar'), cover(1000, 460, 40, 40, 'pillar'),
    ],
    loot: [
      lootItem(320, 288, 'cash', 200), lootItem(820, 288, 'cash', 200),
      lootItem(250, 468, 'gold', 250), lootItem(810, 468, 'gold', 250),
      lootItem(600, 590, 'cash', 150), lootItem(1064, 240, 'gem', 300),
    ],
    guards: [
      { name: 'Guard Felix', waypoints: [[80, 230], [1070, 230], [1070, 590], [80, 590]] },
      { name: 'Guard Ines', waypoints: [[580, 120], [580, 270], [860, 270], [860, 120]] },
    ],
    cameras: [
      { name: 'Counting Camera West', x: 60, y: 80, baseAngle: 65 * DEG, phase: 0 },
      { name: 'Counting Camera East', x: 1092, y: 80, baseAngle: 115 * DEG, phase: 2.1 },
    ],
    lamps: [{ x: 300, y: 200, r: 160 }, { x: 850, y: 200, r: 160 }, { x: 576, y: 540, r: 150 }],
  },
  {
    name: 'III. The Grand Vault',
    floor: 'carpet',
    quota: 0,
    spawn: { x: 210, y: 690 },
    exit: null,
    van: { x: 30, y: 612, w: 110, h: 64 },
    vaultWheel: { x: 576, y: 300 },
    cover: [
      cover(830, 300, 46, 46, 'pillar'), cover(830, 520, 46, 46, 'pillar'),
      cover(250, 300, 46, 46, 'pillar'), cover(250, 520, 46, 46, 'pillar'),
      cover(430, 420, 58, 58, 'crate'), cover(664, 420, 58, 58, 'crate'),
      cover(110, 380, 110, 42, 'case'), cover(932, 380, 110, 42, 'case'),
      cover(480, 620, 64, 36, 'planter'), cover(608, 620, 64, 36, 'planter'),
    ],
    loot: [
      lootItem(165, 368, 'gold', 300), lootItem(987, 368, 'gold', 300),
      lootItem(576, 585, 'gem', 400), lootItem(330, 655, 'gold', 250), lootItem(822, 655, 'cash', 250),
    ],
    guards: [
      { name: 'Guard Bruno', waypoints: [[180, 365], [900, 365], [900, 600], [180, 600]] },
      { name: 'Guard Cato', waypoints: [[400, 330], [752, 330], [752, 395], [400, 395]] },
      { name: 'Guard Rhea', waypoints: [[120, 715], [1030, 715]], pingpong: true },
    ],
    cameras: [
      { name: 'Vault Camera West', x: 36, y: 80, baseAngle: 70 * DEG, phase: 0 },
      { name: 'Vault Camera East', x: 1116, y: 80, baseAngle: 110 * DEG, phase: 1.4 },
    ],
    lamps: [{ x: 576, y: 200, r: 200 }, { x: 250, y: 450, r: 140 }, { x: 900, y: 450, r: 140 }],
  },
];

/** The score for a finished night: the take, minus what the tools cost, plus the time bonus. */
export function finalScore(state) {
  return state.totalLoot - state.spentOnTools + timeBonus(state);
}

/** The time bonus: two dollars for every second of par the night came in under. */
export function timeBonus(state) {
  return Math.max(0, Math.floor(PAR_SECONDS - state.time)) * TIME_BONUS_PER_SECOND;
}

/** The rank a finished night earns, from how often the thief was truly seen. */
export function rankFor(state) {
  if (state.spotCount === 0) return 'GHOST';
  if (state.spotCount === 1) return 'PHANTOM';
  if (state.spotCount <= 3) return 'SHADOW';
  return 'LOUD';
}

/** Create the world: fresh state, room one loaded, ready for step() calls. */
export function createWorld() {
  const state = {
    roomIndex: 0,
    roomName: ROOM_DEFS[0].name,
    floor: ROOM_DEFS[0].floor,
    time: 0,
    roomTime: 0,
    player: { x: 0, y: 0, angle: -Math.PI / 2, moving: false, cracking: false },
    guards: [],
    cameras: [],
    loot: [],
    cover: [],
    blockers: [],
    lamps: [],
    exit: null,
    van: null,
    vaultWheel: null,
    quota: 0,
    roomLoot: 0,
    totalLoot: 0,
    spentOnTools: 0,
    alarm: 0,
    seenNow: false,
    spotterName: '',
    everSpotted: false,
    spotCount: 0,
    wasSeen: false,
    empLeft: TOOLS.empCharges,
    coinsLeft: TOOLS.coins,
    coinPing: null,
    crackProgress: 0,
    vaultCracked: false,
    getaway: false,
    exitUnlocked: false,
    bustedBy: '',
    won: false,
  };

  /** Load a room fresh: its furniture, loot, patrols and cameras, the thief at its door. */
  function enterRoom(index) {
    const def = ROOM_DEFS[index];
    state.roomIndex = index;
    state.roomName = def.name;
    state.floor = def.floor;
    state.roomTime = 0;
    state.cover = def.cover;
    state.blockers = borderWalls().concat(def.cover);
    state.loot = def.loot.map((item) => ({ ...item }));
    state.guards = def.guards.map((g) => createGuard(g));
    state.cameras = def.cameras.map((c) => createCamera(c));
    state.lamps = def.lamps;
    state.exit = def.exit;
    state.van = def.van;
    state.vaultWheel = def.vaultWheel;
    state.quota = def.quota;
    state.roomLoot = 0;
    state.player.x = def.spawn.x;
    state.player.y = def.spawn.y;
    state.player.angle = -Math.PI / 2;
    state.player.moving = false;
    state.player.cracking = false;
    state.coinPing = null;
    state.crackProgress = 0;
    state.exitUnlocked = def.quota <= 0 && def.vaultWheel === null;
    updateExitLock();
  }

  /** The exit door's lock follows the room's rule: quota met, or the vault cracked. */
  function updateExitLock() {
    if (state.vaultWheel) state.exitUnlocked = state.vaultCracked;
    else if (state.quota > 0) state.exitUnlocked = state.roomLoot >= state.quota;
  }

  /** Start the night over from the lobby, everything reset. */
  function reset() {
    state.time = 0;
    state.totalLoot = 0;
    state.spentOnTools = 0;
    state.alarm = 0;
    state.seenNow = false;
    state.spotterName = '';
    state.everSpotted = false;
    state.spotCount = 0;
    state.wasSeen = false;
    state.empLeft = TOOLS.empCharges;
    state.coinsLeft = TOOLS.coins;
    state.vaultCracked = false;
    state.getaway = false;
    state.bustedBy = '';
    state.won = false;
    enterRoom(0);
  }

  /** After a bust: the same room again, its loot handed back, the take from earlier rooms kept. */
  function retryRoom() {
    state.totalLoot -= state.roomLoot;
    state.alarm = 0;
    state.seenNow = false;
    state.wasSeen = false;
    state.bustedBy = '';
    const cracked = state.vaultCracked;
    enterRoom(state.roomIndex);
    if (cracked) {
      // Being caught on the way out does not re-lock a cracked vault.
      state.vaultCracked = true;
      state.getaway = true;
      state.crackProgress = 1;
      updateExitLock();
    }
  }

  /** Fire the EMP: every camera in the room goes dark, and the score pays for the pulse. */
  function fireEmp(events) {
    if (state.empLeft <= 0) return events;
    state.empLeft -= 1;
    state.spentOnTools += TOOLS.empCost;
    disableCameras(state.cameras, TOOLS.empDisableSeconds);
    return events | EVENT_EMP;
  }

  /** Toss a coin to a floor point: nearby guards leave their routes to look at it. */
  function tossCoin(x, y, events) {
    if (state.coinsLeft <= 0) return events;
    state.coinsLeft -= 1;
    state.spentOnTools += TOOLS.coinCost;
    state.coinPing = { x, y, timer: TOOLS.coinPingSeconds };
    for (let i = 0; i < state.guards.length; i += 1) {
      const guard = state.guards[i];
      if (distance(guard.x, guard.y, x, y) <= TOOLS.coinEarshot) sendGuardToInvestigate(guard, x, y);
    }
    return events | EVENT_COIN;
  }

  /** Ask every cone in the room whether it holds the thief, and move the alarm accordingly. */
  function senseThief(dt) {
    let best = null;
    for (let i = 0; i < state.guards.length; i += 1) {
      const guard = state.guards[i];
      const seen = coneSees(guard, guardViewAngle(guard), GUARD.viewRange, GUARD.viewHalfAngle, state.player, state.blockers);
      guard.spotting = seen !== null;
      if (seen && (best === null || seen.closeness > best.closeness)) {
        best = { closeness: seen.closeness, rate: ALARM.guardRateFar + (ALARM.guardRateNear - ALARM.guardRateFar) * seen.closeness, name: guard.name };
      }
    }
    for (let i = 0; i < state.cameras.length; i += 1) {
      const camera = state.cameras[i];
      if (camera.disabled > 0) {
        camera.spotting = false;
        continue;
      }
      const seen = coneSees(camera, camera.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, state.player, state.blockers);
      camera.spotting = seen !== null;
      if (seen && (best === null || seen.closeness > best.closeness)) {
        best = { closeness: seen.closeness, rate: ALARM.cameraRate, name: camera.name };
      }
    }
    state.seenNow = best !== null;
    if (best !== null) {
      state.spotterName = best.name;
      state.alarm = Math.min(1, state.alarm + best.rate * dt);
      if (!state.wasSeen) {
        state.everSpotted = true;
        state.spotCount += 1;
      }
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.drainRate * dt);
    }
    if (state.getaway) state.alarm = Math.max(state.alarm, ALARM.getawayFloor);
    state.wasSeen = state.seenNow;
  }

  /**
   * Advance the night by dt seconds. input: { moveX, moveY, emp, coin: {x, y} | null }.
   * Returns the EVENT_* flags raised by this step.
   */
  function step(dt, input) {
    if (state.won) return EVENT_NONE;
    let events = EVENT_NONE;
    state.time += dt;
    state.roomTime += dt;
    if (input.emp) events = fireEmp(events);
    if (input.coin) events = tossCoin(input.coin.x, input.coin.y, events);
    if (state.coinPing) {
      state.coinPing.timer -= dt;
      if (state.coinPing.timer <= 0) state.coinPing = null;
    }
    const speedScale = state.getaway ? GUARD.getawaySpeedScale : 1;
    for (let i = 0; i < state.guards.length; i += 1) stepGuard(state.guards[i], dt, speedScale);
    for (let i = 0; i < state.cameras.length; i += 1) stepCamera(state.cameras[i], dt, state.roomTime);
    events |= stepPlayer(state, input, dt);
    if (events & EVENT_CRACKED) {
      state.getaway = true;
    }
    if (events & EVENT_ROOM_CLEAR) {
      enterRoom(state.roomIndex + 1);
      return events;
    }
    if (events & EVENT_WIN) {
      state.won = true;
      return events;
    }
    updateExitLock();
    const wasSeenBefore = state.seenNow;
    senseThief(dt);
    if (state.seenNow && !wasSeenBefore) events |= EVENT_SPOTTED;
    if (state.alarm >= 1) {
      state.bustedBy = state.spotterName;
      events |= EVENT_BUSTED;
    }
    return events;
  }

  enterRoom(0);
  return { state, reset, retryRoom, enterRoom, step };
}

/** Seconds the vault wheel still needs, for the HUD and the crack ring. */
export function crackSecondsLeft(state) {
  return Math.max(0, VAULT.crackSeconds * (1 - state.crackProgress));
}
