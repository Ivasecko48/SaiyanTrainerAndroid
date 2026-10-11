// Ponavljanja 1 do 14 biraju se pojedinačno, a veći brojevi kao rasponi.
// U bazu se sprema broj (donja granica raspona), a na ekranu se prikazuje raspon:
//   15 -> "15-20",  20 -> "20-25",  25 -> "25+"
export const REP_RANGE_LABELS = {
  15: '15-20',
  20: '20-25',
  25: '25+',
};

export const REPS_OPTIONS = [
  ...Array.from({ length: 14 }, (_, i) => i + 1),
  15,
  20,
  25,
];

export const formatReps = (value) =>
  REP_RANGE_LABELS[value] ?? String(value ?? '');
