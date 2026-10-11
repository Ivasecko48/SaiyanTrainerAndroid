// 15 mišićnih skupina. `key` se sprema u bazu uz svaku vježbu, `label` se prikazuje u aplikaciji.
// Isti ključevi koriste se i za bojanje tijela u components/bodyPaths.js.
export const MUSCLES = [
  { key: 'chest', label: 'Prsa' },
  { key: 'shoulders', label: 'Ramena' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'triceps', label: 'Triceps' },
  { key: 'forearms', label: 'Podlaktice' },
  { key: 'traps', label: 'Trapez' },
  { key: 'upper_back', label: 'Gornja leđa' },
  { key: 'lats', label: 'Široka leđa' },
  { key: 'lower_back', label: 'Donja leđa' },
  { key: 'abs', label: 'Trbušni' },
  { key: 'obliques', label: 'Kosi trbušni' },
  { key: 'glutes', label: 'Gluteusi' },
  { key: 'quads', label: 'Kvadricepsi' },
  { key: 'hamstrings', label: 'Zadnja loža' },
  { key: 'calves', label: 'Listovi' },
];

export const MUSCLE_KEYS = MUSCLES.map((m) => m.key);

export const MUSCLE_LABELS = MUSCLES.reduce((acc, m) => {
  acc[m.key] = m.label;
  return acc;
}, {});

// Boje za tjedni prikaz
export const COLOR_NONE = '#e74c3c'; // nije odrađeno
export const COLOR_ONCE = '#f1c40f'; // odrađeno jednom
export const COLOR_TWICE = '#2ecc71'; // odrađeno dva ili više puta

export const colorForCount = (count) => {
  if (count >= 2) return COLOR_TWICE;
  if (count === 1) return COLOR_ONCE;
  return COLOR_NONE;
};

// Pretvara vrijednost iz baze (niz ili tekst s zarezima) u čisti niz valjanih ključeva
export const normalizeMuscles = (value) => {
  let list = [];
  if (Array.isArray(value)) list = value;
  else if (typeof value === 'string') list = value.split(',');

  const cleaned = list
    .map((v) => String(v).trim())
    .filter((v) => MUSCLE_KEYS.includes(v));

  return Array.from(new Set(cleaned));
};

export const musclesToText = (keys) =>
  normalizeMuscles(keys)
    .map((k) => MUSCLE_LABELS[k])
    .join(', ');
