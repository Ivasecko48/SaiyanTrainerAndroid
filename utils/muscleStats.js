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
