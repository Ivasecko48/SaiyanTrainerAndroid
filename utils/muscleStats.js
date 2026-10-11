import { MUSCLE_KEYS, normalizeMuscles } from './muscles';
import { getLibraryMuscles } from './exerciseMuscles';
import { dateKey, weekRange } from './dates';

/**
 * Za svaku mišićnu skupinu računa koliko je RAZLIČITIH DANA u zadanom tjednu bila trenirana.
 * Više vježbi za isti mišić u jednom danu računa se kao jedan trening.
 *
 * @param {Array}    exercises      unosi iz baze ({ name, createdAt, muscles })
 * @param {Function} lookupByName   nadomjestak za stare unose bez mišića: (name) => string[]
 * @param {Date}     ref            bilo koji dan unutar željenog tjedna
 * @returns {{ counts: Object, unassigned: number, range: Object }}
 */
export const computeWeek = (exercises, lookupByName, ref = new Date()) => {
  const range = weekRange(ref);
  const days = {};
  MUSCLE_KEYS.forEach((key) => {
    days[key] = new Set();
  });

  let unassigned = 0;

  (exercises || []).forEach((exercise) => {
    if (!exercise?.createdAt) return;

    const day = dateKey(exercise.createdAt);
    if (day < range.start || day > range.end) return;

    let muscles = normalizeMuscles(exercise.muscles);
    if (muscles.length === 0) {
      // stari unos bez spremljenih mišića: probaj pronaći vježbu po nazivu
      muscles = normalizeMuscles(
        (lookupByName && lookupByName(exercise.name)) ||
          getLibraryMuscles(exercise.name)
      );
    }

    if (muscles.length === 0) {
      unassigned += 1;
      return;
    }

    muscles.forEach((key) => days[key].add(day));
  });

  const counts = {};
  MUSCLE_KEYS.forEach((key) => {
    counts[key] = days[key].size;
  });

  return { counts, unassigned, range };
};

const lower = (text) => String(text || '').trim().toLowerCase();

// Nazivi vježbi (malim slovima) koje je korisnik unio u tjednu zadanog dana
export const weekExerciseNames = (exercises, ref = new Date()) => {
  const range = weekRange(ref);
  const names = new Set();

  (exercises || []).forEach((exercise) => {
    if (!exercise?.createdAt) return;
    const day = dateKey(exercise.createdAt);
    if (day >= range.start && day <= range.end) {
      names.add(lower(exercise.name));
    }
  });

  return names;
};

/**
 * Sve vježbe koje obuhvaćaju zadanu mišićnu skupinu: iz kataloga (biblioteka + vlastite)
 * te vježbe koje je korisnik već unosio, a nisu u katalogu.
 * Vježbe kojima je ta skupina glavna dolaze prve, zatim abecedno.
 *
 * @returns {Array<{ name: string, muscles: string[], primary: boolean, doneThisWeek: boolean }>}
 */
export const exercisesForMuscle = (muscleKey, catalog, exercises, ref = new Date()) => {
  const doneThisWeek = weekExerciseNames(exercises, ref);
  const found = new Map(); // naziv malim slovima -> { name, muscles }

  (catalog || []).forEach((exercise) => {
    const muscles = normalizeMuscles(exercise.muscles);
    if (muscles.includes(muscleKey)) {
      found.set(lower(exercise.name), { name: exercise.name, muscles });
    }
  });

  (exercises || []).forEach((exercise) => {
    const key = lower(exercise?.name);
    if (!key || found.has(key)) return;

    const own = normalizeMuscles(exercise.muscles);
    const muscles = own.length ? own : normalizeMuscles(getLibraryMuscles(exercise.name));
    if (muscles.includes(muscleKey)) {
      found.set(key, { name: String(exercise.name).trim(), muscles });
    }
  });

  return Array.from(found.entries())
    .map(([key, item]) => ({
      ...item,
      primary: item.muscles[0] === muscleKey,
      doneThisWeek: doneThisWeek.has(key),
    }))
    .sort((a, b) => {
      if (a.primary !== b.primary) return a.primary ? -1 : 1;
      return a.name.localeCompare(b.name, 'hr');
    });
};
