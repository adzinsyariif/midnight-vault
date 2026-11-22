// Every tuning number and colour for Midnight Vault in one place. The playfield is a fixed
// 1152x768 logical area; the renderer scales it to the window, so no rule below depends on
// the size of the screen the game happens to be shown on.

export const FIELD = { width: 1152, height: 768, hudHeight: 56, wallTop: 56 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  speed: 208,
  /** How close the thief must get to a piece of loot to pocket it (loot sits on furniture). */
  pickupRadius: 44,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 72,
  investigateSpeed: 108,
  /** Multiplier on every guard speed once the vault is cracked and the alarm locks high. */
  getawaySpeedScale: 1.55,
  /** Seconds a guard stands at a waypoint, sweeping the flashlight, before walking on. */
  pauseSeconds: 1.4,
  /** How far the paused sweep swings to each side of the facing, in radians. */
  sweepSwing: 0.85,
  sweepSpeed: 1.5,
  viewRange: 198,
  viewHalfAngle: 0.56,
};

export const CAMERA = {
  viewRange: 218,
  viewHalfAngle: 0.5,
  /** The cone swings this far to each side of its base angle, in radians. */
  sweepSwing: 0.62,
  sweepSpeed: 0.55,
};

export const ALARM = {
  /** Fill per second from a guard's cone: far edge of the cone up to point blank. */
  guardRateFar: 0.26,
  guardRateNear: 0.8,
  /** Fill per second from a camera's cone. */
  cameraRate: 0.3,
  /** How fast the meter drains while nobody can see the thief. */
  drainRate: 0.22,
  /** Once the vault is cracked the meter never falls below this: the run out is loud. */
  getawayFloor: 0.55,
};

export const TOOLS = {
  empCharges: 2,
  empCost: 150,
  empDisableSeconds: 6,
  coins: 3,
  coinCost: 50,
  /** Guards within this distance of a tossed coin hear it and go to look. */
  coinEarshot: 285,
  /** Seconds an investigating guard spends at the coin before returning to patrol. */
  coinLookSeconds: 2.6,
  /** Seconds the coin's ping rings on screen (and the guard's memory of the spot). */
  coinPingSeconds: 4,
};

export const VAULT = {
  /** Seconds of standing at the wheel, exposed, to crack the great vault. */
  crackSeconds: 6,
  /** How close to the wheel the thief must stand for the crack to advance. */
  zoneRadius: 48,
};

/** Par time for the whole job, in seconds; every second under it pays a time bonus. */
export const PAR_SECONDS = 480;
export const TIME_BONUS_PER_SECOND = 2;

export const PALETTE = {
  backdrop: '#07090d',
  hudBar: '#171310',
  hudTrim: '#c9a227',
  text: '#f0e9d8',
  muted: '#9a917e',
  carpet: '#173d2c',
  carpetDark: '#123325',
  wood: '#4a3220',
  woodDark: '#33241a',
  marbleA: '#cfd4d1',
  marbleB: '#aeb6b2',
  brass: '#c9a227',
  gold: '#f2c94c',
  cash: '#7dc95e',
  gem: '#6ee7e0',
  guardCone: 'rgba(255, 176, 66, ',
  cameraCone: 'rgba(140, 225, 235, ',
  dangerCone: 'rgba(255, 70, 50, ',
  alarmLow: '#7dc95e',
  alarmMid: '#f2c94c',
  alarmHigh: '#ff5040',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault-best';

/** Event flags a simulation step can raise, combined with bitwise OR. */
export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_BUSTED = 2;
export const EVENT_ROOM_CLEAR = 4;
export const EVENT_CRACKED = 8;
export const EVENT_WIN = 16;
export const EVENT_SPOTTED = 32;
export const EVENT_EMP = 64;
export const EVENT_COIN = 128;
