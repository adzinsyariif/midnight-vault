// The guards: each walks a waypoint route, pauses at every stop to sweep his flashlight cone
// across the room, and leaves the route when a tossed coin pings within earshot — he walks to
// the spot, looks around, then goes back to where his patrol left off. A guard never decides
// whether he can see the thief; vision.js answers that and world.js reads the answer.
import { GUARD, TOOLS } from './config.js';
import { angleDifference, distance } from './vision.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_PAUSE = 'pause';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_LOOK = 'look';

/** Build one guard from a room definition: { name, waypoints: [[x, y], ...], pingpong }. */
export function createGuard(definition) {
  const [x, y] = definition.waypoints[0];
  const [nx, ny] = definition.waypoints[1] ?? definition.waypoints[0];
  return {
    name: definition.name,
    x,
    y,
    angle: Math.atan2(ny - y, nx - x),
    waypoints: definition.waypoints,
    pingpong: definition.pingpong === true,
    direction: 1,
    waypointIndex: 1 % definition.waypoints.length,
    mode: GUARD_PATROL,
    timer: 0,
    sweepPhase: 0,
    investigateX: 0,
    investigateY: 0,
    returnIndex: 0,
    /** Set by world.js each step: true while this guard's cone is on the thief. */
    spotting: false,
  };
}

/** Turn toward `target` at a limited rate, so a walking guard's cone swings naturally. */
function turnToward(guard, target, dt, rate) {
  const diff = angleDifference(target, guard.angle);
  const maxTurn = rate * dt;
  guard.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
}

/** Walk toward a point; returns true once there. */
function walkToward(guard, x, y, speed, dt) {
  const d = distance(guard.x, guard.y, x, y);
  if (d <= Math.max(2, speed * dt)) {
    guard.x = x;
    guard.y = y;
    return true;
  }
  const bearing = Math.atan2(y - guard.y, x - guard.x);
  turnToward(guard, bearing, dt, 10);
  guard.x += Math.cos(bearing) * speed * dt;
  guard.y += Math.sin(bearing) * speed * dt;
  return false;
}

/** Send a guard to investigate a point (a coin ping). Remembers where his patrol resumes. */
export function sendGuardToInvestigate(guard, x, y) {
  if (guard.mode === GUARD_INVESTIGATE || guard.mode === GUARD_LOOK) return;
  guard.returnIndex = guard.waypointIndex;
  guard.investigateX = x;
  guard.investigateY = y;
  guard.mode = GUARD_INVESTIGATE;
  guard.timer = 0;
}

/**
 * Advance one guard by dt seconds. speedScale is the getaway multiplier world.js passes once
 * the vault is cracked; the guard's own sweep keeps time with the room clock.
 */
export function stepGuard(guard, dt, speedScale) {
  guard.sweepPhase += dt * GUARD.sweepSpeed;
  if (guard.mode === GUARD_PATROL) {
    const [tx, ty] = guard.waypoints[guard.waypointIndex];
    if (walkToward(guard, tx, ty, GUARD.patrolSpeed * speedScale, dt)) {
      guard.mode = GUARD_PAUSE;
      guard.timer = GUARD.pauseSeconds;
    }
    return;
  }
  if (guard.mode === GUARD_PAUSE) {
    // Standing at a waypoint, sweeping the cone back and forth across his facing line: the
    // stored angle is the centre of the sweep; render and vision add the swing on top.
    guard.timer -= dt;
    if (guard.timer <= 0) {
      advanceWaypoint(guard);
      guard.mode = GUARD_PATROL;
    }
    return;
  }
  if (guard.mode === GUARD_INVESTIGATE) {
    if (walkToward(guard, guard.investigateX, guard.investigateY, GUARD.investigateSpeed * speedScale, dt)) {
      guard.mode = GUARD_LOOK;
      guard.timer = TOOLS.coinLookSeconds;
    }
    return;
  }
  if (guard.mode === GUARD_LOOK) {
    guard.timer -= dt;
    if (guard.timer <= 0) {
      guard.waypointIndex = guard.returnIndex;
      guard.mode = GUARD_PATROL;
    }
  }
}

/** The guard's current cone direction, including the paused sweep's swing. */
export function guardViewAngle(guard) {
  if (guard.mode === GUARD_PAUSE || guard.mode === GUARD_LOOK) {
    return guard.angle + Math.sin(guard.sweepPhase) * GUARD.sweepSwing;
  }
  return guard.angle;
}

/** Move the patrol target on to the next waypoint, bouncing at the ends of a pingpong route. */
function advanceWaypoint(guard) {
  if (guard.pingpong) {
    let next = guard.waypointIndex + guard.direction;
    if (next < 0 || next >= guard.waypoints.length) {
      guard.direction *= -1;
      next = guard.waypointIndex + guard.direction;
    }
    guard.waypointIndex = next;
    return;
  }
  guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
}
