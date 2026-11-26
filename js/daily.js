// Daily screen: one date at a time. Day type, nutrition, sleep and fasting.

import { state, save, uid } from './store.js';
import { today, addDays, fmtDay, toInput, fromInput, dateOfIso, fmtTime, fmtDateTime, secondsBetween, fmtHM } from './time.js';
import { dayType, doneNames } from './stats.js';
import { esc, setText, facesHtml, toggleValue, fastButtonHtml, sleepButtonHtml, openSheet, ask, tip, go } from './ui.js';

export const NUTRITION = { bad: 'Not great', ok: 'Okay', great: 'Great' };
const RECENT = 2;   // entries shown in each recent list until Show all

let root;
let date = today();
const expanded = new Set();   // recent lists showing every entry

const sessionsToday = () => state.sessions.filter(s => s.date === date);
const sleepTotal = x => fmtHM(secondsBetween(x.bed, x.wake));
export const runningFast = () => state.fasts.find(f => !f.end);

// Starts a fast now, or ends the one in progress now.
export function toggleFast() {
  const fast = runningFast();
  if (fast) fast.end = new Date().toISOString();
  else state.fasts.push({ id: uid(), start: new Date().toISOString(), end: null });
  save();
}

// Sleep stamps bed time now; Wake up then logs the night from that bed time to now.
export function toggleSleep() {
  const now = new Date().toISOString();
  if (state.bedtime) state.sleep.push({ id: uid(), bed: state.bedtime, wake: now });
  state.bedtime = state.bedtime ? null : now;
  save();
}

// A sheet to correct a start and end time, for when a button was tapped late. With
// endOptional, an empty end keeps it running. onSave(startIso, endIso | null) after checks.
function timesSheet({ title, startLabel, endLabel, start, end, endOptional, onSave }) {
  const sheet = openSheet(`<h2>${title}</h2>
    <label>${startLabel} <input type="datetime-local" name="start" value="${toInput(start)}"></label>
    ${endLabel ? `<label>${endLabel} <input type="datetime-local" name="end" value="${end ? toInput(end) : ''}"></label>` : ''}
    ${endOptional ? `<p class="muted small">Leave ${endLabel} empty if it is still going.</p>` : ''}
    <div class="row end"><button class="ghost" data-close>Cancel</button><button class="primary" data-save>Save</button></div>`);
  sheet.addEventListener('click', e => {
    if (!e.target.closest('[data-save]')) return;
    const startValue = sheet.querySelector('[name="start"]').value, endValue = sheet.querySelector('[name="end"]')?.value ?? '';
    if (!startValue || (endLabel && !endValue && !endOptional) || (endValue && endValue <= startValue)) return tip(`${endLabel ?? 'End'} must be after ${startLabel.toLowerCase()}`);
    if (fromInput(startValue) > new Date().toISOString()) return tip(`${startLabel} cannot be in the future`);
    if (onSave(fromInput(startValue), endValue ? fromInput(endValue) : null) === false) return;
    save();
    sheet.close();
  });
}

export function editFastTimes(fast, done) {
  timesSheet({
    title: 'Fast times', startLabel: 'Started', endLabel: 'Ended', start: fast.start, end: fast.end, endOptional: true,
    onSave: (start, end) => {
      if (!end && runningFast() && runningFast() !== fast) return tip('Another fast is already in progress') && false;
      Object.assign(fast, { start, end });
      done();
    },
  });
}

// A logged night, or (with no entry) the bedtime of the night still in progress.
export function editSleepTimes(entry, done) {
  timesSheet({
    title: 'Sleep times', startLabel: 'Went to bed', endLabel: entry && 'Woke up', start: entry?.bed ?? state.bedtime, end: entry?.wake,
    onSave: (bed, wake) => {
      if (entry) Object.assign(entry, { bed, wake });
      else state.bedtime = bed;
      done();
    },
  });
}

// Day records exist only while they hold an override or a nutrition rating.
function setDay(patch, on = date) {
  const day = { type: null, nutrition: null, ...state.days[on], ...patch };
  if (day.type || day.nutrition) state.days[on] = day;
  else delete state.days[on];
  save();
}

export const setNutrition = (on, nutrition) => setDay({ nutrition }, on);

export const nutritionHtml = value => `<div class="nutrition"><h2>Nutrition</h2><div data-faces>${facesHtml(value, NUTRITION)}</div></div>`;

// A phone can keep the app open for days; when the date changes, go back to today.
export function newDay() {
  date = today();
}

// Reads the sleep form's bed and wake inputs as ISO strings, or null if invalid.
function readSpan(startField, endField) {
  const value = field => root.querySelector(`[data-field="${field}"]`).value;
  const start = value(startField), end = value(endField);
  if (!start || !end || end <= start) return null;
  return { start: fromInput(start), end: fromInput(end) };
}

const recentList = (items, rowHtml, kind) => (items.length ? `<ul class="list">${(expanded.has(kind) ? items : items.slice(0, RECENT)).map(x => `<li data-id="${x.id}">
    <span class="grow">${rowHtml(x)}</span>
    <button class="ghost" data-act="${kind}-edit">Edit</button>
    <button class="ghost" data-act="${kind}-delete" aria-label="Delete entry">✕</button></li>`).join('')}</ul>
    ${items.length > RECENT ? `<button class="ghost wide" data-act="more" data-kind="${kind}">${expanded.has(kind) ? 'Show less' : `Show all (${items.length})`}</button>` : ''}` : '');

function renderDayType() {
  const sessions = sessionsToday();
  const type = dayType(state.days, date, sessions.length > 0);
  const btn = (value, label) => `<button data-act="type" data-type="${value}" aria-pressed="${type === value}"${type === value ? ' class="on"' : ''}>${label}</button>`;
  const names = new Map(state.exercises.map(x => [x.id, x.name]));
  const card = s => {
    const done = doneNames(s, names);
    return `<button class="open vibe-line ${s.vibe ?? ''}" data-act="open" data-id="${s.id}"><b>${esc(s.title || 'Session')} ›</b>
      <span class="small">${done.length ? esc(done.join(' · ')) : 'Nothing logged yet'}</span></button>`;
  };
  const workout = sessions.length
    ? `<div class="stack">${sessions.map(card).join('')}</div>`
    : '<button class="primary wide" data-act="start">Start workout</button>';
  root.querySelector('#day-type').innerHTML = `<h2>Day type</h2>
    <div class="seg">${btn('workout', 'Workout day')}${btn('rest', 'Rest day')}</div>
    ${type === 'workout' ? workout : ''}`;
}

function renderSleep() {
  const entry = state.sleep.find(x => dateOfIso(x.wake) === date);
  const bed = entry ? toInput(entry.bed) : `${addDays(date, -1)}T23:00`;
  const wake = entry ? toInput(entry.wake) : `${date}T07:00`;
  const recent = [...state.sleep].sort((a, b) => b.wake.localeCompare(a.wake));
  root.querySelector('#sleep').innerHTML = `<h2>Sleep</h2>
    <p class="big" id="sleep-total">${entry ? sleepTotal(entry) : '<span class="muted small">Not logged yet</span>'}</p>
    ${state.bedtime ? `<p class="row muted small"><span class="grow">Asleep since ${fmtDateTime(state.bedtime)}</span>
      <button class="ghost" data-act="bedtime-edit">Change time</button></p>` : ''}
    <div class="row">${sleepButtonHtml(state.bedtime)}</div>
    <label>Bed time <input type="datetime-local" data-field="bed" value="${bed}"></label>
    <label>Awake time <input type="datetime-local" data-field="wake" value="${wake}"></label>
    <div class="row end"><button class="primary" data-act="sleep-save">${entry ? 'Update sleep' : 'Log sleep'}</button></div>
    ${recentList(recent, x => `<b>${sleepTotal(x)}</b> <span class="muted small">${fmtDay(dateOfIso(x.wake))} · ${fmtTime(x.bed)} to ${fmtTime(x.wake)}</span>`, 'sleep')}`;
}

function renderFasting() {
  const running = runningFast();
  const recent = [...state.fasts].sort((a, b) => b.start.localeCompare(a.start));
  root.querySelector('#fasting').innerHTML = `<h2>Fasting</h2>
    ${running ? `<p class="big" id="fast-live"></p>
      <p class="row muted small"><span class="grow">Started ${fmtDateTime(running.start)}</span>
        <button class="ghost" data-act="fast-edit" data-id="${running.id}">Change times</button></p>` : ''}
    <div class="row">${fastButtonHtml(Boolean(running))}</div>
    ${recentList(recent, f => `<b>${f.end ? fmtHM(secondsBetween(f.start, f.end)) : 'In progress'}</b>
      <span class="muted small">${fmtDateTime(f.start)} to ${f.end ? fmtDateTime(f.end) : 'now'}</span>`, 'fast')}`;
  tick();
}

function render() {
  root.innerHTML = `<header class="row head">
      <button data-act="prev" aria-label="Previous day">‹</button>
      <div class="grow center"><h1>${date === today() ? `Today, ${fmtDay(date)}` : fmtDay(date, true)}</h1>
        <input type="date" data-field="date" value="${date}" aria-label="Pick a date"></div>
      <button data-act="next" aria-label="Next day">›</button>
    </header>
    <section class="card" id="day-type"></section>
    <section class="card">${nutritionHtml(state.days[date]?.nutrition ?? null)}</section>
    <section class="card" id="sleep"></section>
    <section class="card" id="fasting"></section>`;
  renderDayType();
  renderSleep();
  renderFasting();
}

export function tick() {
  const el = root.querySelector('#fast-live'), fast = runningFast();
  if (el && fast) setText(el, fmtHM(secondsBetween(fast.start, new Date().toISOString())));
}

function setDate(next) {
  date = next;
  render();
}

function toggleDayType(tapped) {
  const derived = sessionsToday().length ? 'workout' : null;
  const next = toggleValue(dayType(state.days, date, Boolean(derived)), tapped);
  setDay({ type: next === derived ? null : next });
  renderDayType();
}

function saveSleep() {
  const span = readSpan('bed', 'wake');
  if (!span) return tip('Awake time must be after bed time');
  const entry = state.sleep.find(x => dateOfIso(x.wake) === date);
  if (entry) Object.assign(entry, { bed: span.start, wake: span.end });
  else state.sleep.push({ id: uid(), bed: span.start, wake: span.end });
  save();
  renderSleep();
}

async function removeEntry(list, id, rerender) {
  if (!(await ask('Delete this entry?', 'Delete'))) return;
  list.splice(list.findIndex(x => x.id === id), 1);
  save();
  rerender();
}

function onClick(e) {
  const btn = e.target.closest('[data-act], [data-face]');
  if (!btn) return;
  if (btn.dataset.face) {
    const nutrition = toggleValue(state.days[date]?.nutrition ?? null, btn.dataset.face);
    setDay({ nutrition });
    btn.closest('[data-faces]').innerHTML = facesHtml(nutrition, NUTRITION);
    return;
  }
  const id = btn.dataset.id ?? btn.closest('[data-id]')?.dataset.id;
  switch (btn.dataset.act) {
    case 'prev': return setDate(addDays(date, -1));
    case 'next': return setDate(addDays(date, 1));
    case 'type': return toggleDayType(btn.dataset.type);
    case 'open': return go('session', { openId: id });
    case 'start': return go('session', { date });
    case 'sleep-save': return saveSleep();
    case 'sleep-edit': return editSleepTimes(state.sleep.find(x => x.id === id), renderSleep);
    case 'bedtime-edit': return editSleepTimes(null, renderSleep);
    case 'sleep-delete': return removeEntry(state.sleep, id, renderSleep);
    case 'fast':
      toggleFast();
      return renderFasting();
    case 'sleep':
      toggleSleep();
      return renderSleep();
    case 'fast-edit': return editFastTimes(state.fasts.find(f => f.id === id), renderFasting);
    case 'fast-delete': return removeEntry(state.fasts, id, renderFasting);
    case 'more': {
      const kind = btn.dataset.kind;
      if (!expanded.delete(kind)) expanded.add(kind);
      return kind === 'sleep' ? renderSleep() : renderFasting();
    }
  }
}

// Live sleep total while the pickers change.
function onInput(e) {
  if (!['bed', 'wake'].includes(e.target.dataset.field)) return;
  const span = readSpan('bed', 'wake');
  setText(root.querySelector('#sleep-total'), span ? fmtHM(secondsBetween(span.start, span.end)) : '-');
}

export function init(el) {
  root = el;
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('change', e => {
    if (e.target.dataset.field === 'date' && e.target.value) setDate(e.target.value);
  });
}

export function show(detail = {}) {
  if (detail.date) setDate(detail.date);
  else render();
}
