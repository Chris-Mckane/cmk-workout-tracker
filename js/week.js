// Week screen: Monday-to-Sunday totals, plus the settings sheet (backup, cleanup).

import { state, save, replaceState, migrate } from './store.js';
import { today, weekStart, addDays, weekLabel, fmtDay, fmtHM, dateOfIso, daysSince } from './time.js';
import { weekStats } from './stats.js';
import { esc, fmtNum, starsHtml, placeLegend, openSheet, ask, isIOS } from './ui.js';
import { REST_PRESETS } from './timers.js';

const GEAR = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke-dasharray="3.34 3.34"/><circle cx="12" cy="12" r="5.5"/></svg>`;
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TYPE_LETTERS = { workout: 'W', rest: 'R' };
const NUDGE_DAYS = isIOS ? 7 : 14;

let root;
let start = weekStart(today());

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const dot = (colour, label) => `<span class="dot ${colour ?? ''}" role="img" aria-label="${label}"></span>`;

function nudgeHtml() {
  const { lastExport, nudgeDismissedAt } = state.settings;
  const hasLogs = state.sessions.length + state.sleep.length + state.fasts.length > 0;
  if (!hasLogs || Math.min(daysSince(lastExport), daysSince(nudgeDismissedAt)) <= NUDGE_DAYS) return '';
  return `<div class="card notice row"><span class="grow">${lastExport ? `Your last backup is over ${NUDGE_DAYS} days old.` : 'You have no backup yet.'} Export one from settings.</span>
    <button class="ghost" data-act="nudge-dismiss" aria-label="Dismiss">✕</button></div>`;
}

function exerciseHtml(x) {
  const detail = x.strength
    ? `${plural(x.sets, 'set')} · ${plural(x.reps, 'rep')} · top ${fmtNum(x.topKg)} kg · volume ${fmtNum(x.volume)} kg`
    : `${fmtNum(x.minutes)} min${x.km ? ` · ${fmtNum(x.km)} km` : ''}`;
  return `<li><b>${esc(x.name)}</b> ${starsHtml(x.pbs)}<br><span class="muted small">${detail}</span></li>`;
}

function render() {
  const w = weekStats(state, start);
  const t = w.totals;
  const stat = (value, label) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
  const list = (items, itemHtml) => (items.length ? `<ul class="plain">${items.map(itemHtml).join('')}</ul>` : '<p class="muted small">Nothing logged this week.</p>');
  const day = (d, i) => `<div><span class="muted small">${DAY_LETTERS[i]}</span><b class="day-${d.type}">${TYPE_LETTERS[d.type] ?? '·'}</b>
    ${dot(d.nutrition, `${fmtDay(d.date)}: ${d.type ?? 'no'} day, nutrition ${d.nutrition ?? 'not rated'}`)}</div>`;

  root.innerHTML = `<header class="row head">
      <button data-act="prev" aria-label="Previous week">‹</button>
      <h1 class="grow center">${weekLabel(start)}</h1>
      <button data-act="next" aria-label="Next week">›</button>
      <button class="ghost" data-act="settings" aria-label="Settings">${GEAR}</button>
    </header>
    ${nudgeHtml()}
    <div class="grid">
      ${stat(t.sessions, 'Sessions')}${stat(t.sets, 'Sets')}${stat(t.reps, 'Reps')}
      ${stat(fmtNum(t.volume), 'Volume kg')}${stat(fmtNum(t.cardioMin), 'Cardio min')}${stat(fmtHM(t.timeSec), 'Workout time')}
    </div>
    <section class="card">
      <div data-legend><b>${plural(w.pbs.length, 'Personal Best')} this week</b> ${starsHtml(w.pbs)}</div>
      <div class="row"><span class="muted small">Vibe</span>${w.vibes.map(v => dot(v, `Session vibe: ${v ?? 'not rated'}`)).join('') || '<span class="muted small">no sessions</span>'}</div>
    </section>
    <section class="card"><h2>Days</h2>
      <p>${plural(w.workoutDays, 'workout day')} · ${plural(w.restDays, 'rest day')}</p>
      <div class="strip">${w.days.map(day).join('')}</div></section>
    <section class="card"><h2>By workout</h2>
      ${list(w.byWorkout, x => `<li><b>${esc(x.name)}</b><br><span class="muted small">${plural(x.sessions, 'session')} · ${plural(x.sets, 'set')} · ${plural(x.reps, 'rep')}</span></li>`)}</section>
    <section class="card"><h2>By exercise</h2>${list(w.byExercise, exerciseHtml)}</section>
    <section class="card"><h2>Sleep</h2>
      <p>${w.sleep.nights ? `Average ${fmtHM(w.sleep.avgSec)} per night · Total ${fmtHM(w.sleep.totalSec)}` : '<span class="muted small">No sleep logged this week.</span>'}</p></section>
    <section class="card"><h2>Fasting</h2>
      <p>${w.fasts.count ? `${plural(w.fasts.count, 'fast')} · Total ${fmtHM(w.fasts.totalSec)} · Longest ${fmtHM(w.fasts.longestSec)}` : '<span class="muted small">No fasts ended this week.</span>'}</p></section>`;
  placeLegend(root);
}

// --- Settings ---

function exportBackup() {
  state.settings.lastExport = new Date().toISOString();
  save();
  const url = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: 'application/json' }));
  Object.assign(document.createElement('a'), { href: url, download: `cmk-workouts-${today()}.json` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importBackup(file) {
  let next;
  try {
    next = migrate(JSON.parse(await file.text()));
  } catch {
    return 'That file is not a CMK Workout Tracker backup.';
  }
  const confirmed = await ask(`Replace everything on this phone with this backup (${next.sessions.length} sessions)?`, 'Replace');
  if (!confirmed) return '';
  replaceState(next);
  return 'Backup restored.';
}

// Removes logs dated before `before`. A session still in progress is never removed.
async function deleteOlder(before) {
  if (!before) return 'Pick a date first.';
  if (!(await ask(`Delete all sessions, sleep, fasts and day logs from before ${fmtDay(before, true)}? This cannot be undone.`, 'Delete'))) return '';
  state.sessions = state.sessions.filter(s => s.date >= before || s.id === state.active?.sessionId);
  state.sleep = state.sleep.filter(x => dateOfIso(x.wake) >= before);
  state.fasts = state.fasts.filter(f => !f.end || dateOfIso(f.end) >= before);
  for (const date of Object.keys(state.days)) {
    if (date < before) delete state.days[date];
  }
  save();
  return 'Old logs deleted.';
}

function openSettings() {
  const option = sec => `<option value="${sec}"${sec === state.settings.restSec ? ' selected' : ''}>${sec} s</option>`;
  const sheet = openSheet(`<h2>Settings</h2>
    ${isIOS ? '<p class="muted small">On iPhone, export a backup regularly: iOS can clear web app data.</p>' : ''}
    <button class="wide" data-act="export">Export backup</button>
    <button class="wide" data-act="import">Import backup</button>
    <input type="file" accept=".json,application/json" hidden>
    <label>Delete logs older than <input type="date" data-field="before"></label>
    <button class="wide danger" data-act="delete-older">Delete older logs</button>
    <label>Rest timer default <select data-field="rest">${REST_PRESETS.map(option).join('')}</select></label>
    <p class="muted small" role="status" data-msg></p>
    <div class="row end"><button class="ghost" data-close>Close</button></div>`);
  const file = sheet.querySelector('[type="file"]');
  const report = message => {
    sheet.querySelector('[data-msg]').textContent = message;
    render();
  };
  sheet.addEventListener('click', async e => {
    switch (e.target.closest('[data-act]')?.dataset.act) {
      case 'export': exportBackup(); return report('Backup exported.');
      case 'import': return file.click();
      case 'delete-older': return report(await deleteOlder(sheet.querySelector('[data-field="before"]').value));
    }
  });
  sheet.addEventListener('change', async e => {
    if (e.target === file && file.files[0]) {
      report(await importBackup(file.files[0]));
      file.value = '';
    } else if (e.target.dataset.field === 'rest') {
      state.settings.restSec = Number(e.target.value);
      save();
    }
  });
}

function onClick(e) {
  switch (e.target.closest('[data-act]')?.dataset.act) {
    case 'prev': start = addDays(start, -7); return render();
    case 'next': start = addDays(start, 7); return render();
    case 'settings': return openSettings();
    case 'nudge-dismiss':
      state.settings.nudgeDismissedAt = new Date().toISOString();
      save();
      return render();
  }
}

export function init(el) {
  root = el;
  root.addEventListener('click', onClick);
}

export function show() {
  render();
}
