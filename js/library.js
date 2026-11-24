// Built-in exercise library: free weights, cables and the machines in the gym, by body section.
// Each line is [name, equipment, muscles worked]. An exercise's id comes from its name, and
// sessions refer to that id, so never rename a library exercise once it has shipped.

import { state, save } from './store.js';

const SECTIONS = {
  Chest: [
    ['Barbell bench press', 'Barbell', 'Chest (pectorals), front delts, triceps'],
    ['Incline barbell bench press', 'Barbell', 'Upper chest, front delts, triceps'],
    ['Decline barbell bench press', 'Barbell', 'Lower chest, triceps, front delts'],
    ['Dumbbell bench press', 'Dumbbell', 'Chest, front delts, triceps'],
    ['Incline dumbbell press', 'Dumbbell', 'Upper chest, front delts, triceps'],
    ['Decline dumbbell press', 'Dumbbell', 'Lower chest, triceps'],
    ['Dumbbell fly', 'Dumbbell', 'Chest, front delts'],
    ['Incline dumbbell fly', 'Dumbbell', 'Upper chest, front delts'],
    ['Dumbbell squeeze press', 'Dumbbell', 'Inner chest, triceps'],
    ['Dumbbell pullover', 'Dumbbell', 'Chest, lats, triceps (long head)'],
    ['Kettlebell floor press', 'Kettlebell', 'Chest, triceps, front delts'],
    ['Cable crossover (high to low)', 'Cable', 'Lower chest, front delts'],
    ['Cable fly (mid height)', 'Cable', 'Chest, front delts'],
    ['Low to high cable fly', 'Cable', 'Upper chest, front delts'],
    ['Single-arm cable chest press', 'Cable', 'Chest, front delts, triceps, core'],
    ['Pec fly machine', 'Machine', 'Chest, front delts'],
  ],
  Back: [
    ['Barbell deadlift', 'Barbell', 'Lower back (erectors), glutes, hamstrings, traps, lats, grip'],
    ['Bent-over barbell row', 'Barbell', 'Lats, mid back (rhomboids, traps), rear delts, biceps'],
    ['Pendlay row', 'Barbell', 'Lats, mid back, rear delts, lower back'],
    ['T-bar row (landmine)', 'Barbell', 'Mid back, lats, rear delts, biceps'],
    ['Rack pull', 'Barbell', 'Upper back, traps, lower back, glutes'],
    ['Barbell shrug', 'Barbell', 'Upper traps'],
    ['Single-arm dumbbell row', 'Dumbbell', 'Lats, mid back, rear delts, biceps'],
    ['Chest-supported dumbbell row', 'Dumbbell', 'Mid back, lats, rear delts'],
    ['Dumbbell shrug', 'Dumbbell', 'Upper traps'],
    ['Single-arm kettlebell row', 'Kettlebell', 'Lats, mid back, biceps'],
    ['Kettlebell high pull', 'Kettlebell', 'Upper traps, rear delts, glutes, hamstrings'],
    ['Lat pulldown', 'Cable', 'Lats, biceps, rear delts, lower traps'],
    ['Close-grip lat pulldown', 'Cable', 'Lats, mid back, biceps'],
    ['Seated cable row', 'Cable', 'Mid back (rhomboids, traps), lats, rear delts, biceps'],
    ['Single-arm cable row', 'Cable', 'Lats, mid back, biceps'],
    ['Straight-arm cable pulldown', 'Cable', 'Lats, triceps (long head), core'],
    ['Cable shrug', 'Cable', 'Upper traps'],
    ['Seated row machine', 'Machine', 'Mid back, lats, rear delts, biceps'],
  ],
  Shoulders: [
    ['Barbell overhead press', 'Barbell', 'Front and side delts, triceps, upper traps, core'],
    ['Push press', 'Barbell', 'Front and side delts, triceps, quads, glutes'],
    ['Barbell upright row', 'Barbell', 'Side delts, upper traps'],
    ['Seated dumbbell shoulder press', 'Dumbbell', 'Front and side delts, triceps'],
    ['Arnold press', 'Dumbbell', 'Front and side delts, triceps'],
    ['Dumbbell lateral raise', 'Dumbbell', 'Side delts'],
    ['Dumbbell front raise', 'Dumbbell', 'Front delts'],
    ['Bent-over dumbbell reverse fly', 'Dumbbell', 'Rear delts, rhomboids, mid traps'],
    ['Kettlebell overhead press', 'Kettlebell', 'Front and side delts, triceps, core'],
    ['Kettlebell halo', 'Kettlebell', 'Delts, upper back, core'],
    ['Turkish get-up', 'Kettlebell', 'Shoulders, core, glutes'],
    ['Cable lateral raise', 'Cable', 'Side delts'],
    ['Cable front raise', 'Cable', 'Front delts'],
    ['Face pull', 'Cable', 'Rear delts, rotator cuff, mid traps'],
    ['Cable reverse fly', 'Cable', 'Rear delts, upper back'],
    ['Cable upright row', 'Cable', 'Side delts, upper traps'],
    ['Reverse fly machine (rear delts)', 'Machine', 'Rear delts, rhomboids, mid traps'],
  ],
  Biceps: [
    ['Barbell curl', 'Barbell', 'Biceps, brachialis, forearms'],
    ['EZ-bar curl', 'Barbell', 'Biceps, brachialis'],
    ['EZ-bar preacher curl', 'Preacher bench', 'Biceps (short head), brachialis'],
    ['Reverse-grip barbell curl', 'Barbell', 'Brachioradialis, forearms, biceps'],
    ['Dumbbell curl', 'Dumbbell', 'Biceps, forearms'],
    ['Hammer curl', 'Dumbbell', 'Brachialis, brachioradialis, biceps'],
    ['Incline dumbbell curl', 'Dumbbell', 'Biceps (long head)'],
    ['Concentration curl', 'Dumbbell', 'Biceps (short head)'],
    ['Dumbbell preacher curl', 'Preacher bench', 'Biceps (short head), brachialis'],
    ['Kettlebell curl', 'Kettlebell', 'Biceps, forearms'],
    ['Cable curl', 'Cable', 'Biceps'],
    ['Rope hammer curl', 'Cable', 'Brachialis, brachioradialis'],
    ['Bayesian cable curl', 'Cable', 'Biceps (long head)'],
    ['High cable curl', 'Cable', 'Biceps (short head)'],
  ],
  Triceps: [
    ['Close-grip bench press', 'Barbell', 'Triceps, chest, front delts'],
    ['EZ-bar skull crusher', 'Barbell', 'Triceps (long head)'],
    ['Overhead dumbbell triceps extension', 'Dumbbell', 'Triceps (long head)'],
    ['Dumbbell skull crusher', 'Dumbbell', 'Triceps'],
    ['Dumbbell kickback', 'Dumbbell', 'Triceps (lateral head)'],
    ['Kettlebell overhead triceps extension', 'Kettlebell', 'Triceps (long head)'],
    ['Rope triceps pushdown', 'Cable', 'Triceps (lateral and medial heads)'],
    ['Straight-bar triceps pushdown', 'Cable', 'Triceps'],
    ['Overhead cable triceps extension', 'Cable', 'Triceps (long head)'],
    ['Single-arm reverse-grip pushdown', 'Cable', 'Triceps (medial head)'],
  ],
  Legs: [
    ['Barbell back squat', 'Barbell', 'Quads, glutes, adductors, lower back'],
    ['Barbell front squat', 'Barbell', 'Quads, glutes, upper back, core'],
    ['Romanian deadlift', 'Barbell', 'Hamstrings, glutes, lower back'],
    ['Sumo deadlift', 'Barbell', 'Glutes, adductors, quads, hamstrings'],
    ['Barbell hip thrust', 'Barbell', 'Glutes, hamstrings'],
    ['Barbell lunge', 'Barbell', 'Quads, glutes'],
    ['Goblet squat', 'Dumbbell', 'Quads, glutes, core'],
    ['Bulgarian split squat', 'Dumbbell', 'Quads, glutes'],
    ['Dumbbell walking lunge', 'Dumbbell', 'Quads, glutes, hamstrings'],
    ['Dumbbell Romanian deadlift', 'Dumbbell', 'Hamstrings, glutes'],
    ['Dumbbell step-up', 'Dumbbell', 'Quads, glutes'],
    ['Dumbbell calf raise', 'Dumbbell', 'Calves'],
    ['Kettlebell swing', 'Kettlebell', 'Glutes, hamstrings, lower back, core'],
    ['Kettlebell goblet squat', 'Kettlebell', 'Quads, glutes, core'],
    ['Kettlebell deadlift', 'Kettlebell', 'Glutes, hamstrings, lower back'],
    ['Single-leg kettlebell deadlift', 'Kettlebell', 'Hamstrings, glutes, balance'],
    ['Cable pull-through', 'Cable', 'Glutes, hamstrings'],
    ['Cable glute kickback', 'Cable', 'Glutes'],
    ['Cable hip abduction', 'Cable', 'Glute medius (outer hip)'],
    ['Leg press', 'Machine', 'Quads, glutes, adductors'],
    ['Hack squat', 'Machine', 'Quads, glutes'],
    ['Leg curl machine', 'Machine', 'Hamstrings'],
    ['Leg extension', 'Machine', 'Quads'],
    ['Calf raise machine', 'Machine', 'Calves (gastrocnemius, soleus)'],
  ],
};

const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const LIBRARY = Object.entries(SECTIONS).flatMap(([section, items]) => items.map(([name, equipment, muscles]) => ({
  id: `lib-${slug(name)}`, name, type: 'strength', section, equipment, muscles, defaultSets: 4, archived: false, library: true,
})));
const BY_ID = new Map(LIBRARY.map(x => [x.id, x]));

// "Barbell · Chest, front delts, triceps" for library exercises; '' for the user's own.
export function detailOf(id) {
  const x = BY_ID.get(id);
  return x ? `${x.equipment} · ${x.muscles}` : '';
}

export const libraryEntry = id => BY_ID.get(id);

// A library exercise joins the user's own list the first time it is used or edited,
// keeping its library id. Picking one the user deleted after using brings it back.
export function adopt(id) {
  const own = state.exercises.find(x => x.id === id);
  if (own) {
    own.archived = false;
    return own;
  }
  const { name, section, defaultSets } = BY_ID.get(id);
  const exercise = { id, name, type: 'strength', section, defaultSets, archived: false };
  state.exercises.push(exercise);
  save();
  return exercise;
}
