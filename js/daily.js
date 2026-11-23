// Daily screen: one date at a time. Day type, nutrition, sleep and fasting.

import { state, save, uid } from './store.js';
import { today, addDays, fmtDay, toInput, fromInput, dateOfIso, fmtTime, fmtDateTime, secondsBetween, fmtHM } from './time.js';
import { dayType, doneNames } from './stats.js';
import { esc, setText, facesHtml, toggleValue, ask, tip, go } from './ui.js';

const NUTRITION = { bad: 'Not great', ok: 'OK, could be better', great: 'Great' };
const RECENT = 5;

let root;
let date = today();
let sleepEditId = null;
let fastEditId = null;

const sessionsToday = () => state.sessions.filter(s => s.date === date);
const sleepTotal = x => fmtHM(secondsBetween(x.bed, x.wake));
const runningFast = () => state.fasts.find(f => !f.end);

// Day records exist only while they hold an override or a nutrition rating.
function setDay(patch) {
  const day = { type: null, nutrition: null, ...state.days[date], ...patch };
  if (day.type || day.nutrition) state.days[date] = day;
  else delete state.days[date];
  save();
}

// Reads a start/end pair of datetime-local inputs as ISO strings, or null if invalid.
function readSpan(startField, endField, endOptional = false) {
  const value = field => root.querySelector(`[data-field="${field}"]`).value;
  const start = value(startField), end = value(endField);
  if (!start || (!end && !endOptional) || (end && end <= start)) return null;
  return { start: fromInput(start), end: end ? fromInput(end) : null };
}

const recentList = (items, rowHtml, kind) => (items.length ? `<ul class="list">${items.slice(0, RECENT).map(x => `<li data-id="${x.id}">
    <span class="grow">${rowHtml(x)}</span>
    <button class="ghost" data-act="${kind}-edit">Edit</button>
    <button class="ghost" data-act="${kind}-delete" aria-label="Delete entry">✕</button></li>`).join('')}</ul>` : '');

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
    ? `<div class="stack">${sessions.map(card).join('')}</div>
       <p class="muted small">Did cardio as well? Open the session and use + Add exercise.</p>`
    : '<button class="primary wide" data-act="start">Start workout</button>';
  root.querySelector('#day-type').innerHTML = `<h2>Day type</h2>
    <div class="seg">${btn('workout', 'Workout day')}${btn('rest', 'Rest day')}</div>
    ${type === 'workout' ? workout : ''}`;
}

function renderSleep() {
  const editing = state.sleep.find(x => x.id === sleepEditId);
  const entry = editing ?? state.sleep.find(x => dateOfIso(x.wake) === date);
  const bed = entry ? toInput(entry.bed) : `${addDays(date, -1)}T23:00`;
  const wake = entry ? toInput(entry.wake) : `${date}T07:00`;
  const recent = [...state.sleep].sort((a, b) => b.wake.localeCompare(a.wake));
  root.querySelector('#sleep').innerHTML = `<h2>Sleep</h2>
    <p class="big" id="sleep-total">${entry ? sleepTotal(entry) : '<span class="muted small">Not logged yet</span>'}</p>
    <label>Bed time <input type="datetime-local" data-field="bed" value="${bed}"></label>
    <label>Awake time <input type="datetime-local" data-field="wake" value="${wake}"></label>
    <div class="row end">${editing ? '<button class="ghost" data-act="sleep-cancel">Cancel</button>' : ''}
      <button class="primary" data-act="sleep-save">${entry ? 'Update sleep' : 'Log sleep'}</button></div>
    ${recentList(recent, x => `<b>${sleepTotal(x)}</b> <span class="muted small">${fmtDay(dateOfIso(x.wake))} · ${fmtTime(x.bed)} to ${fmtTime(x.wake)}</span>`, 'sleep')}`;
}

function renderFasting() {
  const running = runningFast();
  const editing = state.fasts.find(f => f.id === fastEditId);
  const recent = [...state.fasts].sort((a, b) => b.start.localeCompare(a.start));
  const form = editing ? `<label>Started <input type="datetime-local" data-field="fast-start" value="${toInput(editing.start)}"></label>
    <label>Ended <input type="datetime-local" data-field="fast-end" value="${editing.end ? toInput(editing.end) : ''}"></label>
    <div class="row end"><button class="ghost" data-act="fast-cancel">Cancel</button><button class="primary" data-act="fast-save">Save fast</button></div>` : '';
  root.querySelector('#fasting').innerHTML = `<h2>Fasting</h2>
    ${running
      ? `<p class="big" id="fast-live"></p><p class="muted small">Started ${fmtDateTime(running.start)}</p>
         <button class="wide" data-act="fast-end">End fast</button>`
      : '<button class="primary wide tall" data-act="fast-start">Start fast</button>'}
    ${form}
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
    <section class="card center"><h2>How was my nutrition today?</h2>
      <div data-faces>${facesHtml(state.days[date]?.nutrition ?? null, NUTRITION)}</div></section>
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
  sleepEditId = null;
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
  const entry = state.sleep.find(x => x.id === sleepEditId) ?? state.sleep.find(x => dateOfIso(x.wake) === date);
  if (entry) Object.assign(entry, { bed: span.start, wake: span.end });
  else state.sleep.push({ id: uid(), bed: span.start, wake: span.end });
  sleepEditId = null;
  save();
  renderSleep();
}

function saveFast() {
  const fast = state.fasts.find(f => f.id === fastEditId);
  const span = readSpan('fast-start', 'fast-end', true);
  if (!span) return tip('End must be after start');
  if (!span.end && runningFast() && runningFast() !== fast) return tip('Another fast is already in progress');
  Object.assign(fast, span);
  fastEditId = null;
  save();
  renderFasting();
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
    case 'sleep-edit': sleepEditId = id; return renderSleep();
    case 'sleep-cancel': sleepEditId = null; return renderSleep();
    case 'sleep-delete': return removeEntry(state.sleep, id, renderSleep);
    case 'fast-start':
      state.fasts.push({ id: uid(), start: new Date().toISOString(), end: null });
      save();
      return renderFasting();
    case 'fast-end':
      runningFast().end = new Date().toISOString();
      save();
      return renderFasting();
    case 'fast-save': return saveFast();
    case 'fast-edit': fastEditId = id; return renderFasting();
    case 'fast-cancel': fastEditId = null; return renderFasting();
    case 'fast-delete': return removeEntry(state.fasts, id, renderFasting);
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

// The Home button always lands on today.
export function show(detail = {}) {
  if (detail.home) setDate(today());
  else render();
}
