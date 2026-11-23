// Session screen: the live workout editor, its timers, and the list of saved sessions.

import { state, save, uid } from './store.js';
import { today, fmtDay, fmtClock, elapsedSec } from './time.js';
import { buildHistory, measure, pbsOf, isStrength, sessionSummary, groupBySection, doneNames } from './stats.js';
import { esc, sectionsHtml, num, tip, fmtNum, setText, facesHtml, toggleValue, starsHtml, placeLegend, onPress, openSheet, ask, haptic } from './ui.js';
import * as timers from './timers.js';

const VIBES = { bad: 'Better than nothing', ok: 'Could be better', great: 'Great workout', exceptional: 'Exceptional workout' };
const MAX_SETS = 6;
const EFFORTS = [null, 'warmup', 'maintenance', 'fatigue', 'failure'];
const EFFORT_NAMES = { warmup: 'Warm up', maintenance: 'Maintenance', fatigue: 'Fatigue (a couple left in the tank)', failure: 'Failure (could not do another rep)' };
const EFFORT_LETTERS = { warmup: 'W', maintenance: 'M', fatigue: 'F', failure: 'X' };

let root;
let history;            // rebuilt on every full render, reused by taps in between
let exercises;          // Map(id -> exercise), same lifetime as history
let openId = null;      // session shown in the editor; falls back to the active one
let startDate = null;   // date for the next new session when arriving from Daily
let restOpen = false;

const byId = id => state.sessions.find(s => s.id === id);
const current = () => byId(openId) ?? byId(state.active?.sessionId) ?? null;
const isActive = session => state.active?.sessionId === session.id;
const entryOf = (session, card) => session.entries.find(e => e.exerciseId === card.dataset.ex);
const livePbs = (session, entry) => pbsOf(measure(entry), history.get(session.id).get(entry.exerciseId).best);

const newEntry = ex => (ex.type === 'cardio'
  ? { exerciseId: ex.id, minutes: 0, km: null }
  : { exerciseId: ex.id, kg: 0, reps: Array(ex.defaultSets).fill(0), effort: Array(ex.defaultSets).fill(null) });

// New strength entries start at the kg used last time for that exercise.
function prefillKg(session, entries) {
  const records = buildHistory(state.sessions).get(session.id);
  for (const entry of entries) {
    if (isStrength(entry)) entry.kg = records.get(entry.exerciseId).last?.kg ?? 0;
  }
}

export function startSession(workoutId, date = today()) {
  if (state.active) timers.finishActive();
  const workout = state.workouts.find(w => w.id === workoutId);
  const live = new Map(state.exercises.filter(x => !x.archived).map(x => [x.id, x]));
  const session = {
    id: uid(), date, workoutId: workout?.id ?? null, title: workout?.name ?? 'Session',
    vibe: null, note: '', durationSec: 0,
    entries: (workout?.exerciseIds ?? []).filter(id => live.has(id)).map(id => newEntry(live.get(id))),
  };
  state.sessions.push(session);
  prefillKg(session, session.entries);
  state.active = { sessionId: session.id, timerStartedAt: Date.now(), timerAccumSec: 0, restEndsAt: null };
  save();
  timers.syncWakeLock();
  return session;
}

// --- Rendering ---

function headerHtml(session) {
  if (!isActive(session)) {
    return `<header class="bar"><span class="clock">${fmtClock(session.durationSec)}</span><button data-act="close">Done</button></header>`;
  }
  const preset = sec => `<button data-act="rest" data-sec="${sec}"${sec === state.settings.restSec ? ' class="on"' : ''} aria-label="Rest ${sec} seconds">${sec}</button>`;
  return `<header class="bar">
    <span class="clock" id="clock" aria-label="Workout timer"></span>
    <button data-act="timer-toggle" id="timer-toggle"></button>
    <button class="ghost" data-act="timer-reset">Reset</button>
    <button data-act="rest-toggle">Rest</button>
    <div class="rest" id="rest" hidden>
      ${timers.REST_PRESETS.map(preset).join('')}
      <b class="grow" id="rest-left" role="status"></b>
    </div>
  </header>`;
}

const effortLabel = (effort, i) => `Set ${i + 1} effort: ${EFFORT_NAMES[effort] ?? 'not set'}`;

// Each set is a rep circle with its effort button underneath.
const setsHtml = entry => entry.reps.map((n, i) => {
  const effort = entry.effort[i];
  return `<div class="set">
    <button class="circle${n ? ' on' : ''}" data-i="${i}" aria-label="Set ${i + 1}: ${n} reps">${n || ''}</button>
    <button class="effort ${effort ?? ''}" data-act="effort" data-i="${i}" aria-label="${effortLabel(effort, i)}">${EFFORT_LETTERS[effort] ?? '–'}</button>
  </div>`;
}).join('');

function entryHtml(session, entry) {
  const name = esc(exercises.get(entry.exerciseId)?.name ?? 'Deleted exercise');
  const stars = `<span class="stars">${starsHtml(livePbs(session, entry))}</span>`;
  const remove = `<button class="ghost" data-act="entry-remove" aria-label="Remove ${name}">Remove</button>`;
  if (!isStrength(entry)) {
    return `<article class="card entry" data-ex="${entry.exerciseId}">
      <div class="row" data-legend><h3 class="grow">${name} ${stars}</h3>${remove}</div>
      <div class="row">
        <label>Minutes <input class="num" data-field="minutes" type="number" inputmode="numeric" min="0" step="1" placeholder="0" value="${entry.minutes || ''}"></label>
        <label>Km <input class="num" data-field="km" type="number" inputmode="decimal" min="0" step="0.1" placeholder="-" value="${entry.km ?? ''}"></label>
      </div>
    </article>`;
  }
  const { last } = history.get(session.id).get(entry.exerciseId);
  const sets = entry.reps.length;
  return `<article class="card entry" data-ex="${entry.exerciseId}">
    <div class="row" data-legend><h3 class="grow">${name} ${stars}</h3>
      <label><input class="num" data-field="kg" type="number" inputmode="decimal" min="0" step="0.5" placeholder="0" value="${entry.kg || ''}" aria-label="${name} weight in kg"> kg</label></div>
    ${last ? `<p class="muted small">last time: ${last.sets} sets, ${last.reps} reps @ ${fmtNum(last.kg)} kg</p>` : ''}
    <p class="muted small">Effort under each set: W warm up · M maintenance · F fatigue · X failure</p>
    <div class="row"><div class="circles">${setsHtml(entry)}</div>
      <button data-act="minus1" data-haptic="long" aria-label="Remove one rep"${entry.reps.some(Boolean) ? '' : ' disabled'}>−1</button></div>
    <div class="row">
      <button class="ghost" data-act="set-remove" aria-label="Remove a set"${sets > 1 ? '' : ' disabled'}>− set</button>
      <button class="ghost" data-act="set-add" aria-label="Add a set"${sets < MAX_SETS ? '' : ' disabled'}>+ set</button>
      <span class="grow"></span>${remove}</div>
  </article>`;
}

function editorHtml(session) {
  return `${headerHtml(session)}
    <div class="card row">
      <input class="grow" data-field="title" value="${esc(session.title)}" maxlength="40" aria-label="Session title">
      <input type="date" data-field="date" value="${session.date}" aria-label="Session date">
    </div>
    ${session.entries.map(entry => entryHtml(session, entry)).join('')}
    <button class="wide" data-act="add-exercise">+ Add exercise</button>
    <div class="card center"><h3>Workout vibe</h3><div data-faces>${facesHtml(session.vibe, VIBES)}</div></div>
    <details class="card"><summary>${session.note ? 'Note' : 'Add note'}</summary>
      <textarea data-field="note" rows="3" aria-label="Session note">${esc(session.note)}</textarea></details>
    ${isActive(session) ? '<button class="primary wide" data-act="finish">Finish session</button>' : ''}`;
}

function startHtml() {
  const workouts = state.workouts.filter(w => !w.archived);
  return `<div class="card"><h2>Start a session</h2>
    ${startDate && startDate !== today() ? `<p class="muted">Logging for ${fmtDay(startDate, true)}</p>` : ''}
    <div class="stack">
      ${workouts.map(w => `<button data-act="start" data-id="${w.id}">${esc(w.name)}</button>`).join('')}
      <button data-act="start" data-id="">Blank session</button>
    </div>
    ${workouts.length ? '' : '<p class="muted small">Build templates like "Leg Day" in the Workouts tab.</p>'}
  </div>`;
}

function savedHtml(open) {
  const item = s => {
    const { sets, reps } = sessionSummary(history.get(s.id));
    const status = isActive(s) ? 'in progress' : fmtClock(s.durationSec);
    const done = doneNames(s, new Map([...exercises].map(([id, x]) => [id, x.name])));
    return `<li class="vibe-line ${s.vibe ?? ''}" data-id="${s.id}"><button class="open" data-act="open">
        <b>${esc(s.title || 'Session')}</b>
        ${done.length ? `<span class="small">${esc(done.join(' · '))}</span>` : ''}
        <span class="muted small">${fmtDay(s.date, true)} · ${sets} sets, ${reps} reps · ${status}</span>
        ${s.note ? `<span class="muted small clip">${esc(s.note)}</span>` : ''}
      </button><button class="ghost" data-act="delete" aria-label="Delete session">✕</button></li>`;
  };
  // Newest first; sessions on the same date keep newest-created first.
  const saved = [...state.sessions].reverse().filter(s => s !== open).sort((a, b) => b.date.localeCompare(a.date));
  return saved.length ? `<h2 class="sep">Saved sessions</h2><ul class="list">${saved.map(item).join('')}</ul>` : '';
}

function render() {
  const session = current();
  history = buildHistory(state.sessions);
  exercises = new Map(state.exercises.map(x => [x.id, x]));
  root.innerHTML = (session ? editorHtml(session) : startHtml()) + savedHtml(session);
  placeLegend(root);
  tick();
}

export function tick(now = Date.now()) {
  const clock = root.querySelector('#clock');
  if (!clock || !state.active) return;
  setText(clock, fmtClock(elapsedSec(state.active, now)));
  setText(root.querySelector('#timer-toggle'), timers.running() ? 'Pause' : 'Start');
  const { left, done } = timers.restState(now);
  root.querySelector('#rest').hidden = !(restOpen || left || done);
  setText(root.querySelector('#rest-left'), done ? 'Rest done' : left ? fmtClock(left) : '');
}

// --- Targeted updates: a tap repaints its circle, the entry's stars and its −1 button ---

function refreshEntry(card, session, entry) {
  card.querySelector('.stars').innerHTML = starsHtml(livePbs(session, entry));
  const minus1 = card.querySelector('[data-act="minus1"]');
  if (minus1) minus1.disabled = !entry.reps.some(Boolean);
  placeLegend(root);
}

function changeReps(circle, change) {
  const card = circle.closest('.entry'), session = current(), entry = entryOf(session, card);
  const i = Number(circle.dataset.i), was = entry.reps[i], now = change(was);
  entry.reps[i] = now;
  circle.textContent = now || '';
  circle.classList.toggle('on', now > 0);
  circle.setAttribute('aria-label', `Set ${i + 1}: ${now} reps`);
  refreshEntry(card, session, entry);
  save();
  // Every added rep (re)starts the rest countdown, so it runs from the last rep of the set.
  if (now > was && isActive(session)) {
    timers.startRest();
    tick();
  }
}

function pickExercise(session) {
  const used = new Set(session.entries.map(e => e.exerciseId));
  const options = state.exercises.filter(x => !x.archived && !used.has(x.id));
  const sheet = openSheet(`<h2>Add exercise</h2>
    ${options.length
      ? sectionsHtml(groupBySection(options), items => `<div class="stack">${items.map(x => `<button data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>`)
      : '<p class="muted">Nothing to add. Create exercises in Workouts > Exercises.</p>'}
    <div class="row end"><button class="ghost" data-close>Close</button></div>`);
  sheet.addEventListener('click', e => {
    const ex = exercises.get(e.target.closest('[data-id]')?.dataset.id);
    if (!ex) return;
    const entry = newEntry(ex);
    session.entries.push(entry);
    prefillKg(session, [entry]);
    save();
    sheet.close();
    render();
  });
}

async function deleteSession(id) {
  if (!(await ask('Delete this session?', 'Delete'))) return;
  if (state.active?.sessionId === id) timers.finishActive();
  state.sessions = state.sessions.filter(s => s.id !== id);
  save();
  render();
}

async function onClick(e) {
  const btn = e.target.closest('[data-act], [data-face]');
  if (!btn) return;
  const session = current();
  if (btn.dataset.face) {
    session.vibe = toggleValue(session.vibe, btn.dataset.face);
    btn.closest('[data-faces]').innerHTML = facesHtml(session.vibe, VIBES);
    return save();
  }
  const card = btn.closest('.entry');
  const entry = card && entryOf(session, card);
  switch (btn.dataset.act) {
    case 'start':
      openId = startSession(btn.dataset.id, startDate ?? today()).id;
      startDate = null;
      return render();
    case 'open':
      openId = btn.closest('li').dataset.id;
      render();
      return window.scrollTo(0, 0);
    case 'close':
      openId = null;
      return render();
    case 'delete':
      return deleteSession(btn.closest('li').dataset.id);
    case 'finish':
      timers.finishActive();
      openId = null;
      return render();
    case 'timer-toggle':
      timers.toggleTimer();
      return tick();
    case 'timer-reset':
      if (await ask('Reset the workout timer to 00:00?', 'Reset')) {
        timers.resetTimer();
        tick();
      }
      return;
    case 'rest-toggle': {
      const visible = !root.querySelector('#rest').hidden;
      restOpen = !visible;
      if (visible) timers.stopRest();
      return tick();
    }
    case 'rest':
      state.settings.restSec = Number(btn.dataset.sec);
      timers.startRest();
      root.querySelectorAll('[data-act="rest"]').forEach(b => b.classList.toggle('on', b === btn));
      return tick();
    case 'add-exercise':
      return pickExercise(session);
    case 'entry-remove':
      if (await ask('Remove this exercise from the session?', 'Remove')) {
        session.entries.splice(session.entries.indexOf(entry), 1);
        save();
        render();
      }
      return;
    case 'set-add':
    case 'set-remove':
      if (btn.dataset.act === 'set-add') {
        entry.reps.push(0);
        entry.effort.push(null);
      } else {
        entry.reps.pop();
        entry.effort.pop();
      }
      card.outerHTML = entryHtml(session, entry);
      placeLegend(root);
      return save();
    case 'effort': {
      const i = Number(btn.dataset.i);
      const effort = EFFORTS[(EFFORTS.indexOf(entry.effort[i]) + 1) % EFFORTS.length];
      entry.effort[i] = effort;
      btn.className = `effort ${effort ?? ''}`;
      btn.textContent = EFFORT_LETTERS[effort] ?? '–';
      btn.setAttribute('aria-label', effortLabel(effort, i));
      tip(`Set ${i + 1}: ${EFFORT_NAMES[effort] ?? 'no effort set'}`);
      return save();
    }
    case 'minus1': {
      const i = entry.reps.findLastIndex(Boolean);
      return changeReps(card.querySelector(`.circle[data-i="${i}"]`), n => n - 1);
    }
  }
}

function onInput(e) {
  const field = e.target.dataset.field, session = current();
  if (!session) return;
  if (field === 'title' || field === 'note') {
    session[field] = e.target.value;
  } else if (field === 'kg' || field === 'minutes' || field === 'km') {
    const card = e.target.closest('.entry'), entry = entryOf(session, card);
    entry[field] = field === 'km' && e.target.value === '' ? null : num(e.target.value);
    refreshEntry(card, session, entry);
  } else {
    return;
  }
  save();
}

function onChange(e) {
  const field = e.target.dataset.field, session = current();
  if (field === 'date' && session && e.target.value) {
    session.date = e.target.value;
    save();
    render();
  }
}

export function init(el) {
  root = el;
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  onPress(root, '.circle', {
    tap: circle => {
      haptic('tap');
      changeReps(circle, n => n + 1);
    },
    long: circle => {
      haptic('long');
      changeReps(circle, () => 0);
    },
  });
}

export function show(detail = {}) {
  if (detail.openId) openId = detail.openId;
  startDate = detail.date ?? null;
  render();
}
