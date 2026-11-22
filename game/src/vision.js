// Who can see whom: vision cones and line of sight. Pure geometry, no game state of its own —
// guards and cameras both ask these questions, and the furniture (the blockers list) is what
// makes cover work: a cone only spots the thief when the straight line to him crosses no desk,
// pillar, crate or wall first.

/** The smaller signed difference between two angles, in (-PI, PI]. */
export function angleDifference(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance between two points. */
export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** Does segment (x1,y1)-(x2,y2) touch or cross the axis-aligned rectangle rect? */
export function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  // An endpoint inside the rectangle is a hit.
  if (x1 >= rect.x && x1 <= rect.x + rect.w && y1 >= rect.y && y1 <= rect.y + rect.h) return true;
  if (x2 >= rect.x && x2 <= rect.x + rect.w && y2 >= rect.y && y2 <= rect.y + rect.h) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Slab test: the segment's parameter range clipped against each axis of the rectangle.
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** True when nothing in blockers stands between the two points. */
export function lineOfSightClear(x1, y1, x2, y2, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentIntersectsRect(x1, y1, x2, y2, blockers[i])) return false;
  }
  return true;
}

/**
 * Can the observer at (ox, oy) facing `angle` see the target? Returns null when it cannot
 * (too far, outside the cone, or behind cover), otherwise how exposed the target is:
 * closeness 0 at the cone's far edge up to 1 at the observer's feet.
 */
export function coneSees(observer, angle, range, halfAngle, target, blockers) {
  const d = distance(observer.x, observer.y, target.x, target.y);
  if (d > range) return null;
  if (d > 1e-6) {
    const bearing = Math.atan2(target.y - observer.y, target.x - observer.x);
    if (Math.abs(angleDifference(bearing, angle)) > halfAngle) return null;
  }
  if (!lineOfSightClear(observer.x, observer.y, target.x, target.y, blockers)) return null;
  return { closeness: 1 - d / range, distance: d };
}
