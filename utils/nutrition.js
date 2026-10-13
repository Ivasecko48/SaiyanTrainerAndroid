// Izračun dnevnih potreba za kalorijama i proteinima iz profila.
//
// Izvori:
// - BMR odrasli: Mifflin-St Jeor (1990). Frankenfield i sur. (2005, J Am Diet Assoc)
//   pokazuju da je najpouzdanija jednadžba za odrasle (unutar ±10% izmjerenog kod najviše ljudi).
// - BMR 13-18 god.: FAO/WHO/UNU (1985), Schofieldove jednadžbe za 10-18 god.,
//   jer je Mifflin-St Jeor razvijen na odraslima (19-78 god.).
// - Aktivnost: standardni faktori 1.2 / 1.375 / 1.55 / 1.725.
// - 1 kg tjelesne mase ≈ 7700 kcal (klasično pravilo, Hall 2008).
// - Proteini ovise o razini aktivnosti: 1.2 g/kg bez treninga, 1.4-1.8 g/kg uz trening
//   (ISSN 2017: 1.4-2.0 g/kg za one koji treniraju; Morton i sur. 2018: ~1.6 g/kg
//   dovoljno za rast mišića). U deficitu +0.2 g/kg, da se sačuva mišićna masa.
//   Višak kalorija štedi proteine, pa za dobivanje mase vrijedi isto kao za održavanje.
// - Brzina: mršavljenje do ~1% tjelesne mase tjedno (Helms 2014),
//   dobivanje ~0.25-0.5% tjedno (Iraki 2019).

export const AGE_RANGES = [
  { id: '13-18', min: 13, max: 18 },
  { id: '19-25', min: 19, max: 25 },
  { id: '26-34', min: 26, max: 34 },
  { id: '35-45', min: 35, max: 45 },
  { id: '46-58', min: 46, max: 58 },
  { id: '59-73', min: 59, max: 73 },
  { id: '74-90', min: 74, max: 90 },
  { id: '91-99', min: 91, max: 99 },
];

export const ACTIVITY_LEVELS = [
  {
    id: 'saiyan',
    title: 'Saiyan',
    label: 'Neaktivan',
    description: 'Sjedilački posao, bez treninga',
    factor: 1.2,
    proteinPerKg: 1.2,
  },
  {
    id: 'ss',
    title: 'Super Saiyan',
    label: 'Umjereno aktivan',
    description: 'Trening 1-3x tjedno',
    factor: 1.375,
    proteinPerKg: 1.4,
  },
  {
    id: 'ss2',
    title: 'Super Saiyan 2',
    label: 'Aktivan',
    description: 'Trening 3-5x tjedno',
    factor: 1.55,
    proteinPerKg: 1.6,
  },
  {
    id: 'ss3',
    title: 'Super Saiyan 3',
    label: 'Vrlo aktivan',
    description: 'Težak trening 6-7x tjedno ili fizički posao',
    factor: 1.725,
    proteinPerKg: 1.8,
  },
];

export const SEXES = [
  { id: 'm', label: 'Muško' },
  { id: 'f', label: 'Žensko' },
];

export const GOALS = [
  { id: 'lose', label: 'Smršaviti' },
  { id: 'maintain', label: 'Održavati' },
  { id: 'gain', label: 'Gainati' },
];

// kg mjesečno
export const RATE_OPTIONS = {
  lose: [0.5, 1, 2, 3, 4],
  gain: [0.5, 1, 1.5, 2],
};

export const HEIGHT_RANGE = { min: 130, max: 220, step: 1 };
export const WEIGHT_RANGE = { min: 40, max: 160, step: 0.5 };

export const DEFAULT_PROFILE = {
  sex: 'm',
  heightCm: 178,
  weightKg: 80,
  ageRange: '19-25',
  activity: 'ss',
  goal: 'maintain',
  rateKg: 1,
};

const KCAL_PER_KG = 7700;
const DAYS_PER_MONTH = 30.44;
const WEEKS_PER_MONTH = DAYS_PER_MONTH / 7;
// Dodatak proteina u deficitu (g/kg)
const PROTEIN_DEFICIT_BONUS = 0.2;
// Ispod ovoga se ne ide bez nadzora stručnjaka
const MIN_KCAL = { m: 1500, f: 1200 };

const findAge = (id) => AGE_RANGES.find((r) => r.id === id) || AGE_RANGES[1];
const findActivity = (id) =>
  ACTIVITY_LEVELS.find((a) => a.id === id) || ACTIVITY_LEVELS[0];

const calcBmr = ({ sex, weightKg, heightCm }, ageRange) => {
  const female = sex === 'f';

  if (ageRange.max <= 18) {
    return {
      value: female ? 12.2 * weightKg + 746 : 17.5 * weightKg + 651,
      formula: 'FAO/WHO/UNU (13-18 god.)',
    };
  }

  const age = (ageRange.min + ageRange.max) / 2;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return {
    value: female ? base - 161 : base + 5,
    formula: 'Mifflin-St Jeor',
  };
};

// Vraća null ako profil nije postavljen
export const calcTargets = (profile) => {
  if (!profile || !profile.weightKg || !profile.heightCm) return null;

  const p = { ...DEFAULT_PROFILE, ...profile };
  const ageRange = findAge(p.ageRange);
  const activity = findActivity(p.activity);
  const bmr = calcBmr(p, ageRange);
  const tdee = bmr.value * activity.factor;

  const rate = p.goal === 'maintain' ? 0 : Number(p.rateKg) || 0;
  const sign = p.goal === 'lose' ? -1 : p.goal === 'gain' ? 1 : 0;
  const dailyChange = (sign * rate * KCAL_PER_KG) / DAYS_PER_MONTH;

  const warnings = [];
  const floor = MIN_KCAL[p.sex] || MIN_KCAL.m;
  let target = tdee + dailyChange;
  if (target < floor) {
    target = floor;
    warnings.push(`Cilj je podignut na sigurni minimum od ${floor} kcal.`);
  }

  const weeklyShare = rate / WEEKS_PER_MONTH / p.weightKg;
  if (p.goal === 'lose' && weeklyShare > 0.01) {
    warnings.push(
      'Više od 1% tjelesne mase tjedno: veći rizik gubitka mišića.'
    );
  }
  if (p.goal === 'gain' && weeklyShare > 0.005) {
    warnings.push(
      'Više od 0,5% tjelesne mase tjedno: dio viška ide u masno tkivo.'
    );
  }
  if (p.goal === 'lose' && ageRange.max <= 18) {
    warnings.push('Do 18 god. mršavljenje samo uz savjet liječnika.');
  }

  const proteinPerKg = Number(
    (activity.proteinPerKg + (p.goal === 'lose' ? PROTEIN_DEFICIT_BONUS : 0)).toFixed(1)
  );

  return {
    bmr: Math.round(bmr.value),
    tdee: Math.round(tdee),
    calories: Math.round(target),
    change: Math.round(target - tdee),
    protein: Math.round(proteinPerKg * p.weightKg),
    proteinPerKg,
    formula: bmr.formula,
    goal: p.goal,
    warnings,
  };
};

// Tolerancija za "održavanje": unutar ovoliko kcal od cilja smatra se ispunjenim
const MAINTAIN_TOLERANCE = 100;

// Tekst i boja ispod ukupnih kalorija na ekranu s obrocima.
// `days` > 1 kod prikaza tjedna/mjeseca: cilj (i tolerancija) se množi brojem dana.
export const calorieStatus = (eaten, targets, days = 1) => {
  const diff = Math.round(targets.calories * days - eaten);

  if (targets.goal === 'lose') {
    return diff >= 0
      ? { ok: true, text: `Ostalo još ${diff} kcal` }
      : { ok: false, text: `Preko cilja ${-diff} kcal` };
  }

  if (targets.goal === 'gain') {
    return diff > 0
      ? { ok: false, text: `Fali još ${diff} kcal` }
      : { ok: true, text: 'Cilj ispunjen ✓' };
  }

  if (Math.abs(diff) <= MAINTAIN_TOLERANCE * days) {
    return { ok: true, text: 'U cilju ✓' };
  }
  return diff > 0
    ? { ok: false, text: `Fali još ${diff} kcal` }
    : { ok: false, text: `Preko cilja ${-diff} kcal` };
};

export const proteinStatus = (eaten, targets, days = 1) => {
  const diff = Math.round(targets.protein * days - eaten);
  return diff > 0
    ? { ok: false, text: `Fali još ${diff} g` }
    : { ok: true, text: 'Proteini ispunjeni ✓' };
};
