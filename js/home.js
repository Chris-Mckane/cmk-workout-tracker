// Home: the hub everything opens from. Today's progress, the next workout (or the one in
// progress), and tiles for the rest of the app. The two cards can be dragged by their grips;
// the order is kept in settings.order.home.

import { state, save } from './store.js';
import { today, fmtDay, fmtClock, fmtHM, fmtTime, elapsedSec, dateOfIso, secondsBetween } from './time.js';
import { periodStats, applyOrder, dayType, plannedWorkout, doneNames } from './stats.js';
import { esc, nextSelectHtml, go, setText, enableDrag, GRIP, facesHtml, toggleValue, fastButtonHtml, sleepButtonHtml } from './ui.js';
import { startSession } from './session.js';
import { workoutChoices, adoptWorkout } from './library.js';
import { runningFast, toggleFast, toggleSleep, setNutrition, nutritionHtml, editFastTimes, editSleepTimes, NUTRITION } from './daily.js';

const CARDS = ['today', 'workout'];
const DAY_TYPES = { workout: 'Workout day', rest: 'Rest day' };
const TILES = [
  ['workouts', 'My workouts', 'Workouts and exercise library'],
  ['daily', 'Daily log', 'Day type, nutrition, sleep, fasting'],
];

let root;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const greeting = () => ['Good morning', 'Good afternoon', 'Good evening'][Math.min(2, Math.floor(Math.max(0, new Date().getHours() - 5) / 7))];

function workoutCard() {
  const active = state.sessions.find(s => s.id === state.active?.sessionId);
  if (active) {
    return `<h2>Workout in progress</h2>
      <p class="row"><b class="grow">${esc(active.title || 'Session')}</b><span class="big" id="home-clock"></span></p>
      <button class="primary wide" data-act="resume">Resume workout</button>`;
  }
  const next = plannedWorkout(state);
  const names = new Map(state.exercises.map(x => [x.id, x.name]));
  return `<h2>Next workout</h2>
    ${nextSelectHtml(workoutChoices(), next?.id)}
    ${next ? `<p class="muted small">${next.exerciseIds.map(id => esc(names.get(id) ?? '')).filter(Boolean).join(' · ') || 'No exercises yet'}</p>` : ''}
    <button class="primary wide" data-act="start" data-id="${next?.id ?? ''}">${next ? 'Start workout' : 'Start a blank workout'}</button>`;
}

function todayCard() {
  const date = today();
  const sessions = state.sessions.filter(s => s.date === date);
  const names = new Map(state.exercises.map(x => [x.id, x.name]));
  const done = [...new Set(sessions.flatMap(s => doneNames(s, names)))];
  const { totals } = periodStats(state, date, date);
  const type = dayType(state.days, date, sessions.length > 0);
  const nutrition = state.days[date]?.nutrition;
  const sleep = state.sleep.find(x => dateOfIso(x.wake) === date);
  const fast = runningFast();
  const lastFast = state.fasts.filter(f => f.end && dateOfIso(f.end) === date).sort((a, b) => b.end.localeCompare(a.end))[0];
  const glance = [
    sessions.length ? plural(sessions.length, 'workout') : 'No workout yet',
    state.bedtime ? 'Asleep' : sleep && `Slept ${fmtHM(secondsBetween(sleep.bed, sleep.wake))}`,
    fast && 'Fasting',
  ].filter(Boolean).join(' · ');
  // The details fold away (remembered in settings.todayOpen); the buttons always show.
  return `<details class="fold" data-today${state.settings.todayOpen ? ' open' : ''}>
    <summary><span class="grow"><h2>Today's progress</h2><span class="muted small">${glance}</span></span></summary>
    <ul class="plain facts">
      <li><span class="muted">Workouts</span><b>${sessions.length ? `${plural(sessions.length, 'session')} · ${plural(totals.sets, 'set')}` : 'None yet'}</b></li>
      ${done.length ? `<li class="muted small">${esc(done.join(' · '))}</li>` : ''}
      <li><span class="muted">Day</span><b class="day-${type}">${DAY_TYPES[type] ?? 'Not set'}</b></li>
      <li><span class="muted">Sleep</span><b>${state.bedtime ? `Asleep since ${fmtTime(state.bedtime)}` : sleep ? fmtHM(secondsBetween(sleep.bed, sleep.wake)) : 'Not logged'}</b></li>
      <li><span class="muted">Fast</span><b id="home-fast">${fast ? '' : lastFast ? `Last fast ${fmtHM(secondsBetween(lastFast.start, lastFast.end))}` : 'Not fasting'}</b></li>
    </ul></details>
    ${nutritionHtml(nutrition ?? null)}
    ${fast || lastFast || state.bedtime || sleep ? `<div class="row">
      ${fast || lastFast ? `<button class="bar-link grow" data-act="fast-times" data-id="${(fast ?? lastFast).id}">Edit fast time ›</button>` : ''}
      ${state.bedtime || sleep ? `<button class="bar-link grow" data-act="sleep-times" data-id="${state.bedtime ? '' : sleep.id}">Edit sleep time ›</button>` : ''}
    </div>` : ''}
    <div class="row">
      ${fastButtonHtml(Boolean(fast))}
      ${sleepButtonHtml(state.bedtime)}
    </div>`;
}

function render() {
  const cards = { today: todayCard, workout: workoutCard };
  const order = applyOrder(CARDS, state.settings.order.home, key => key);
  root.innerHTML = `<header class="head"><h1>${greeting()}${state.settings.name ? `, ${esc(state.settings.name)}` : ''}</h1><p class="muted">${fmtDay(today(), true)}</p></header>
    <div data-drag-list="home">${order.map(key => `<section class="card" data-drag="${key}">${GRIP}${cards[key]()}</section>`).join('')}</div>
    <div class="tiles">${TILES.map(([id, title, hint]) => `<button class="tile" data-open="${id}"><b>${title}</b><span class="muted small">${hint}</span></button>`).join('')}</div>`;
  tick();
}

export function tick() {
  const clock = root.querySelector('#home-clock');
  if (clock && state.active) setText(clock, fmtClock(elapsedSec(state.active)));
  const fast = root.querySelector('#home-fast'), running = runningFast();
  if (fast && running) setText(fast, fmtHM(secondsBetween(running.start, new Date().toISOString())));
}

function onClick(e) {
  const face = e.target.closest('[data-face]');
  if (face) {
    const value = toggleValue(state.days[today()]?.nutrition ?? null, face.dataset.face);
    setNutrition(today(), value);
    face.closest('[data-faces]').innerHTML = facesHtml(value, NUTRITION);
    return;
  }
  const tile = e.target.closest('[data-open]')?.dataset.open;
  if (tile) return go(tile, tile === 'daily' ? { date: today() } : {});
  const btn = e.target.closest('[data-act]');
  switch (btn?.dataset.act) {
    case 'resume': return go('session', { openId: state.active.sessionId });
    case 'start': return go('session', { openId: startSession({ workoutId: btn.dataset.id || null }).id });
    case 'fast':
      toggleFast();
      return render();
    case 'fast-times': return editFastTimes(state.fasts.find(f => f.id === btn.dataset.id), render);
    case 'sleep-times': return editSleepTimes(state.sleep.find(x => x.id === btn.dataset.id) ?? null, render);
    case 'sleep':
      toggleSleep();
      return render();
  }
}

export function init(el) {
  root = el;
  root.addEventListener('click', onClick);
  root.addEventListener('change', e => {
    if (!e.target.matches('[data-next]')) return;
    if (e.target.value === 'build') return go('workouts', { build: true });
    state.settings.next = e.target.value ? adoptWorkout(e.target.value) : null;
    save();
    render();
  });
  // 'toggle' does not bubble, so listen in the capture phase.
  root.addEventListener('toggle', e => {
    if (!e.target.matches?.('[data-today]')) return;
    state.settings.todayOpen = e.target.open;
    save();
  }, true);
  enableDrag(root, (list, ids) => {
    state.settings.order.home = ids;
    save();
  });
}

export function show() {
  render();
}
