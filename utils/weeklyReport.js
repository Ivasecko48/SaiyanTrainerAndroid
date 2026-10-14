import { dateKey, weekRange, formatShort } from './dates';
import { computeWeek } from './muscleStats';
import { MUSCLE_KEYS, MUSCLE_LABELS } from './muscles';
import { calcTargets } from './nutrition';

// Tjedni izvještaj o PROŠLOM tjednu (pon - ned), bez AI-a: pravila nad korisnikovim
// obrocima, vježbama i ciljevima iz profila. Vrijedi tijekom tekućeg tjedna, a
// sljedeći ponedjeljak ga zamijeni novi (ključ je početak prošlog tjedna).
//
// Redoslijed provjera:
// 1. Proteini: prosjek po danu s unesenim obrocima prema cilju iz profila.
// 2. Mišići koji prošli tjedan nisu trenirani (crveno).
// 3. Ako je sve u redu: intenzitet prema RPE-u (više ili manje kilaže).

const PROTEIN_OK_SHARE = 0.9; // 90% cilja se računa kao dovoljno
const RPE_EASY = 7; // prosjek ispod ovoga: prelagano
const RPE_HARD = 9; // prosjek od ovoga naviše: preteško
const MAX_EXERCISE_TIPS = 3;

// Brzi izvori proteina za prijedlog (porcija i grami proteina)
const PROTEIN_SNACKS = [
  { text: '150 g pilećih prsa', protein: 47 },
  { text: '1 konzerva tune', protein: 31 },
  { text: '250 g posnog svježeg sira', protein: 30 },
  { text: '1 mjerica whey proteina', protein: 23 },
  { text: '3 jaja', protein: 23 },
  { text: '150 g skyra', protein: 17 },
];

const comma = (n) => String(n).replace('.', ',');
const round1 = (n) => Math.round(n * 10) / 10;

// Jedna ili dvije porcije koje pokriju manjak proteina (najmanji višak)
const proteinSuggestion = (gap) => {
  const single = PROTEIN_SNACKS.filter((s) => s.protein >= gap).sort((a, b) => a.protein - b.protein)[0];
  if (single) return single.text;

  let best = null;
  PROTEIN_SNACKS.forEach((a, i) => {
    PROTEIN_SNACKS.slice(i).forEach((b) => {
      const sum = a.protein + b.protein;
      const fits = sum >= gap;
      if (!best || (fits && (!best.fits || sum < best.sum)) || (!best.fits && sum > best.sum)) {
        best = { text: a === b ? `2 × ${a.text}` : `${a.text} i ${b.text}`, sum, fits };
      }
    });
  });
  return best.text;
};

// Sljedeća kilaža: +2,5 kg (ispod 40 kg +1 kg) ili -10% zaokruženo
const nextWeight = (weight, up) => {
  const step = weight >= 40 ? 2.5 : 1;
  if (up) return round1(weight + step);
  return Math.max(step, round1(Math.round((weight * 0.9) / step) * step));
};

// Zadnji unos svake vježbe u tjednu
const lastEntryPerExercise = (entries) => {
  const map = new Map();
  [...entries]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .forEach((ex) => map.set(String(ex.name).trim().toLowerCase(), ex));
  return [...map.values()];
};

/**
 * @param {Array}    exercises     sve vježbe korisnika
 * @param {Array}    meals         svi obroci korisnika
 * @param {Object}   profile       user.prefs.profile (može biti undefined)
 * @param {Function} lookupByName  mišići za stare unose bez mišića (kao u computeWeek)
 * @param {Date}     today
 * @returns {null | { weekKey, rangeLabel, allGood, title, items: [{ id, ok, title, text, details }] }}
 */
export const buildWeeklyReport = ({ exercises = [], meals = [], profile, lookupByName, today = new Date() }) => {
  const lastWeekDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  const week = weekRange(lastWeekDay);
  const inWeek = (item) => {
    const key = item?.createdAt ? dateKey(item.createdAt) : null;
    return key && key >= week.start && key <= week.end;
  };

  const weekExercises = exercises.filter(inWeek);
  const weekMeals = meals.filter(inWeek);

  // Novi korisnik (ništa prije ovog tjedna): nema izvještaja
  const thisWeekStart = weekRange(today).start;
  const hasHistory = [...exercises, ...meals].some(
    (item) => item?.createdAt && dateKey(item.createdAt) < thisWeekStart
  );
  if (!hasHistory) return null;

  const items = [];

  // 1. Proteini
  const targets = calcTargets(profile);
  const mealDays = new Set(weekMeals.map((m) => dateKey(m.createdAt))).size;
  let proteinOk = true;
  if (!targets) {
    items.push({
      id: 'protein',
      ok: null,
      title: 'Proteini',
      text: 'Postavi profil (glava gore desno) pa ću ti svaki tjedan provjeriti i proteine.',
    });
  } else if (mealDays === 0) {
    items.push({
      id: 'protein',
      ok: null,
      title: 'Proteini',
      text: 'Prošli tjedan nisi unosio obroke, pa proteine nisam mogao provjeriti.',
    });
  } else {
    const avg = Math.round(weekMeals.reduce((sum, m) => sum + (Number(m.protein) || 0), 0) / mealDays);
    proteinOk = avg >= targets.protein * PROTEIN_OK_SHARE;
    const gap = targets.protein - avg;
    items.push({
      id: 'protein',
      ok: proteinOk,
      title: 'Proteini',
      text: proteinOk
        ? `Prosječno ${avg} g dnevno (cilj ${targets.protein} g). Bravo, mišići imaju od čega rasti!`
        : `Prosječno ${avg} g dnevno, a cilj ti je ${targets.protein} g. Fali oko ${gap} g dnevno: probaj dodati ${proteinSuggestion(gap)}.`,
    });
  }

  // 2. Netrenirani mišići
  let musclesOk = true;
  if (weekExercises.length === 0) {
    musclesOk = false;
    items.push({
      id: 'muscles',
      ok: false,
      title: 'Trening',
      text: 'Prošli tjedan nije bilo treninga. Novi tjedan je nova prilika: na Muscle Groups klikni "Generiraj trening" i kreni!',
    });
  } else {
    const { counts } = computeWeek(weekExercises, lookupByName, lastWeekDay);
    const red = MUSCLE_KEYS.filter((key) => counts[key] === 0);
    musclesOk = red.length === 0;
    items.push({
      id: 'muscles',
      ok: musclesOk,
      title: 'Mišići',
      text: musclesOk
        ? 'Sve mišićne skupine su trenirane. Cijelo tijelo je dobilo svoje!'
        : `Prošli tjedan nisu trenirani: ${red.map((k) => MUSCLE_LABELS[k]).join(', ')}. Ubaci ih ovaj tjedan, "Generiraj trening" na Muscle Groups složi trening baš za njih.`,
    });
  }

  // 3. Intenzitet prema RPE-u (samo kad je sve ostalo u redu)
  const allGood = proteinOk && musclesOk;
  if (allGood) {
    const withRpe = weekExercises.filter((ex) => Number(ex.rpe) > 0);
    if (withRpe.length > 0) {
      const avgRpe = round1(withRpe.reduce((sum, ex) => sum + Number(ex.rpe), 0) / withRpe.length);
      const last = lastEntryPerExercise(withRpe).filter((ex) => Number(ex.weight) > 0);

      let text;
      let tips = [];
      if (avgRpe < RPE_EASY) {
        text = `Prosječni RPE ${comma(avgRpe)}: treninzi su ti bili prelagani. Vrijeme je za veće kilaže!`;
        tips = last.filter((ex) => Number(ex.rpe) < RPE_EASY + 0.5);
      } else if (avgRpe >= RPE_HARD) {
        text = `Prosječni RPE ${comma(avgRpe)}: treniraš na samom rubu. Smanji kilažu 5-10% ili napravi lakši tjedan da se tijelo oporavi.`;
        tips = last.filter((ex) => Number(ex.rpe) >= RPE_HARD + 0.5);
      } else {
        text = `Prosječni RPE ${comma(avgRpe)}: savršen intenzitet! Nastavi i dodaj malo kilaže gdje ide lako.`;
        tips = last.filter((ex) => Number(ex.rpe) <= RPE_EASY);
      }

      const up = avgRpe < RPE_HARD;
      items.push({
        id: 'intensity',
        ok: true,
        title: 'Intenzitet',
        text,
        details: tips.slice(0, MAX_EXERCISE_TIPS).map((ex) => {
          const weight = Number(ex.weight);
          return `${ex.name}: ${comma(weight)} kg × ${ex.reps} (RPE ${comma(Number(ex.rpe))}) → probaj ${comma(nextWeight(weight, up))} kg`;
        }),
      });
    }
  }

  const rangeLabel = `${formatShort(week.startDate)} – ${formatShort(week.endDate)}`;
  return {
    weekKey: week.start,
    rangeLabel,
    allGood,
    title: allGood ? 'Odličan tjedan, Saiyane! Power level raste 💪' : 'Tjedni izvještaj: malo posla za ovaj tjedan',
    items,
  };
};
