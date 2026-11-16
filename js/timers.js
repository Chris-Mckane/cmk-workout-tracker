// Live session timers. Nothing here counts with intervals: the workout and rest timers are
// start/end stamps in state.active, and the display is computed from Date.now().

import { state, save } from './store.js';
import { elapsedSec, restLeftSec } from './time.js';
import { haptic } from './ui.js';

export const REST_PRESETS = [60, 90, 120, 180];
const PING_WINDOW_MS = 1500;

let restDone = false;
let audio = null;
let wakeLock = null;

export const running = () => Boolean(state.active?.timerStartedAt);

function commit() {
  save();
  syncWakeLock();
}

export function toggleTimer() {
  const a = state.active;
  if (a.timerStartedAt) {
    a.timerAccumSec += (Date.now() - a.timerStartedAt) / 1000;
    a.timerStartedAt = null;
  } else {
    a.timerStartedAt = Date.now();
  }
  commit();
}

export function resetTimer() {
  Object.assign(state.active, { timerStartedAt: null, timerAccumSec: 0 });
  commit();
}

export function finishActive() {
  const session = state.sessions.find(s => s.id === state.active.sessionId);
  session.durationSec = elapsedSec(state.active);
  state.active = null;
  restDone = false;
  commit();
}

export function startRest(sec = state.settings.restSec) {
  state.active.restEndsAt = Date.now() + sec * 1000;
  restDone = false;
  save();
}

export function stopRest() {
  if (state.active) state.active.restEndsAt = null;
  restDone = false;
  save();
}

export const restState = (now = Date.now()) => ({ left: restLeftSec(state.active?.restEndsAt, now), done: restDone });

// Run by the app ticker. Pings only when the end is noticed as it happens; if the app was
// asleep or closed past the end, the bar just shows "Rest done".
export function checkRest(now = Date.now()) {
  const endsAt = state.active?.restEndsAt;
  if (!endsAt || now < endsAt) return;
  state.active.restEndsAt = null;
  restDone = true;
  save();
  if (now - endsAt < PING_WINDOW_MS) {
    haptic('done');
    ping();
  }
}

// Browsers only allow audio after a user gesture, so this runs on every tap.
export function unlockAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audio ??= new Ctx();
  if (audio.state !== 'running') audio.resume().catch(() => {});
}

function ping() {
  if (!audio) return;
  for (const [freq, delay] of [[880, 0], [1320, 0.18]]) {
    const osc = audio.createOscillator(), gain = audio.createGain();
    const t = audio.currentTime + delay;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }
}

// Screen stays awake while the workout timer runs. The lock is dropped by the browser
// whenever the page is hidden, so this is called again on visibilitychange.
export async function syncWakeLock() {
  const wanted = running() && document.visibilityState === 'visible';
  if (wanted && !wakeLock) {
    try {
      wakeLock = await navigator.wakeLock?.request('screen') ?? null;
      wakeLock?.addEventListener('release', () => { wakeLock = null; });
    } catch {
      wakeLock = null;
    }
  } else if (!wanted && wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
