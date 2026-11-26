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
    ['Zotman curl', 'Dumbbell', 'Biceps, brachioradialis, forearms'],
    ['EZ-bar preacher curl 21s', 'Preacher bench', 'Biceps (short head), brachialis'],
    ['Barbell curl 21s', 'Barbell', 'Biceps, brachialis, forearms'],
    ['Spider curl', 'Dumbbell', 'Biceps (short head)'],
    ['Cable preacher curl', 'Cable', 'Biceps (short head), brachialis'],
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
    ['Hip abduction machine', 'Machine', 'Glute medius (outer hip)'],
    ['Hip adduction machine', 'Machine', 'Adductors (inner thigh)'],
    ['Glute bridge', 'Barbell', 'Glutes, hamstrings'],
  ],
  Core: [
    ['Cable crunch', 'Cable', 'Abs'],
    ['Ab crunch machine', 'Machine', 'Abs'],
    ['Hanging leg raise', 'Bodyweight', 'Abs, hip flexors'],
    ['Lying leg raise', 'Bodyweight', 'Abs, hip flexors'],
    ['Ab wheel rollout', 'Bodyweight', 'Abs, lats'],
    ['Decline sit-up', 'Bodyweight', 'Abs, hip flexors'],
    ['Russian twist', 'Bodyweight', 'Obliques, abs'],
    ['Pallof press', 'Cable', 'Obliques, abs'],
  ],
};

// Cardio: [name, equipment]. Logged as minutes and optional km.
const CARDIO = [
  ['Treadmill', 'Machine'], ['Exercise bike', 'Machine'], ['Cross trainer', 'Machine'], ['Rowing machine', 'Machine'],
  ['Stair climber', 'Machine'], ['Walk', 'Outdoors'], ['Run', 'Outdoors'], ['Cycle', 'Outdoors'], ['Swim', 'Pool'],
];

const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Muscle map areas for the words used in the muscles text above.
const AREAS = [
  [/chest|pectoral/, ['chest']], [/front and side delts|front delts|side delts|shoulders/, ['front-deltoids']],
  [/rear delts|rotator cuff/, ['back-deltoids']], [/^delts/, ['front-deltoids', 'back-deltoids']],
  [/tricep/, ['triceps']], [/bicep|brachialis/, ['biceps']], [/brachioradialis|forearm|grip/, ['forearm']],
  [/lats|mid back|rhomboid|upper back/, ['upper-back']], [/traps/, ['trapezius']], [/lower back|erector/, ['lower-back']],
  [/core/, ['abs', 'obliques']], [/^abs/, ['abs']], [/oblique/, ['obliques']], [/quads/, ['quadriceps']], [/glute|outer hip/, ['gluteal']],
  [/hamstring/, ['hamstring']], [/adductor/, ['abductors', 'abductor']], [/calves|soleus/, ['calves', 'left-soleus', 'right-soleus']],
];
const areasOf = words => [...new Set(words.flatMap(w => AREAS.find(([re]) => re.test(w.toLowerCase()))?.[1] ?? []))];

// Exercises led by more than one muscle; all others are led by the first muscle listed.
const MAIN = {
  'Barbell deadlift': 2, 'Romanian deadlift': 2, 'Sumo deadlift': 2, 'Dumbbell Romanian deadlift': 2, 'Kettlebell deadlift': 2,
  'Single-leg kettlebell deadlift': 2, 'Barbell hip thrust': 1, 'Barbell back squat': 2, 'Barbell front squat': 1, 'Barbell lunge': 2,
  'Goblet squat': 2, 'Bulgarian split squat': 2, 'Dumbbell walking lunge': 2, 'Dumbbell step-up': 2, 'Kettlebell swing': 2,
  'Kettlebell goblet squat': 2, 'Cable pull-through': 2, 'Leg press': 2, 'Hack squat': 2,
};

function musclesFrom(name, text) {
  const words = text.replace(/\([^)]*\)/g, '').split(',').map(w => w.trim()).filter(Boolean);
  const lead = MAIN[name] ?? 1;
  const primary = areasOf(words.slice(0, lead));
  return { primary, secondary: areasOf(words.slice(lead)).filter(m => !primary.includes(m)) };
}

export const LIBRARY = Object.entries(SECTIONS).flatMap(([section, items]) => items.map(([name, equipment, muscles]) => ({
  id: `lib-${slug(name)}`, name, type: 'strength', section, equipment, muscles, ...musclesFrom(name, muscles),
  defaultSets: 4, archived: false, library: true,
}))).concat(CARDIO.map(([name, equipment]) => ({
  id: `lib-${slug(name)}`, name, type: 'cardio', section: '', equipment, muscles: 'Heart and lungs', primary: [], secondary: [],
  archived: false, library: true,
})));
const BY_ID = new Map(LIBRARY.map(x => [x.id, x]));

// "Barbell · Chest, front delts, triceps" for library exercises; '' for the user's own.
export function detailOf(id) {
  const x = BY_ID.get(id);
  return x ? `${x.equipment} · ${x.muscles}` : '';
}

export const libraryEntry = id => BY_ID.get(id);

// Your own exercises have no muscle list, so their folder stands in for the main muscle.
const SECTION_AREAS = {
  Chest: ['chest'], Back: ['upper-back'], Shoulders: ['front-deltoids', 'back-deltoids'], Biceps: ['biceps'],
  Triceps: ['triceps'], Legs: ['quadriceps', 'gluteal'], Core: ['abs', 'obliques'],
};
export function musclesOf(exercise) {
  const lib = BY_ID.get(exercise.id);
  if (lib) return { primary: lib.primary, secondary: lib.secondary };
  return { primary: SECTION_AREAS[exercise.section] ?? [], secondary: [] };
}

// A library exercise joins the user's own list the first time it is used or edited,
// keeping its library id. Picking one the user deleted after using brings it back.
export function adopt(id) {
  const own = state.exercises.find(x => x.id === id);
  if (own) {
    own.archived = false;
    return own;
  }
  const { name, type, section, defaultSets } = BY_ID.get(id);
  const exercise = { id, name, type, section, defaultSets, archived: false };
  state.exercises.push(exercise);
  save();
  return exercise;
}

// Ready-made workouts built from the library. Like library exercises, one becomes the
// user's own (same id) the first time it is started, planned or edited.
const READY_MADE = [
  ['Push', 'Chest, shoulders, triceps', ['Barbell bench press', 'Incline dumbbell press', 'Seated dumbbell shoulder press', 'Dumbbell lateral raise', 'Pec fly machine', 'Rope triceps pushdown']],
  ['Pull', 'Back, rear delts, biceps', ['Lat pulldown', 'Seated row machine', 'Single-arm dumbbell row', 'Face pull', 'Barbell curl', 'Hammer curl']],
  ['Legs', 'Quads, hamstrings, glutes, calves', ['Barbell back squat', 'Leg press', 'Romanian deadlift', 'Leg curl machine', 'Leg extension', 'Calf raise machine']],
  ['Upper body', 'Chest, back, shoulders, arms', ['Barbell bench press', 'Bent-over barbell row', 'Seated dumbbell shoulder press', 'Lat pulldown', 'EZ-bar curl', 'Overhead cable triceps extension']],
  ['Lower body', 'Quads, glutes, hamstrings, calves', ['Hack squat', 'Bulgarian split squat', 'Barbell hip thrust', 'Leg curl machine', 'Calf raise machine']],
  ['Full body', 'Dumbbells and kettlebells', ['Goblet squat', 'Dumbbell bench press', 'Single-arm dumbbell row', 'Kettlebell swing', 'Seated dumbbell shoulder press']],
];
const idOf = name => `lib-${slug(name)}`;

export const READY_WORKOUTS = READY_MADE.map(([name, focus, exercises]) => ({
  id: `ready-${slug(name)}`, name, focus, exerciseIds: exercises.map(idOf), archived: false, ready: true,
}));

// Saved workouts first, then ready-made ones not yet taken into the user's list.
export function workoutChoices() {
  const own = state.workouts.filter(w => !w.archived && (!w.programId || w.programId === state.settings.program));
  const taken = new Set(state.workouts.map(w => w.id));
  return [...own, ...READY_WORKOUTS.filter(w => !taken.has(w.id))];
}

// Takes a ready-made workout (and its exercises) into the user's own lists. Your own
// workouts pass straight through. Returns the workout's id.
export function adoptWorkout(id) {
  const ready = READY_WORKOUTS.find(w => w.id === id);
  if (!ready) return id;
  const own = state.workouts.find(w => w.id === id);
  if (own) own.archived = false;
  else state.workouts.push({ id, name: ready.name, exerciseIds: [...ready.exerciseIds], archived: false });
  ready.exerciseIds.forEach(adopt);
  save();
  return id;
}

// Programs: [name, summary, guide sections, workouts] rotating in order. Each exercise: [name, reps per working set,
// kg added once every working rep is hit, tip]. A 5 x 5 also gets one warm-up set first,
// which never counts towards going up in weight.
const BUILD_UP = 'Make each set a little heavier (about 12.5% steps), finishing on your heaviest.';
const PROGRAM_DATA = [
  ['Pure strength 5×5', 'Three days a week, alternating A and B. Hit all 5 reps on every set and the weight goes up next time.', [
    ['What it is', 'A simple strength program built on a few big barbell lifts, each done for 5 sets of 5 reps. It follows the classic 5 × 5 approach lifters have used for decades.'],
    ['Who it is for', 'Beginners, and anyone coming back to lifting, who want to get stronger quickly with a plan that is easy to follow.'],
    ['Your week', 'Three workouts a week with a rest day between each one, for example Monday, Wednesday and Friday. You alternate the two workouts: A, B, A one week, then B, A, B the next.'],
    ['The workouts', 'Workout A: squat, bench press and barbell row. Workout B: squat, overhead press and deadlift. The deadlift is one set of 5, because it is hard on the body.'],
    ['Each exercise', 'Do one warm-up set, then 5 sets of 5 reps, all at the same weight. Rest around 3 minutes between the hard sets, longer if you need it.'],
    ['Going up', 'Hit 5 reps on all five sets and the weight goes up next time: 2.5 kg, or 5 kg on the deadlift. Miss a rep on any set and you stay at the same weight until you hit them all. The app works this out and fills in the weight for you.'],
    ['If you get stuck', 'If you keep missing reps at the same weight for a few sessions, take a little weight off and build back up. Sleep, food and rest days make a big difference here.'],
    ['Tips', 'Start lighter than you think you need to, so you have room to grow. Good form comes before heavy weight.'],
  ], [
    ['A', [['Barbell back squat', [5, 5, 5, 5, 5], 2.5], ['Barbell bench press', [5, 5, 5, 5, 5], 2.5], ['Bent-over barbell row', [5, 5, 5, 5, 5], 2.5]]],
    ['B', [['Barbell back squat', [5, 5, 5, 5, 5], 2.5], ['Barbell overhead press', [5, 5, 5, 5, 5], 2.5], ['Barbell deadlift', [5], 5]]],
  ]],
  ['Madcow 5×5', 'Heavy, light and heaviest days each week. Hit all your reps and the weight goes up next time.', [
    ['What it is', 'An intermediate 5 × 5 program based on the methods of strength coach Bill Starr. Instead of adding weight every workout, you aim to lift your heaviest set yet once a week.'],
    ['Who it is for', 'Lifters whose weights have stopped going up every workout on a beginner program, often after a few months of steady training.'],
    ['Your week', 'Three workouts a week with a rest day between: Heavy on Monday, Light on Wednesday and Heaviest on Friday.'],
    ['Heavy day', 'Squat, bench press and barbell row. Do 5 sets of 5, making each set a little heavier, roughly 12.5% steps, so only your last set is really hard.'],
    ['Light day', 'Squat for 4 sets using the same first four weights as Monday, so it stays easy. Then overhead press and deadlift, each for 4 sets of 5, building up.'],
    ['Heaviest day', 'Squat, bench press and barbell row again. Repeat Monday\'s first four sets, then do 3 reps a little heavier than Monday\'s last set: your heaviest yet. Finish with one lighter set of 8.'],
    ['Going up', 'Each week your heaviest sets go up a little, about 2.5%. In the app the weight box is your heaviest set: hit all your reps and it goes up next time, miss any and it stays the same.'],
    ['Tips', 'The first few weeks should feel easy; that is on purpose. Be patient and let the weight climb week by week.'],
  ], [
    ['Heavy', [['Barbell back squat', [5, 5, 5, 5, 5], 2.5, BUILD_UP], ['Barbell bench press', [5, 5, 5, 5, 5], 2.5, BUILD_UP], ['Bent-over barbell row', [5, 5, 5, 5, 5], 2.5, BUILD_UP]]],
    ['Light', [['Barbell back squat', [5, 5, 5, 5], 0, 'Lighter than Heavy day: use the weights from your first four Heavy day sets.'], ['Barbell overhead press', [5, 5, 5, 5], 2.5, BUILD_UP], ['Barbell deadlift', [5, 5, 5, 5], 5, BUILD_UP]]],
    ['Heaviest', [['Barbell back squat', [5, 5, 5, 5, 3, 8], 2.5, 'Build up over four sets, do 3 reps at your heaviest weight yet, then one lighter set of 8.'], ['Barbell bench press', [5, 5, 5, 5, 3, 8], 2.5, 'Build up over four sets, do 3 reps at your heaviest weight yet, then one lighter set of 8.'], ['Bent-over barbell row', [5, 5, 5, 5, 3, 8], 2.5, 'Build up over four sets, do 3 reps at your heaviest weight yet, then one lighter set of 8.']]],
  ]],
];
const isFiveByFive = reps => reps.length === 5 && reps.every(r => r === 5);

export const PROGRAMS = PROGRAM_DATA.map(([name, about, guide, days]) => {
  const id = `prog-${slug(name)}`;
  return {
    id, name, about, guide,
    workouts: days.map(([day, exercises]) => ({
      id: `${id}-${slug(day)}`, name: `${name} · ${day}`, programId: id, archived: false,
      exerciseIds: exercises.map(([n]) => idOf(n)),
      targets: Object.fromEntries(exercises.map(([n, reps, step, tip]) => [idOf(n), { warmup: isFiveByFive(reps) ? 1 : 0, reps, step, tip }])),
    })),
  };
});

// Stops following: the program's workouts leave the lists, and its planned workout with them.
export function unfollowProgram() {
  const planned = state.workouts.find(w => w.id === state.settings.next);
  if (planned?.programId) state.settings.next = null;
  state.settings.program = null;
  save();
}

// Starts following a program: its workouts join yours and its first workout is planned next.
export function followProgram(id) {
  const program = PROGRAMS.find(p => p.id === id);
  for (const w of program.workouts) {
    const own = state.workouts.find(o => o.id === w.id);
    if (own) own.archived = false;
    else state.workouts.push(structuredClone(w));
    w.exerciseIds.forEach(adopt);
  }
  state.settings.program = id;
  state.settings.next = program.workouts[0].id;
  save();
}
