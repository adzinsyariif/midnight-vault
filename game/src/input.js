// Keyboard and mouse: WASD or the arrow keys walk the thief, E fires the EMP, P or Escape
// pauses, M mutes, and Enter/Space/click confirms menus. A click during play is a coin toss
// aimed at that floor point, so clicks are queued with their logical playfield coordinates.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_EMP = 4;
export const ACTION_MUTE = 8;

const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};

/** Create the input reader bound to the canvas; call its methods once per frame. */
export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  const clicks = [];

  function logicalPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (Object.values(KEYS).flat().includes(event.code)) event.preventDefault();
      return;
    }
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    else if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyE') actions |= ACTION_EMP;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (Object.values(KEYS).flat().includes(event.code) || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CONFIRM;
    clicks.push(logicalPoint(event));
  });

  return {
    /** The held movement direction: each axis -1, 0 or 1. */
    direction() {
      return {
        x: (KEYS.right.some((k) => held.has(k)) ? 1 : 0) - (KEYS.left.some((k) => held.has(k)) ? 1 : 0),
        y: (KEYS.down.some((k) => held.has(k)) ? 1 : 0) - (KEYS.up.some((k) => held.has(k)) ? 1 : 0),
      };
    },
    /** The action flags pressed since the last call; reading clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The oldest queued click in logical coordinates, or null. Reading removes it. */
    takeClick() {
      return clicks.length > 0 ? clicks.shift() : null;
    },
    /** Drop any queued clicks (used when a screen changes under the pointer). */
    clearClicks() {
      clicks.length = 0;
    },
  };
}
