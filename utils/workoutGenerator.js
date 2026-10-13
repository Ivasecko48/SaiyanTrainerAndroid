import { MUSCLE_KEYS, normalizeMuscles } from './muscles';
import { getLibraryMuscles } from './exerciseMuscles';

// Generator treninga bez AI-a: bira vježbe koje pokrivaju mišiće koji ovaj tjedan
// još nisu trenirani (crveno), a ako stane i one trenirane jednom (žuto).
//
// Pravila:
// 1. Prvo se pokrivaju crveni mišići, zatim (u preostala mjesta) žuti.
// 2. Vježba vrijedi više ako joj je mišić glavni (prvi u popisu) nego pomoćni.
// 3. Izbjegavaju se mišići koji su već trenirani 2× ili više (zeleno).
// 4. Prednost imaju vježbe koje je korisnik već radio.
// 5. Malo slučajnosti, da "Generiraj drugi" da drukčiju kombinaciju.

export const MAX_EXERCISES = 8;

const PRIMARY_WEIGHT = 1;
const SECONDARY_WEIGHT = 0.6;
const GREEN_PENALTY = 0.3;
const OVERLAP_PENALTY = 0.15;
const KNOWN_BONUS = 0.4;
const JITTER = 0.35;

const lower = (text) => String(text || '').trim().toLowerCase();

// Zadnji unos svake vježbe (po nazivu), koliko je puta rađena i zadnji spremljeni mišići
const historyByName = (exercises) => {
  const map = new Map();
  [...(exercises || [])]
    .filter((ex) => ex?.name && ex.createdAt)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .forEach((ex) => {
      const key = lower(ex.name);
      const entry = map.get(key) || { times: 0, last: null, muscles: [] };
      entry.times += 1;
      entry.last = ex;
      const muscles = normalizeMuscles(ex.muscles);
      if (muscles.length) entry.muscles = muscles;
      map.set(key, entry);
    });
  return map;
};

// Kandidati: katalog (biblioteka + vlastite vježbe s ovog uređaja) i sve vježbe iz
// povijesti treninga. Popis vlastitih vježbi je samo na uređaju (AsyncStorage), a uz
// svaki unos u Appwriteu spremljeni su i mišići, pa se tako vlastita vježba (npr.
// "Zercher Squat") nađe i na drugom mobitelu ili nakon ponovne instalacije.
const buildCandidates = (catalog, history) => {
  const map = new Map();
  (catalog || []).forEach((ex) => {
    const muscles = normalizeMuscles(ex.muscles);
    if (muscles.length) map.set(lower(ex.name), { name: ex.name, muscles });
  });
  history.forEach((entry, key) => {
    if (map.has(key)) return;
    const muscles = entry.muscles.length
      ? entry.muscles
      : normalizeMuscles(getLibraryMuscles(entry.last.name));
    if (muscles.length) map.set(key, { name: String(entry.last.name).trim(), muscles });
  });
  return [...map.values()];
};

// Vježbe koje se rade na vrijeme, a ne na broj ponavljanja
const TIMED = ['plank', 'side plank', 'wall sit', 'mountain climbers', 'flutter kicks', 'superman'];

// Serije i ponavljanja: višezglobne vježbe 3 × 8-10, izolacije 3 × 10-12,
// trbuh i listovi 3 × 15, vježbe na vrijeme 3 × 30 s
const prescription = (name, muscles) => {
  if (TIMED.includes(lower(name))) {
    return { sets: 3, reps: '30 s' };
  }
  if (muscles.length === 1 && ['abs', 'obliques', 'calves'].includes(muscles[0])) {
    return { sets: 3, reps: '15' };
  }
  return muscles.length >= 2 ? { sets: 3, reps: '8-10' } : { sets: 3, reps: '10-12' };
};

/**
 * @param {Object}   counts     broj treninga ovaj tjedan po mišiću (iz computeWeek)
 * @param {Array}    catalog    vježbe iz kataloga ({ name, muscles })
 * @param {Array}    exercises  povijest unosa korisnika (za zadnju kilažu i prednost poznatim vježbama)
 * @param {Function} random     izvor slučajnosti (za testove se može zamijeniti)
 */
export const generateWorkout = ({
  counts,
  catalog,
  exercises,
  maxExercises = MAX_EXERCISES,
  random = Math.random,
}) => {
  const red = MUSCLE_KEYS.filter((key) => (counts[key] || 0) === 0);
  const yellow = MUSCLE_KEYS.filter((key) => (counts[key] || 0) === 1);
  const green = new Set(MUSCLE_KEYS.filter((key) => (counts[key] || 0) >= 2));

  const history = historyByName(exercises);
  const candidates = buildCandidates(catalog, history).map((ex) => ({
    ...ex,
    jitter: random() * JITTER,
  }));

  const uncoveredRed = new Set(red);
  const uncoveredYellow = new Set(yellow);
  const covered = new Set();
  const chosen = [];

  // Jedna faza: dok ima nepokrivenih ciljnih mišića, uzmi vježbu s najboljim omjerom
  const fill = (targets, tieBreak) => {
    while (chosen.length < maxExercises && targets.size > 0) {
      let best = null;
      let bestScore = 0;

      candidates.forEach((ex) => {
        if (chosen.some((c) => c.name === ex.name)) return;

        let gain = 0;
        ex.muscles.forEach((muscle, index) => {
          const weight = index === 0 ? PRIMARY_WEIGHT : SECONDARY_WEIGHT;
          if (targets.has(muscle)) gain += weight;
          else if (tieBreak && tieBreak.has(muscle)) gain += weight * 0.15;
        });
        if (gain === 0) return;

        let score = gain;
        ex.muscles.forEach((muscle) => {
          if (green.has(muscle)) score -= GREEN_PENALTY;
          if (covered.has(muscle)) score -= OVERLAP_PENALTY;
        });
        if (history.has(lower(ex.name))) score += KNOWN_BONUS;
        score += ex.jitter;

        if (score > bestScore) {
          best = ex;
          bestScore = score;
        }
      });

      if (!best) break;

      chosen.push(best);
      best.muscles.forEach((muscle) => {
        covered.add(muscle);
        uncoveredRed.delete(muscle);
        uncoveredYellow.delete(muscle);
      });
    }
  };

  fill(uncoveredRed, uncoveredYellow); // 1. crveni (žuti samo kao prednost kod izjednačenja)
  fill(uncoveredYellow); // 2. žuti, ako je ostalo mjesta

  // Višezglobne vježbe prve, izolacije na kraju
  const ordered = [...chosen].sort((a, b) => b.muscles.length - a.muscles.length);

  return {
    exercises: ordered.map((ex) => {
      const last = history.get(lower(ex.name))?.last;
      return {
        name: ex.name,
        muscles: ex.muscles,
        ...prescription(ex.name, ex.muscles),
        lastWeight: last && Number(last.weight) > 0 ? Number(last.weight) : null,
        lastReps: last ? last.reps : null,
      };
    }),
    red,
    yellow,
    missedRed: [...uncoveredRed],
    missedYellow: [...uncoveredYellow],
  };
};
