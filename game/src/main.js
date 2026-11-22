// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The
// game moves between five screens: title, play, paused, busted and the getaway tally.
//
// ?seed=N fixes the night's seed. ?shot=cover|vault|tools|getaway (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, EVENT_BUSTED, EVENT_COIN, EVENT_CRACKED, EVENT_EMP, EVENT_LOOT, EVENT_ROOM_CLEAR, EVENT_SPOTTED, EVENT_WIN, STEP } from './config.js';
import { createWorld, finalScore } from './world.js';
import { ACTION_CONFIRM, ACTION_EMP, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import {
  isMuted, playAlarmRiser, playBustedSting, playChaChing, playCoinPing, playCrackTick,
  playEmpPulse, playStep, playWinJingle, toggleMuted, unlockAudio,
} from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let stepCount = 0;
  let soundClock = 0;
  let wasUnlocked = false;

  // Screen readers (and anyone watching the page's text) hear the screens and the big moments.
  function announce(message) {
    status.textContent = message;
  }

  function startNight() {
    world.reset();
    input.clearClicks();
    wasUnlocked = false;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Inside the Meridian Trust. Room one: the Lobby. Fill the quota, then take the exit.');
  }

  function retryRoom() {
    world.retryRoom();
    input.clearClicks();
    wasUnlocked = world.state.exitUnlocked;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Back in ${world.state.roomName}. Its loot is back where it was.`);
  }

  function finishNight() {
    screen = SCREEN_WIN;
    const score = finalScore(world.state);
    if (score > best) {
      best = score;
      saveBest(best);
    }
    playWinJingle();
    announce(`Clean getaway. Final score ${score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const nowMuted = toggleMuted();
      announce(nowMuted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) {
      unlockAudio();
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN) startNight();
      else if (screen === SCREEN_BUSTED) retryRoom();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    return actions;
  }

  function step(actions) {
    const direction = input.direction();
    const click = screen === SCREEN_PLAY ? input.takeClick() : null;
    const events = world.step(STEP, {
      moveX: direction.x,
      moveY: direction.y,
      emp: (actions & ACTION_EMP) !== 0,
      coin: click,
    });
    stepCount += 1;
    if (events & EVENT_LOOT) playChaChing();
    if (events & EVENT_COIN) playCoinPing();
    if (events & EVENT_EMP) playEmpPulse();
    if (events & EVENT_SPOTTED) playAlarmRiser();
    if (events & EVENT_CRACKED) {
      playChaChing();
      announce('The vault is open. The alarm is locked high — get to the van.');
    }
    if (events & EVENT_ROOM_CLEAR) announce(`${world.state.roomName}. The next room.`);
    if (world.state.exitUnlocked && !wasUnlocked && !(events & EVENT_ROOM_CLEAR)) {
      announce(world.state.vaultWheel ? 'The way to the van is open.' : 'Quota met. The exit is open.');
    }
    wasUnlocked = world.state.exitUnlocked;
    if (world.state.player.moving && stepCount % 21 === 0) playStep(stepCount);
    if (world.state.player.cracking) {
      soundClock += STEP;
      if (soundClock > 0.5) {
        soundClock = 0;
        playCrackTick();
      }
    }
    if (events & EVENT_BUSTED) {
      screen = SCREEN_BUSTED;
      playBustedSting();
      announce(`Busted. Spotted by ${world.state.bustedBy}.`);
    } else if (events & EVENT_WIN) {
      finishNight();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step(first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_TITLE) {
      // The lobby patrols behind the title panel; the night itself starts on confirm.
      while (accumulator >= STEP) {
        world.step(STEP, { moveX: 0, moveY: 0, emp: false, coin: null });
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the patrols walk unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce(isMuted() ? 'Midnight Vault.' : 'Midnight Vault. Press Enter or click to go in.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
