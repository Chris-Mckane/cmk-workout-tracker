// Pure derived maths: nothing here is stored, everything is computed from state.

import { datesBetween, dateOfIso, secondsBetween } from './time.js';

export const isStrength = entry => Array.isArray(entry.reps);

// Weight sections in body order, top to bottom. Sections the user makes up come next (A to Z),
// then weight exercises with no section, then all cardio as one section.
const BODY_SECTIONS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];
const OTHER = 'Other', CARDIO = 'Cardio';
const sectionOf = x => (x.type === 'cardio' ? CARDIO : x.section?.trim() || OTHER);
const rank = section => {
  const body = BODY_SECTIONS.indexOf(section);
  if (body >= 0) return body;
  return BODY_SECTIONS.length + (section === OTHER) + 2 * (section === CARDIO);
};

// Everything the user can pick: their own exercises (not deleted), then library exercises
// they have not taken into their own list yet.
export function catalogue(exercises, library) {
  const live = exercises.filter(x => !x.archived);
  const taken = new Set(live.map(x => x.id));
  return [...live, ...library.filter(x => !taken.has(x.id))];
}

// Exercises grouped by section, keeping the order they were added within each section.
export function groupBySection(exercises) {
  const groups = new Map();
  for (const x of exercises) groups.set(sectionOf(x), [...(groups.get(sectionOf(x)) ?? []), x]);
  return [...groups]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([section, items]) => ({ section, items }));
}

// Weight section names: the body sections, then any the user has made up.
export const sectionNames = exercises => [...new Set([
  ...BODY_SECTIONS,
  ...exercises.filter(x => x.type !== 'cardio').map(x => x.section?.trim()).filter(Boolean).sort(),
])];

// Reuses a known section's spelling when only the case differs ("chest" -> "Chest").
export function matchSection(typed, exercises) {
  const name = typed.trim();
  return sectionNames(exercises).find(s => s.toLowerCase() === name.toLowerCase()) ?? name;
}

// The numbers one session entry contributes. A set counts if reps > 0.
export function measure(entry) {
  if (!isStrength(entry)) return { minutes: entry.minutes || 0, km: entry.km || 0 };
  const reps = entry.reps.reduce((a, b) => a + b, 0);
  return { kg: entry.kg, sets: entry.reps.filter(r => r > 0).length, reps, volume: reps * entry.kg };
}

const isLogged = m => m.reps > 0 || m.minutes > 0 || m.km > 0;

// Names of the exercises actually done in a session (weights and cardio), in session order.
export const doneNames = (session, names) => session.entries
  .filter(e => isLogged(measure(e)))
  .map(e => names.get(e.exerciseId) ?? 'Deleted exercise');

// PBs for a measure against the best of all earlier logs. `best` is null on the first
// ever log (no stars); ties do not count.
export function pbsOf(m, best) {
  if (!best) return [];
  const pb = (type, value, was) => (value > was ? [{ type, value, was }] : []);
  return [...(m.sets > 0 ? pb('kg', m.kg, best.kg) : []), ...pb('reps', m.reps, best.reps), ...pb('km', m.km, best.km)];
}

// One chronological pass over all sessions (by date, then creation order).
// Returns Map(sessionId -> Map(exerciseId -> record)), where a record is the entry's
// measure plus `logged`, `last` (previous log), `best` (bests before it) and `pbs`.
export function buildHistory(sessions) {
  const ordered = sessions.map((s, i) => [s, i]).sort((a, b) => a[0].date.localeCompare(b[0].date) || a[1] - b[1]);
  const running = new Map();
  const history = new Map();
  for (const [session] of ordered) {
    const records = new Map();
    for (const entry of session.entries) {
      const { best = null, last = null } = running.get(entry.exerciseId) ?? {};
      const m = measure(entry);
      const logged = isLogged(m);
      records.set(entry.exerciseId, { ...m, logged, best, last, pbs: pbsOf(m, best) });
      if (logged) {
        const top = key => Math.max(best?.[key] ?? 0, m[key] ?? 0);
        running.set(entry.exerciseId, { last: m, best: { kg: top('kg'), reps: top('reps'), km: top('km') } });
      }
    }
    history.set(session.id, records);
  }
  return history;
}

export function sessionSummary(records) {
  let sets = 0, reps = 0;
  for (const r of records.values()) {
    sets += r.sets ?? 0;
    reps += r.reps ?? 0;
  }
  return { sets, reps };
}

// A stored override wins; otherwise a date with a session is a workout day.
export const dayType = (days, date, hasSession) => days[date]?.type ?? (hasSession ? 'workout' : null);

const sum = list => list.reduce((a, b) => a + b, 0);

// Totals for every date from `from` to `to` (a day, a Mon-Sun week or a month).
export function periodStats(state, from, to, history = buildHistory(state.sessions)) {
  const dates = datesBetween(from, to);
  const inPeriod = date => date >= from && date <= to;
  const names = new Map([...state.exercises, ...state.workouts].map(x => [x.id, x.name]));
  const sessions = state.sessions.filter(s => inPeriod(s.date)).sort((a, b) => a.date.localeCompare(b.date));

  const totals = { sessions: sessions.length, sets: 0, reps: 0, volume: 0, cardioMin: 0, timeSec: 0 };
  const byWorkout = new Map(), byExercise = new Map(), pbs = [];
  for (const session of sessions) {
    totals.timeSec += session.durationSec;
    const workoutKey = session.workoutId ?? `title:${session.title}`;
    const w = byWorkout.get(workoutKey)
      ?? { name: names.get(session.workoutId) ?? (session.title || 'Session'), sessions: 0, sets: 0, reps: 0 };
    byWorkout.set(workoutKey, w);
    w.sessions++;
    for (const [id, r] of history.get(session.id)) {
      if (!r.logged) continue;
      const x = byExercise.get(id)
        ?? { name: names.get(id) ?? 'Deleted exercise', strength: 'reps' in r, sets: 0, reps: 0, topKg: 0, volume: 0, minutes: 0, km: 0, pbs: [] };
      byExercise.set(id, x);
      if (x.strength) {
        for (const target of [x, w, totals]) {
          target.sets += r.sets;
          target.reps += r.reps;
        }
        x.volume += r.volume;
        totals.volume += r.volume;
        if (r.sets) x.topKg = Math.max(x.topKg, r.kg);
      } else {
        x.minutes += r.minutes;
        x.km += r.km;
        totals.cardioMin += r.minutes;
      }
      x.pbs.push(...r.pbs);
      pbs.push(...r.pbs);
    }
  }

  const sessionDates = new Set(sessions.map(s => s.date));
  const days = dates.map(date => ({
    date,
    type: dayType(state.days, date, sessionDates.has(date)),
    nutrition: state.days[date]?.nutrition ?? null,
  }));
  // Sleep belongs to its wake date; a fast counts in the period it ended.
  const sleepSecs = state.sleep.filter(x => inPeriod(dateOfIso(x.wake))).map(x => secondsBetween(x.bed, x.wake));
  const fastSecs = state.fasts.filter(f => f.end && inPeriod(dateOfIso(f.end))).map(f => secondsBetween(f.start, f.end));

  return {
    totals,
    byWorkout: [...byWorkout.values()],
    byExercise: [...byExercise.values()],
    pbs,
    vibes: sessions.map(s => s.vibe),
    days,
    workoutDays: days.filter(d => d.type === 'workout').length,
    restDays: days.filter(d => d.type === 'rest').length,
    sleep: { nights: sleepSecs.length, totalSec: sum(sleepSecs), avgSec: sleepSecs.length ? sum(sleepSecs) / sleepSecs.length : 0 },
    fasts: { count: fastSecs.length, totalSec: sum(fastSecs), longestSec: Math.max(0, ...fastSecs) },
  };
}
