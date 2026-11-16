// Pure derived maths: nothing here is stored, everything is computed from state.

import { weekDates, dateOfIso, secondsBetween } from './time.js';

export const isStrength = entry => Array.isArray(entry.reps);

// The numbers one session entry contributes. A set counts if reps > 0.
export function measure(entry) {
  if (!isStrength(entry)) return { minutes: entry.minutes || 0, km: entry.km || 0 };
  const reps = entry.reps.reduce((a, b) => a + b, 0);
  return { kg: entry.kg, sets: entry.reps.filter(r => r > 0).length, reps, volume: reps * entry.kg };
}

const isLogged = m => m.reps > 0 || m.minutes > 0 || m.km > 0;

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

export function weekStats(state, start, history = buildHistory(state.sessions)) {
  const dates = weekDates(start);
  const inWeek = date => date >= start && date <= dates[6];
  const names = new Map([...state.exercises, ...state.workouts].map(x => [x.id, x.name]));
  const sessions = state.sessions.filter(s => inWeek(s.date)).sort((a, b) => a.date.localeCompare(b.date));

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
  // Sleep belongs to its wake date; a fast counts in the week it ended.
  const sleepSecs = state.sleep.filter(x => inWeek(dateOfIso(x.wake))).map(x => secondsBetween(x.bed, x.wake));
  const fastSecs = state.fasts.filter(f => f.end && inWeek(dateOfIso(f.end))).map(f => secondsBetween(f.start, f.end));

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
