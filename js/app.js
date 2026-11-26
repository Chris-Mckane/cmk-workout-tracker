// App shell: boot, bottom nav, the display ticker, and app-wide tap behaviour.

import { state, load, save, flush } from './store.js';
import { haptic, tip, isIOS, filterSections, rememberSection, applyTheme, onPhoneTheme } from './ui.js';
import { today } from './time.js';
import { tidyExercises } from './stats.js';
import { LIBRARY } from './library.js';
import { checkRest, unlockAudio, syncWakeLock } from './timers.js';
import * as home from './home.js';
import * as session from './session.js';
import * as workouts from './workouts.js';
import * as daily from './daily.js';
import * as summary from './summary.js';

const screens = { home, session, workouts, daily, summary };
const tabs = [...document.querySelectorAll('nav button')];
let current;
let day = today();

function show(tab, detail) {
  current = tab;
  for (const name of Object.keys(screens)) document.getElementById(name).hidden = name !== tab;
  for (const btn of tabs) {
    const on = btn.dataset.tab === (tab === 'workouts' || tab === 'daily' ? 'home' : tab);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-current', on ? 'page' : 'false');
  }
  screens[tab].show(detail);
  window.scrollTo(0, 0);
}

// Only refreshes what is on screen; elapsed times always come from stored timestamps.
// Re-shows the screen when the local date changes (the app was left open past midnight,
// or reopened on a later day), so every screen moves to the new today.
function checkDay() {
  if (day === today()) return;
  day = today();
  daily.newDay();
  summary.newDay();
  show(current);
}

function tick() {
  checkDay();
  checkRest();
  screens[current].tick?.();
}

function showIosCard() {
  if (!isIOS || state.settings.iosCardSeen) return;
  const el = document.getElementById('notice');
  el.innerHTML = `<div class="card notice"><p>On iPhone, your data lives only in this app. Export a backup regularly so you don't lose it.</p>
    <div class="row end"><button>Got it</button></div></div>`;
  el.addEventListener('click', e => {
    if (!e.target.closest('button')) return;
    state.settings.iosCardSeen = true;
    save();
    el.innerHTML = '';
  });
}

document.addEventListener('click', e => {
  unlockAudio();
  const star = e.target.closest('.star[data-tip]');
  if (star) tip(star.dataset.tip);
  // Set circles do their own haptics (tap vs long press).
  const btn = e.target.closest('button, summary, input[type="checkbox"]');
  if (btn && !btn.classList.contains('circle')) haptic(btn.dataset.haptic);
});
document.addEventListener('input', e => {
  if (e.target.matches('[data-search]')) filterSections(e.target);
});
// 'toggle' does not bubble, so listen in the capture phase.
document.addEventListener('toggle', e => {
  if (e.target.matches?.('.sec-group')) rememberSection(e.target);
}, true);
document.querySelector('nav').addEventListener('click', e => {
  const tab = e.target.closest('button')?.dataset.tab;
  if (tab) show(tab);
});
document.querySelector('[data-settings]').addEventListener('click', summary.openSettings);
document.addEventListener('go', e => show(e.detail.tab, e.detail));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
  else tick();
  syncWakeLock();
});
window.addEventListener('pagehide', flush);

load();
tidyExercises(state, LIBRARY);
save();
applyTheme(state.settings.theme);
onPhoneTheme(() => applyTheme(state.settings.theme));
for (const [name, screen] of Object.entries(screens)) screen.init(document.getElementById(name));
show(state.active ? 'session' : 'home');
showIosCard();
syncWakeLock();
setInterval(tick, 500);

navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
