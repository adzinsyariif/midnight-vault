// A tiny WebAudio synth: no sound files, every effect is an oscillator or a burst of noise
// shaped on the spot. The context is created lazily on the first user gesture (browsers will
// not start audio before one), and every call is safe before that — it simply stays silent.

let context = null;
let muted = false;

/** Create the context on a user gesture; later calls just make sure it is running. */
export function unlockAudio() {
  try {
    if (context === null) {
      const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
      if (AudioCtor) context = new AudioCtor();
    }
    if (context !== null && context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  muted = !muted;
  return muted;
}

/** One oscillator note with a quick envelope. */
function tone(frequency, seconds, type, volume, slideTo) {
  if (context === null || muted) return;
  try {
    const t = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + seconds);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(gain).connect(context.destination);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  } catch {
    // A failed effect is a silent one; the game never stops for sound.
  }
}

/** A short filtered noise burst, for footsteps. */
function noiseBurst(seconds, volume, frequency) {
  if (context === null || muted) return;
  try {
    const t = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(t);
  } catch {
    // Silent on failure, as above.
  }
}

/** A soft footstep, alternating pitch slightly so a walk does not sound like a machine. */
export function playStep(stepCount) {
  noiseBurst(0.05, 0.05, stepCount % 2 === 0 ? 500 : 380);
}

/** The bright ping of a coin landing on marble. */
export function playCoinPing() {
  tone(2093, 0.18, 'sine', 0.12);
  setTimeout(() => tone(2637, 0.22, 'sine', 0.08), 45);
}

/** Cash register cha-ching when loot is pocketed. */
export function playChaChing() {
  tone(1319, 0.07, 'square', 0.05);
  setTimeout(() => tone(1760, 0.12, 'square', 0.05), 55);
}

/** A low electronic thump when the EMP fires. */
export function playEmpPulse() {
  tone(160, 0.3, 'sawtooth', 0.14, 40);
}

/** The riser that plays the moment a cone first catches the thief. */
export function playAlarmRiser() {
  tone(520, 0.4, 'sawtooth', 0.07, 1180);
}

/** A slow mechanical tick while the vault crack is running. */
export function playCrackTick() {
  tone(880, 0.04, 'square', 0.04);
}

/** The sting of a bust. */
export function playBustedSting() {
  tone(392, 0.22, 'sawtooth', 0.12);
  setTimeout(() => tone(311, 0.22, 'sawtooth', 0.12), 160);
  setTimeout(() => tone(233, 0.45, 'sawtooth', 0.13), 320);
}

/** A short bright jingle for a clean getaway. */
export function playWinJingle() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((note, i) => setTimeout(() => tone(note, 0.22, 'triangle', 0.1), i * 110));
}
