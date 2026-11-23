// Workouts screen: workout templates, with an Exercises sub-tab for the library.

import { state, save, uid } from './store.js';
import { esc, sectionsHtml, openSheet, ask, tip, go } from './ui.js';
import { groupBySection, sectionNames, matchSection } from './stats.js';
import { startSession } from './session.js';

let root;
let tab = 'workouts';
let draft = null;   // copy of the workout being created or edited; saved on Save only

const live = list => list.filter(x => !x.archived);
const isUsed = (kind, id) => state.sessions.some(s =>
  (kind === 'workout' ? s.workoutId === id : s.entries.some(e => e.exerciseId === id)));

function workoutsHtml(names) {
  const card = w => `<div class="card" data-id="${w.id}">
    <div class="row"><h3 class="grow">${esc(w.name)}</h3><button class="primary" data-act="start">Start</button></div>
    <p class="muted small">${w.exerciseIds.map(id => esc(names.get(id))).join(', ') || 'No exercises yet'}</p>
    <div class="row"><button class="ghost" data-act="edit">Edit</button><button class="ghost danger" data-act="delete">Delete</button></div>
  </div>`;
  const workouts = live(state.workouts);
  return `${workouts.map(card).join('') || '<p class="muted card">No workouts yet. Add your exercises first, then build a workout like "Leg Day".</p>'}
    <button class="wide" data-act="new">+ New workout</button>`;
}

function draftHtml(names) {
  const last = draft.exerciseIds.length - 1;
  const chosen = draft.exerciseIds.map((id, i) => `<li data-id="${id}"><span class="grow">${esc(names.get(id))}</span>
    <button class="ghost" data-act="up" aria-label="Move up"${i ? '' : ' disabled'}>▲</button>
    <button class="ghost" data-act="down" aria-label="Move down"${i < last ? '' : ' disabled'}>▼</button>
    <button class="ghost" data-act="remove" aria-label="Remove">✕</button></li>`).join('');
  const options = live(state.exercises).filter(x => !draft.exerciseIds.includes(x.id));
  return `<h1 class="head">${draft.id ? 'Edit' : 'New'} workout</h1>
    <input class="wide" data-field="name" value="${esc(draft.name)}" maxlength="40" placeholder="Name, e.g. Leg Day" aria-label="Workout name">
    <ol class="list">${chosen}</ol>
    <div class="card"><h3>Add from library</h3>
      ${options.length
        ? sectionsHtml(groupBySection(options), items => `<div class="stack">${items.map(x => `<button data-act="add" data-id="${x.id}">+ ${esc(x.name)}</button>`).join('')}</div>`)
        : '<p class="muted small">Nothing left to add. Create more in the Exercises tab.</p>'}
    </div>
    <div class="row end"><button class="ghost" data-act="cancel">Cancel</button><button class="primary" data-act="save">Save</button></div>`;
}

function exercisesHtml() {
  const row = x => `<li data-id="${x.id}" data-name="${esc(x.name)}"><span class="grow">${esc(x.name)}
      <span class="muted small">${x.type === 'strength' ? `${x.defaultSets} sets` : 'cardio'}</span></span>
    <button class="ghost" data-act="edit-ex">Edit</button>
    <button class="ghost" data-act="delete-ex" aria-label="Delete ${esc(x.name)}">✕</button></li>`;
  const exercises = live(state.exercises);
  return `${exercises.length
      ? sectionsHtml(groupBySection(exercises), items => `<ul class="list">${items.map(row).join('')}</ul>`)
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
    if (ex) Object.assign(ex, { name, section, defaultSets });
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
  if (existing) Object.assign(existing, { name, exerciseIds: draft.exerciseIds });
  else state.workouts.push({ id: uid(), name, exerciseIds: draft.exerciseIds, archived: false });
  draft = null;
  save();
  render();
}

function moveDraftItem(id, step) {
  const ids = draft.exerciseIds, i = ids.indexOf(id);
  [ids[i], ids[i + step]] = [ids[i + step], ids[i]];
}

async function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.dataset.id ?? btn.closest('[data-id]')?.dataset.id;
  switch (btn.dataset.act) {
    case 'tab': tab = btn.dataset.tab; break;
    case 'start':
      if (state.active && !(await ask('Finish the session in progress and start this one?', 'Start'))) return;
      return go('session', { openId: startSession(id).id });
    case 'new': draft = { id: null, name: '', exerciseIds: [] }; break;
    case 'edit': {
      const w = state.workouts.find(x => x.id === id);
      draft = { id, name: w.name, exerciseIds: [...w.exerciseIds] };
      break;
    }
    case 'delete': return removeItem('workout', id);
    case 'add': draft.exerciseIds.push(id); break;
    case 'remove': draft.exerciseIds = draft.exerciseIds.filter(x => x !== id); break;
    case 'up': moveDraftItem(id, -1); break;
    case 'down': moveDraftItem(id, 1); break;
    case 'cancel': draft = null; break;
    case 'save': return saveDraft();
    case 'new-ex': return editExercise();
    case 'edit-ex': return editExercise(state.exercises.find(x => x.id === id));
    case 'delete-ex': return removeItem('exercise', id);
  }
  render();
}

export function init(el) {
  root = el;
  root.addEventListener('click', onClick);
  root.addEventListener('input', e => {
    if (e.target.dataset.field === 'name') draft.name = e.target.value;
  });
}

export function show() {
  render();
}
