// Summary screen: totals for a day, a Monday-to-Sunday week or a month. Also the settings
// sheet, opened from the cog at the top of every screen.

import { state, save, replaceState, migrate } from './store.js';
import { today, weekStart, addDays, weekLabel, fmtDay, fmtHM, dateOfIso, daysSince, monthStart, monthEnd, addMonths, monthLabel, parseDate } from './time.js';
import { periodStats, tidyExercises, musclesTrained, sectionVolume, percentOf, blockProgress } from './stats.js';
import { radarHtml, openHistory } from './progress.js';
import { LIBRARY, musclesOf } from './library.js';
import { muscleMapHtml } from './muscles.js';
import { esc, fmtNum, starsHtml, placeLegend, openSheet, ask, isIOS } from './ui.js';
import { REST_PRESETS } from './timers.js';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TYPE_LETTERS = { workout: 'W', rest: 'R' };
const NUDGE_DAYS = isIOS ? 7 : 14;

// How each period finds its dates, steps back and forward, and names itself.
const PERIODS = {
  day: { label: 'Day', range: d => [d, d], step: (d, n) => addDays(d, n), title: d => fmtDay(d, true), noun: 'today', last: 'the day before', bars: 14, short: d => String(parseDate(d).getDate()) },
  week: { label: 'Week', range: d => [weekStart(d), addDays(weekStart(d), 6)], step: (d, n) => addDays(d, 7 * n), title: d => weekLabel(weekStart(d)), noun: 'this week', last: 'last week', bars: 8,
    short: d => { const s = parseDate(weekStart(d)); return `${s.getDate()}/${s.getMonth() + 1}`; } },
  month: { label: 'Month', range: d => [monthStart(d), monthEnd(d)], step: addMonths, title: monthLabel, noun: 'this month', last: 'last month', bars: 6, short: d => monthLabel(d).slice(0, 3) },
};

let root;
let period = 'week';
let anchor = today();   // any date inside the period on screen

export function newDay() {
  anchor = today();
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const dot = (colour, label) => `<span class="dot ${colour ?? ''}" role="img" aria-label="${label}"></span>`;

function nudgeHtml() {
  const { lastExport, nudgeDismissedAt } = state.settings;
  const hasLogs = state.sessions.length + state.sleep.length + state.fasts.length > 0;
  if (!hasLogs || Math.min(daysSince(lastExport), daysSince(nudgeDismissedAt)) <= NUDGE_DAYS) return '';
  return `<div class="card notice row"><span class="grow">${lastExport ? `Your last backup is over ${NUDGE_DAYS} days old.` : 'You have no backup yet.'}</span>
    <button data-act="nudge-export">Export</button>
    <button class="ghost" data-act="nudge-dismiss" aria-label="Dismiss">✕</button></div>`;
}

function exerciseHtml(x) {
  const detail = x.strength
    ? `${plural(x.sets, 'set')} · ${plural(x.reps, 'rep')} · top ${fmtNum(x.topKg)} kg · volume ${fmtNum(x.volume)} kg`
    : `${fmtNum(x.minutes)} min${x.km ? ` · ${fmtNum(x.km)} km` : ''}`;
  return `<li><b>${esc(x.name)}</b> ${starsHtml(x.pbs)}<br><span class="muted small">${detail}</span></li>`;
}

// Week and month days as a Monday-first calendar: W or R, plus the nutrition colour.
function calendarHtml(days) {
  const now = today();
  const blanks = (parseDate(days[0].date).getDay() + 6) % 7;
  const cell = d => `<div${d.date === now ? ' class="today"' : ''}><span class="date-num">${parseDate(d.date).getDate()}</span>
    <b class="day-${d.type}">${TYPE_LETTERS[d.type] ?? '·'}</b>
    ${dot(d.nutrition, `${fmtDay(d.date)}: ${d.type ?? 'no'} day, nutrition ${d.nutrition ?? 'not rated'}`)}</div>`;
  return `<div class="cal">${DAY_LETTERS.map(l => `<div class="muted small">${l}</div>`).join('')}
    ${'<div></div>'.repeat(blanks)}${days.map(cell).join('')}</div>`;
}

function daysHtml(w) {
  if (period !== 'day') {
    return `<p>${plural(w.workoutDays, 'workout day')} · ${plural(w.restDays, 'rest day')}</p>${calendarHtml(w.days)}`;
  }
  const [d] = w.days;
  return `<p class="row"><b class="day-${d.type}">${d.type ? `${d.type === 'rest' ? 'Rest' : 'Workout'} day` : 'Day type not set'}</b>
    <span class="grow"></span><span class="muted small">Nutrition</span>${dot(d.nutrition, `Nutrition ${d.nutrition ?? 'not rated'}`)}</p>`;
}

// Volume per muscle group against the period before; tapping a group opens its history.
const BLOCK_WEEKS = [4, 6, 12];
const blockPicker = () => `<label>Start date <input type="date" data-field="block-start" value="${today()}"></label>
  <div class="row">${BLOCK_WEEKS.map(n => `<button class="grow" data-act="block" data-weeks="${n}">${n} weeks</button>`).join('')}</div>`;

const progressBar = b => `<div class="block-bar" role="progressbar" aria-label="Block progress" aria-valuemin="0" aria-valuemax="${b.days}" aria-valuenow="${Math.min(b.day, b.days)}">
  <span style="width:${(Math.min(b.day, b.days) / b.days) * 100}%"></span></div>
  <p class="muted small">${b.upcoming ? 'Not started yet' : b.done ? `All ${b.days} days done` : `Day ${b.day} of ${b.days}`}</p>`;

// With a training block, the spider chart tracks it: the latest 14 days against the first 14.
// Without one, it compares the period on screen with the one before, and offers a block.
function progressHtml(p) {
  const block = state.settings.block;
  if (!block) return `${periodProgressHtml(p)}<section class="card center"><h2>Track a training block</h2>
    <p class="muted small">Commit to 4, 6 or 12 weeks, starting on the day that suits you. The spider chart then shows how each muscle group grows from where you started.</p>
    ${blockPicker()}</section>`;
  const b = blockProgress(block, today());
  const head = `<h2>${b.done ? 'Block complete' : b.upcoming ? 'Block starts soon' : `Week ${b.week} of ${block.weeks}`}</h2>
    <p class="muted small">${block.weeks}-week block · ${fmtDay(block.start)} to ${fmtDay(b.end)}</p>${progressBar(b)}`;
  const end = b.done ? `<h3>Start your next block</h3>${blockPicker()}` : '<button class="ghost small" data-act="block-end">End block</button>';
  if (b.upcoming) return `<section class="card center">${head}<p>Your block starts on ${fmtDay(block.start)}.</p>${end}</section>`;
  const week1 = sectionVolume(state, ...b.base);
  if (b.week === 1) {
    return `<section class="card center">${head}
      <p class="muted small">Week 1 is your starting point. The shape grows with every set (reps × kg per muscle group). From week 2, try to beat it.</p>
      ${radarHtml(week1, 'week 1', 'kg')}${end}</section>`;
  }
  const now = sectionVolume(state, ...b.current);
  return `<section class="card center">${head}
    <p class="muted small">Reps × kg in week ${b.week}${b.done ? '' : ' so far'} as a % of week 1. Pass the dashed ring to beat your first week. Tap a muscle for each week.</p>
    ${radarHtml(percentOf(now, week1), 'week 1', '%', !b.done)}${end}</section>`;
}

function periodProgressHtml(p) {
  const now = sectionVolume(state, ...p.range(anchor));
  const before = sectionVolume(state, ...p.range(p.step(anchor, -1)));
  if (![...Object.values(now), ...Object.values(before)].some(Boolean)) return '';
  return `<section class="card center"><h2>Progress by muscle group</h2>
    <p class="muted small">Reps × kg ${p.noun} as a % of ${p.last}. Dashed ring = the same. Tap a muscle for its history.</p>
    ${radarHtml(percentOf(now, before), p.last)}</section>`;
}

function showHistory(section) {
  const block = state.settings.block;
  if (block) {
    const b = blockProgress(block, today());
    const bars = Array.from({ length: block.weeks }, (_, i) => {
      const from = addDays(block.start, 7 * i);
      return { label: `W${i + 1}`, value: sectionVolume(state, from, addDays(from, 6))[section] };
    });
    // A week still in progress is not compared, so a Monday never looks like a drop.
    return openHistory(section, bars, b.week - 1, `week ${b.week}${b.done ? '' : ' so far'}`, b.done && 'the week before');
  }
  const p = PERIODS[period];
  const bars = Array.from({ length: p.bars }, (_, i) => {
    const at = p.step(anchor, i - p.bars + 1);
    return { label: p.short(at), value: sectionVolume(state, ...p.range(at))[section] };
  });
  openHistory(section, bars, bars.length - 1, p.noun, p.last);
}

function trainedHtml() {
  const from = weekStart(anchor), to = addDays(from, 6);
  const muscles = musclesTrained(state.sessions.filter(s => s.date >= from && s.date <= to), musclesOf, state.exercises);
  const current = from === weekStart(today());
  return `<section class="card center"><h2>Muscles trained ${current ? 'this week' : ''}</h2>
    <p class="muted small">${current ? 'Starts fresh every Monday' : weekLabel(from)}</p>${muscleMapHtml(muscles, 90)}
    ${muscles.primary.length ? '<p class="muted small"><span class="key primary"></span> main <span class="key secondary"></span> supporting</p>' : '<p class="muted small">Nothing trained yet.</p>'}</section>`;
}

function render() {
  const p = PERIODS[period];
  const w = periodStats(state, ...p.range(anchor));
  const t = w.totals;
  const stat = (value, label) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
  const list = (items, itemHtml) => (items.length ? `<ul class="plain">${items.map(itemHtml).join('')}</ul>` : `<p class="muted small">Nothing logged ${p.noun}.</p>`);
  const tab = ([id, x]) => `<button role="tab" data-act="period" data-period="${id}" aria-selected="${id === period}"${id === period ? ' class="on"' : ''}>${x.label}</button>`;

  root.innerHTML = `<div class="seg" role="tablist" aria-label="Summary period">${Object.entries(PERIODS).map(tab).join('')}</div>
    <header class="row head">
      <button data-act="prev" aria-label="Previous ${p.label.toLowerCase()}">‹</button>
      <h1 class="grow center">${p.title(anchor)}</h1>
      <button data-act="next" aria-label="Next ${p.label.toLowerCase()}">›</button>
    </header>
    ${nudgeHtml()}
    <div class="grid">
      ${stat(t.sessions, 'Sessions')}${stat(t.sets, 'Sets')}${stat(t.reps, 'Reps')}
      ${stat(fmtNum(t.volume), 'Volume kg')}${stat(fmtNum(t.cardioMin), 'Cardio min')}${stat(fmtHM(t.timeSec), 'Workout time')}
    </div>
    <section class="card">
      <div data-legend><b>${plural(w.pbs.length, 'Personal Best')} ${p.noun}</b> ${starsHtml(w.pbs)}</div>
      <div class="row"><span class="muted small">Vibe</span>${w.vibes.map(v => dot(v, `Session vibe: ${v ?? 'not rated'}`)).join('') || '<span class="muted small">no sessions</span>'}</div>
    </section>
    ${progressHtml(p)}
    ${trainedHtml()}
    <section class="card"><h2>${period === 'day' ? 'Day' : 'Days'}</h2>${daysHtml(w)}</section>
    <section class="card"><h2>By workout</h2>
      ${list(w.byWorkout, x => `<li><b>${esc(x.name)}</b><br><span class="muted small">${plural(x.sessions, 'session')} · ${plural(x.sets, 'set')} · ${plural(x.reps, 'rep')}</span></li>`)}</section>
    <details class="card fold"><summary><span class="grow"><h2>By exercise</h2>
      <span class="muted small">${plural(w.byExercise.length, 'exercise')}</span></span></summary>${list(w.byExercise, exerciseHtml)}</details>
    <section class="card"><h2>Sleep</h2>
      <p>${w.sleep.nights ? `Average ${fmtHM(w.sleep.avgSec)} per night · Total ${fmtHM(w.sleep.totalSec)}` : `<span class="muted small">No sleep logged ${p.noun}.</span>`}</p></section>
    <section class="card"><h2>Fasting</h2>
      <p>${w.fasts.count ? `${plural(w.fasts.count, 'fast')} · Total ${fmtHM(w.fasts.totalSec)} · Longest ${fmtHM(w.fasts.longestSec)}` : `<span class="muted small">No fasts ended ${p.noun}.</span>`}</p></section>`;
  placeLegend(root);
}

// --- Settings ---

async function exportBackup() {
  const name = `cmk-workouts-${today()}.json`;
  const file = new File([JSON.stringify(state)], name, { type: 'application/json' });
  if (isIOS && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch {
      return 'Backup not saved.';
    }
  } else {
    const url = URL.createObjectURL(file);
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  state.settings.lastExport = new Date().toISOString();
  save();
  return 'Backup exported.';
}

async function importBackup(file) {
  let next;
  try {
    next = migrate(JSON.parse(await file.text()));
    tidyExercises(next, LIBRARY);
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

export function openSettings() {
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
      case 'export': return report(await exportBackup());
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
  const muscle = e.target.closest('[data-section]')?.dataset.section;
  if (muscle) return showHistory(muscle);
  if (e.target.closest('[data-act="block"]')) {
    const start = root.querySelector('[data-field="block-start"]')?.value || today();
    state.settings.block = { start, weeks: Number(e.target.closest('[data-weeks]').dataset.weeks) };
    save();
    return render();
  }
  if (e.target.closest('[data-act="block-end"]')) {
    return ask('End this training block? Your workouts stay; only the block tracking stops.', 'End block').then(yes => {
      if (!yes) return;
      state.settings.block = null;
      save();
      render();
    });
  }
  const btn = e.target.closest('[data-act]');
  switch (btn?.dataset.act) {
    case 'period': period = btn.dataset.period; return render();
    case 'prev': anchor = PERIODS[period].step(anchor, -1); return render();
    case 'next': anchor = PERIODS[period].step(anchor, 1); return render();
    case 'nudge-export': return exportBackup().then(render);
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
