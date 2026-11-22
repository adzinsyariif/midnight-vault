// The wall cameras: each is bolted to a mount point and swings its pale cone back and forth
// over the floor on a fixed rhythm. An EMP pulse knocks every camera in the room out for a
// few seconds — the cone dies, sparks fly, and the camera spots nothing until it reboots.
import { CAMERA } from './config.js';

/** Build one camera from a room definition: { name, x, y, baseAngle } (angles in radians). */
export function createCamera(definition) {
  return {
    name: definition.name,
    x: definition.x,
    y: definition.y,
    baseAngle: definition.baseAngle,
    angle: definition.baseAngle,
    phase: definition.phase ?? 0,
    /** Seconds of EMP disable left; while above zero the camera is dark. */
    disabled: 0,
    /** Set by world.js each step: true while this camera's cone is on the thief. */
    spotting: false,
  };
}

/** Advance one camera: swing the cone on its rhythm, and count down any EMP disable. */
export function stepCamera(camera, dt, time) {
  if (camera.disabled > 0) {
    camera.disabled = Math.max(0, camera.disabled - dt);
    camera.spotting = false;
  }
  camera.angle = camera.baseAngle + Math.sin(time * CAMERA.sweepSpeed + camera.phase) * CAMERA.sweepSwing;
}

/** Knock out every camera in the room for the EMP's duration. */
export function disableCameras(cameras, seconds) {
  for (let i = 0; i < cameras.length; i += 1) {
    cameras[i].disabled = Math.max(cameras[i].disabled, seconds);
    cameras[i].spotting = false;
  }
}
