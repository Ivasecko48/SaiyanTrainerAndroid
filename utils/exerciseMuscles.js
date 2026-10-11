// Mišići koje svaka vježba iz components/workout_exercises.json radi (glavni + važni pomoćni).
// Ključ je naziv vježbe, malim slovima. Datoteka s vježbama ostaje nepromijenjena.
const MAP = {
  // Prsa
  'bench press': ['chest', 'triceps', 'shoulders'],
  'incline bench press': ['chest', 'shoulders', 'triceps'],
  'decline bench press': ['chest', 'triceps'],
  'chest fly': ['chest'],
  'cable crossover': ['chest'],
  'push-up': ['chest', 'triceps', 'shoulders'],
  'incline push-up': ['chest', 'triceps'],
  'decline push-up': ['chest', 'shoulders', 'triceps'],
  'close-grip push-up': ['triceps', 'chest'],
  'isometric chest squeeze': ['chest'],

  // Leđa
  'pull-up': ['lats', 'biceps', 'upper_back'],
  'chin-up': ['lats', 'biceps'],
  'lat pulldown': ['lats', 'biceps'],
  'seated row': ['upper_back', 'lats', 'biceps'],
  'bent-over row': ['upper_back', 'lats', 'biceps'],
  deadlift: ['lower_back', 'glutes', 'hamstrings', 'traps'],
  'straight arm pulldown': ['lats'],
  'reverse fly': ['shoulders', 'upper_back'],
  'good morning': ['lower_back', 'hamstrings', 'glutes'],
  superman: ['lower_back', 'glutes'],

  // Ramena
  'overhead press': ['shoulders', 'triceps'],
  'front raise': ['shoulders'],
  'lateral raise': ['shoulders'],
  'rear delt fly': ['shoulders', 'upper_back'],
  'arnold press': ['shoulders', 'triceps'],
  'push press': ['shoulders', 'triceps'],
  shrug: ['traps'],
  'z press': ['shoulders', 'triceps'],
  'y raise': ['shoulders', 'traps'],
  'face pull': ['shoulders', 'upper_back'],

  // Noge
  squat: ['quads', 'glutes'],
  'front squat': ['quads', 'glutes'],
  'bulgarian split squat': ['quads', 'glutes'],
  lunge: ['quads', 'glutes'],
  'step-up': ['quads', 'glutes'],
  'romanian deadlift': ['hamstrings', 'glutes', 'lower_back'],
  'leg curl': ['hamstrings'],
  'leg extension': ['quads'],
  'wall sit': ['quads'],
  'calf raise': ['calves'],

  // Biceps
  'bicep curl': ['biceps'],
  'hammer curl': ['biceps', 'forearms'],
  'concentration curl': ['biceps'],
  'preacher curl': ['biceps'],
  'zottman curl': ['biceps', 'forearms'],

  // Triceps
  'triceps pushdown': ['triceps'],
  'overhead triceps extension': ['triceps'],
  skullcrusher: ['triceps'],
  'close-grip bench press': ['triceps', 'chest'],
  dips: ['triceps', 'chest', 'shoulders'],

  // Trbuh
  crunch: ['abs'],
  'sit-up': ['abs'],
  plank: ['abs'],
  'side plank': ['obliques'],
  'leg raise': ['abs'],
  'flutter kicks': ['abs'],
  'russian twist': ['obliques', 'abs'],
  'bicycle crunch': ['abs', 'obliques'],
  'mountain climbers': ['abs', 'quads'],
  'hanging leg raise': ['abs'],
};

// Sirova procjena za stare vlastite vježbe koje su imale samo grubu skupinu (Chest, Back...)
export const COARSE_GROUP_TO_MUSCLES = {
  Chest: ['chest'],
  Back: ['lats', 'upper_back'],
  Shoulders: ['shoulders'],
  Legs: ['quads', 'glutes'],
  Core: ['abs'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
};

export const getLibraryMuscles = (name) => {
  if (!name) return [];
  return MAP[String(name).trim().toLowerCase()] || [];
};
