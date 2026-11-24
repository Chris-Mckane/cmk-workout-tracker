// Single source of truth: the whole app state, kept in one localStorage key.

const KEY = 'cmk-wt';
export const VERSION = 3;

export const defaultState = () => ({
  version: VERSION,
  exercises: [],
  workouts: [],
  sessions: [],
  days: {},
  sleep: [],
  fasts: [],
  bedtime: null,  // ISO time the Sleep button was tapped; null when awake
  active: null,
  settings: { restSec: 90, lastExport: null, nudgeDismissedAt: null, iosCardSeen: false, next: null, order: { sections: [], exercises: [], home: [] } },
});

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// Brings saved or imported data up to the current shape. Throws if it is not our data.
// Each version's upgrade step runs in order, oldest first.
export function migrate(raw) {
  if (!isObject(raw) || !Number.isInteger(raw.version) || raw.version < 1 || raw.version > VERSION) {
    throw new Error('Not a CMK Workout Tracker backup');
  }
  const base = defaultState();
  const next = { ...base, ...raw, settings: { ...base.settings, ...raw.settings }, version: VERSION };
  const listsOk = ['exercises', 'workouts', 'sessions', 'sleep', 'fasts'].every(k => Array.isArray(next[k]));
  if (!listsOk || !isObject(next.days)) throw new Error('Backup is damaged');
  // v2: exercises gain a section (e.g. "Chest"); '' means not sorted yet.
  if (raw.version < 2) next.exercises = next.exercises.map(x => ({ section: '', ...x }));
  // v3: each weight set gains an effort rating (null until chosen); rest now always auto-starts.
  if (raw.version < 3) {
    const addEffort = e => (Array.isArray(e.reps) && !e.effort ? { ...e, effort: e.reps.map(() => null) } : e);
    next.sessions = next.sessions.map(s => ({ ...s, entries: s.entries.map(addEffort) }));
    delete next.settings.autoRest;
  }
  if (next.active && !next.sessions.some(s => s.id === next.active.sessionId)) next.active = null;
  return next;
}

export let state = defaultState();
let dirty = false;

export function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    state = migrate(JSON.parse(raw));
  } catch {
    // Keep a copy rather than let the next save overwrite data we could not read.
    localStorage.setItem(`${KEY}-unreadable`, raw);
  }
}

// Batches every change made in one event into a single write.
export function save() {
  if (dirty) return;
  dirty = true;
  queueMicrotask(flush);
}

export function flush() {
  if (!dirty) return;
  dirty = false;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function replaceState(next) {
  state = next;
  save();
}

export const uid = () => crypto.randomUUID();
