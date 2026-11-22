// The screenshot scenes behind ?shot=cover|vault|tools|getaway (with &seed=1). Each one loads
// the real room, places the thief, guards and cameras where the scene needs them, then steps
// the real simulation a fixed number of fixed steps so every vision flag, cone and ring is
// the game's own — the same seed always gives the same frame.
import { STEP } from './config.js';
import { GUARD_INVESTIGATE, GUARD_PAUSE, GUARD_PATROL } from './guards.js';
import { SCREEN_PLAY, SCREEN_WIN } from './render.js';

/** Put a guard somewhere specific, standing at a waypoint pause with his sweep centred. */
function placeGuard(guard, x, y, angle, mode) {
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.mode = mode;
  guard.timer = 99;
  guard.sweepPhase = 0;
  guard.spotting = false;
}

/** Step the world a few fixed steps with no input, so cones and spotting flags settle. */
function settle(world, steps) {
  const idle = { moveX: 0, moveY: 0, emp: false, coin: null };
  for (let i = 0; i < steps; i += 1) world.step(STEP, idle);
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best score to
 * show. Any name other than vault, tools or getaway is the cover scene.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();

  if (name === 'vault') {
    // Room III, mid-crack: the thief at the great wheel with the ring half full, two guards
    // closing in with their cones on him, the alarm already loud.
    world.enterRoom(2);
    state.player.x = 576;
    state.player.y = 302;
    state.player.angle = -Math.PI / 2;
    state.crackProgress = 0.55;
    placeGuard(state.guards[1], 455, 335, Math.atan2(302 - 335, 576 - 455), GUARD_PAUSE);
    placeGuard(state.guards[0], 770, 360, Math.PI, GUARD_PAUSE);
    placeGuard(state.guards[2], 300, 640, 0, GUARD_PATROL);
    state.totalLoot = 1500;
    settle(world, 2);
    state.crackProgress = 0.55;
    state.alarm = 0.6;
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'tools') {
    // Room I just after the EMP: the camera is dark and sparking, a tossed coin is pulling
    // Guard Marta off her route, and the thief is slipping down the open east lane past
    // the edge of Guard Dario's cone, some take already banked.
    world.enterRoom(0);
    state.cameras[0].disabled = 5;
    state.coinPing = { x: 640, y: 690, timer: 3.5 };
    const marta = state.guards[1];
    marta.x = 705;
    marta.y = 688;
    marta.mode = GUARD_INVESTIGATE;
    marta.investigateX = 640;
    marta.investigateY = 690;
    marta.angle = Math.PI;
    placeGuard(state.guards[0], 820, 282, 0, GUARD_PAUSE);
    state.player.x = 915;
    state.player.y = 371;
    state.player.angle = 1.1;
    state.totalLoot = 350;
    state.empLeft = 1;
    state.coinsLeft = 2;
    state.spentOnTools = 200;
    settle(world, 2);
    state.cameras[0].disabled = 5;
    state.alarm = 0.12;
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'getaway') {
    // The end of the night: vault cracked, alarm locked high, the thief at the van and the
    // tally panel over the vault room — the planning paid off.
    world.enterRoom(2);
    state.vaultCracked = true;
    state.getaway = true;
    state.crackProgress = 1;
    state.exitUnlocked = true;
    state.player.x = 95;
    state.player.y = 644;
    state.player.angle = Math.PI;
    placeGuard(state.guards[0], 500, 470, Math.atan2(644 - 470, 95 - 500), GUARD_PAUSE);
    placeGuard(state.guards[1], 700, 400, Math.atan2(644 - 400, 95 - 700), GUARD_PAUSE);
    placeGuard(state.guards[2], 600, 715, Math.PI, GUARD_PAUSE);
    state.totalLoot = 2450;
    state.spentOnTools = 200;
    state.time = 295;
    state.spotCount = 1;
    state.everSpotted = true;
    state.alarm = 0.88;
    state.won = true;
    return { screen: SCREEN_WIN, best: 0 };
  }

  // The cover scene, room II mid-crossing: the thief in the open lane above the counters,
  // mid-stride at the rim of Guard Felix's cone with loot in the bag, Guard Ines sweeping
  // the top of the room, both cameras live, and the alarm meter part-way up — the whole
  // game in one frame.
  world.enterRoom(1);
  state.loot[0].taken = true;
  state.loot[2].taken = true;
  state.roomLoot = 450;
  state.totalLoot = 1050;
  const felix = state.guards[0];
  felix.x = 480;
  felix.y = 230;
  felix.angle = 0;
  felix.mode = GUARD_PATROL;
  felix.waypointIndex = 1;
  placeGuard(state.guards[1], 860, 190, Math.PI / 2, GUARD_PAUSE);
  state.player.x = 647;
  state.player.y = 285;
  state.player.angle = 0.35;
  settle(world, 2);
  state.alarm = 0.42;
  return { screen: SCREEN_PLAY, best: 0 };
}
