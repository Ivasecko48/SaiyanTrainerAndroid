// Volumen vježbe = serije × ponavljanja × kilaža.
// Kod raspona ponavljanja (15-20, 20-25, 25+) u bazi je donja granica, pa se računa s njom.
export const exerciseVolume = (exercise) =>
  (Number(exercise.sets) || 0) * (Number(exercise.reps) || 0) * (Number(exercise.weight) || 0);

export const totalVolume = (exercises) =>
  exercises.reduce((sum, exercise) => sum + exerciseVolume(exercise), 0);

// '12.450 kg' (točka kao razdjelnik tisućica)
export const formatVolume = (kg) =>
  `${String(Math.round(kg)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kg`;
