// Pravila za lozinku kod registracije. Provjera radi i s hrvatskim slovima (Č, š...):
// slovo je znak koji ima veliko i malo slovo, a poseban znak je sve što nije slovo,
// brojka ni razmak.
const isLetter = (ch) => ch.toLowerCase() !== ch.toUpperCase();
const isDigit = (ch) => ch >= '0' && ch <= '9';
const isSpace = (ch) => /\s/.test(ch);

const chars = (password) => Array.from(String(password || ''));

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: 'Barem 8 znakova',
    test: (p) => chars(p).length >= 8,
  },
  {
    id: 'upper',
    label: 'Veliko slovo',
    test: (p) => chars(p).some((ch) => isLetter(ch) && ch === ch.toUpperCase()),
  },
  {
    id: 'lower',
    label: 'Malo slovo',
    test: (p) => chars(p).some((ch) => isLetter(ch) && ch === ch.toLowerCase()),
  },
  {
    id: 'special',
    label: 'Poseban znak (npr. ! ? # @ .)',
    test: (p) => chars(p).some((ch) => !isLetter(ch) && !isDigit(ch) && !isSpace(ch)),
  },
];

// Popis pravila s oznakom je li ispunjeno
export const checkPassword = (password) =>
  PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) }));

export const isStrongPassword = (password) =>
  PASSWORD_RULES.every((rule) => rule.test(password));
