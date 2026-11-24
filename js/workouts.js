// Workouts screen: workout templates, with an Exercises sub-tab for the library.

import { state, save, uid } from './store.js';
import { esc, sectionsHtml, enableDrag, GRIP, openSheet, ask, tip, go } from './ui.js';
import { groupBySection, sectionNames, matchSection, catalogue, applyOrder } from './stats.js';
import { LIBRARY, adopt, detailOf, libraryEntry } from './library.js';
import { startSession } from './session.js';

let root;
let tab = 'workouts';
let draft = null;   // copy of the workout being created or edited; saved on Save only

const live = list => list.filter(x => !x.archived);
const isUsed = (kind, id) => state.sessions.some(s =>
  (kind === 'workout' ? s.workoutId === id : s.entries.some(e => e.exerciseId === id)));

function workoutsHtml(names) {
  const card = w => `<div class="card" data-id="${w.id}" data-drag="${w.id}">${GRIP}
    <div class="row"><h3 class="grow">${esc(w.name)}</h3><button class="primary" data-act="start">Start</button></div>
    <p class="muted small">${w.exerciseIds.map(id => esc(names.get(id))).join(', ') || 'No exercises yet'}</p>
    <div class="row"><button class="ghost" data-act="edit">Edit</button><button class="ghost danger" data-act="delete">Delete</button></div>
  </div>`;
  const workouts = live(state.workouts);
  return `<div data-drag-list="workouts">${workouts.map(card).join('')}</div>
    ${workouts.length ? '' : '<p class="muted card">No workouts yet. Build one here, or start a blank session and use Save as workout.</p>'}
    <button class="wide" data-act="new">+ New workout</button>`;
}

function draftHtml(names) {
  const chosen = draft.exerciseIds.map(id => `<li data-id="${id}" data-drag="${id}">${GRIP}<span class="grow">${esc(names.get(id))}</span>
    <button class="ghost" data-act="remove" aria-label="Remove">✕</button></li>`).join('');
  const options = catalogue(state.exercises, LIBRARY).filter(x => !draft.exerciseIds.includes(x.id));
  return `<h1 class="head">${draft.plan ? 'Build your next workout' : `${draft.id ? 'Edit' : 'New'} workout`}</h1>
    <input class="wide" data-field="name" value="${esc(draft.name)}" maxlength="40" placeholder="Name, e.g. Leg Day" aria-label="Workout name">
    <ol class="list" data-drag-list="draft">${chosen}</ol>
    <div class="card"><h3>Add from library</h3>
      ${options.length
        ? sectionsHtml(groupBySection(options, state.settings.order), items => `<div class="stack">${items.map(x => `<button class="pick" data-act="add" data-id="${x.id}" data-name="${esc(searchText(x))}">+ ${esc(x.name)}${detailHtml(x)}</button>`).join('')}</div>`)
        : '<p class="muted small">Nothing left to add. Create more in the Exercises tab.</p>'}
    </div>
    <div class="row end"><button class="ghost" data-act="cancel">Cancel</button><button class="primary" data-act="save">Save</button></div>`;
}

// Search matches the name, the equipment and the muscles worked.
const searchText = x => `${x.name} ${detailOf(x.id)}`;
const detailHtml = x => (detailOf(x.id) ? `<span class="muted small detail">${esc(detailOf(x.id))}</span>` : '');

// Library exercises can be edited (that takes them into the user's list) but not deleted.
function exercisesHtml() {
  const row = x => `<li data-id="${x.id}" data-drag="${x.id}" data-name="${esc(searchText(x))}">${GRIP}<span class="grow">${esc(x.name)}
      <span class="muted small">${x.type === 'strength' ? `${x.defaultSets} sets` : 'cardio'}</span>${detailHtml(x)}</span>
    <button class="ghost" data-act="edit-ex">Edit</button>
    ${x.library ? '' : `<button class="ghost" data-act="delete-ex" aria-label="Delete ${esc(x.name)}">✕</button>`}</li>`;
  const exercises = catalogue(state.exercises, LIBRARY);
  return `${exercises.length
      ? sectionsHtml(groupBySection(exercises, state.settings.order), items => `<ul class="list" data-drag-list="section">${items.map(row).join('')}</ul>`, { drag: true })
      : '<p class="muted card">No exercises yet. Add one and give it a section, like Chest or Legs.</p>'}
    <button class="wide sep" data-act="new-ex">+ New exercise</button>`;
}

function render() {
  const names = new Map(state.exercises.map(x => [x.id, x.name]));
  const tabBtn = (id, label) => `<button role="tab" data-act="tab" data-tab="${id}" aria-selected="${tab === id}"${tab === id ? ' class="on"' : ''}>${label}</button>`;
  root.innerHTML = draft ? draftHtml(names) : `
    <div class="seg" role="tablist">${tabBtn('workouts', 'Workouts')}${tabBtn('exercises', 'Exercises')}</div>
    ${tab === 'workouts' ? workoutsHtml(names) : exercisesHtml()}`;
}

// Exercise type is fixed once created: strength and cardio entries have different shapes.
function editExercise(ex) {
  const type = ex?.type ?? 'strength';
  const sheet = openSheet(`<h2>${ex ? 'Edit' : 'New'} exercise</h2>
    <label>Name <input name="name" value="${esc(ex?.name ?? '')}" maxlength="40"></label>
    <label data-section${type === 'cardio' ? ' hidden' : ''}>Section <input name="section" list="section-names" value="${esc(ex?.section ?? '')}" maxlength="30" placeholder="e.g. Chest"></label>
    <datalist id="section-names">${sectionNames(state.exercises).map(s => `<option value="${esc(s)}">`).join('')}</datalist>
    <label>Type <select name="type"${ex ? ' disabled' : ''}>
      <option value="strength">Strength</option><option value="cardio"${type === 'cardio' ? ' selected' : ''}>Cardio</option></select></label>
    <label data-sets${type === 'cardio' ? ' hidden' : ''}>Default sets <input class="num" name="sets" type="number" inputmode="numeric" min="1" max="6" value="${ex?.defaultSets ?? 4}"></label>
    <div class="row end"><button class="ghost" data-close>Cancel</button><button class="primary" data-save>Save</button></div>`);
  const field = name => sheet.querySelector(`[name="${name}"]`);
  field('type').addEventListener('change', () => {
    const cardio = field('type').value === 'cardio';
    sheet.querySelector('[data-sets]').hidden = cardio;
    sheet.querySelector('[data-section]').hidden = cardio;
  });
  sheet.addEventListener('click', e => {
    if (!e.target.closest('[data-save]')) return;
    const name = field('name').value.trim();
    if (!name) return field('name').focus();
    const defaultSets = Math.min(6, Math.max(1, Math.round(field('sets').value) || 4));
    const section = field('type').value === 'cardio' ? '' : matchSection(field('section').value, state.exercises);
    if (ex) Object.assign(ex.library ? adopt(ex.id) : ex, { name, section, defaultSets });
    else state.exercises.push({ id: uid(), name, type: field('type').value, section, defaultSets, archived: false });
    save();
    sheet.close();
    render();
  });
}

// Anything already used in a session is archived (kept for history), otherwise removed.
async function removeItem(kind, id) {
  const list = kind === 'workout' ? state.workouts : state.exercises;
  const item = list.find(x => x.id === id);
  if (!(await ask(`Delete "${item.name}"?`, 'Delete'))) return;
  if (isUsed(kind, id)) item.archived = true;
  else list.splice(list.indexOf(item), 1);
  if (kind === 'exercise') {
    for (const w of state.workouts) w.exerciseIds = w.exerciseIds.filter(x => x !== id);
  }
  save();
  render();
}

function saveDraft() {
  const name = draft.name.trim();
  if (!name) return tip('Give the workout a name');
  const existing = state.workouts.find(w => w.id === draft.id);
  const workout = existing ?? { id: uid(), name, exerciseIds: [], archived: false };
  Object.assign(workout, { name, exerciseIds: draft.exerciseIds });
  if (!existing) state.workouts.push(workout);
  // A workout built as the next plan becomes the plan, and Home shows it.
  const planned = draft.plan;
  if (planned) state.settings.next = workout.id;
  draft = null;
  save();
  if (!planned) return render();
  tip(`Next workout: ${name}`);
  go('home');
}

async function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.dataset.id ?? btn.closest('[data-id]')?.dataset.id;
  switch (btn.dataset.act) {
    case 'tab': tab = btn.dataset.tab; break;
    case 'start':
      if (state.active && !(await ask('Finish the session in progress and start this one?', 'Start'))) return;
      return go('session', { openId: startSession({ workoutId: id }).id });
    case 'new': draft = { id: null, name: '', exerciseIds: [] }; break;
    case 'edit': {
      const w = state.workouts.find(x => x.id === id);
      draft = { id, name: w.name, exerciseIds: [...w.exerciseIds] };
      break;
    }
    case 'delete': return removeItem('workout', id);
    case 'add': draft.exerciseIds.push(adopt(id).id); break;
    case 'remove': draft.exerciseIds = draft.exerciseIds.filter(x => x !== id); break;
    case 'cancel': draft = null; break;
    case 'save': return saveDraft();
    case 'new-ex': return editExercise();
    case 'edit-ex': return editExercise(state.exercises.find(x => x.id === id && !x.archived) ?? libraryEntry(id));
    case 'delete-ex': return removeItem('exercise', id);
  }
  render();
}

// Saves the order after a drag. The screen already shows it, so nothing re-renders.
function onDrop(list, ids) {
  const order = state.settings.order;
  switch (list.dataset.dragList) {
    case 'workouts': state.workouts = applyOrder(state.workouts, ids); break;
    case 'sections': order.sections = ids; break;
    case 'section': order.exercises = [...order.exercises.filter(id => !ids.includes(id)), ...ids]; break;
    case 'draft': draft.exerciseIds = ids; return;
  }
  save();
}

export function init(el) {
  root = el;
  root.addEventListener('click', onClick);
  enableDrag(root, onDrop);
  root.addEventListener('input', e => {
    if (e.target.dataset.field === 'name') draft.name = e.target.value;
  });
}

export function show(detail = {}) {
  if (detail.build) {
    tab = 'workouts';
    draft = { id: null, name: '', exerciseIds: [], plan: true };
  }
  render();
}
