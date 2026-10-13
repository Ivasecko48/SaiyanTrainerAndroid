const pad = (n) => String(n).padStart(2, '0');

// Lokalni datum kao 'YYYY-MM-DD'
export const toKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayKey = () => toKey(new Date());

// Dan spremljenog unosa kao 'YYYY-MM-DD'.
// Isti izračun koristi se u filterima na ekranima, jer se createdAt sprema u UTC-u.
export const dateKey = (iso) => new Date(iso).toISOString().split('T')[0];

// Tjedan od ponedjeljka do nedjelje koji sadrži zadani datum (po lokalnom vremenu)
export const weekRange = (ref = new Date()) => {
  const day = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const sinceMonday = (day.getDay() + 6) % 7; // ponedjeljak = 0, nedjelja = 6

  const start = new Date(day);
  start.setDate(day.getDate() - sinceMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start: toKey(start), end: toKey(end), startDate: start, endDate: end };
};

// 'dd.MM.' za prikaz u naslovu
export const formatShort = (date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.`;

const MONTHS = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
  'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac',
];

// Mjesec koji sadrži zadani datum: { start, end } kao 'YYYY-MM-DD' i naziv 'Listopad 2026'
export const monthRange = (ref = new Date()) => {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return {
    start: toKey(start),
    end: toKey(end),
    label: `${MONTHS[start.getMonth()]} ${start.getFullYear()}`,
  };
};

// Broj dana u rasponu { start, end } (uključivo)
export const daysInRange = ({ start, end }) =>
  Math.round((fromKey(end) - fromKey(start)) / 86400000) + 1;

// Svi dani u rasponu kao 'YYYY-MM-DD'
export const keysInRange = ({ start, end }) => {
  const keys = [];
  const day = fromKey(start);
  const last = fromKey(end);
  while (day <= last) {
    keys.push(toKey(day));
    day.setDate(day.getDate() + 1);
  }
  return keys;
};

// 'YYYY-MM-DD' u lokalni datum
export const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const DAYS = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
const DAYS_SHORT = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];

// 'Srijeda, 15.10.'
export const formatDayLong = (key) => {
  const date = fromKey(key);
  return `${DAYS[date.getDay()]}, ${formatShort(date)}`;
};

// 'Sri, 15.10.'
export const formatDayShort = (key) => {
  const date = fromKey(key);
  return `${DAYS_SHORT[date.getDay()]}, ${formatShort(date)}`;
};

// Je li unos u rasponu { start, end } ('YYYY-MM-DD'); null = svi dani
export const inRange = (iso, range) => {
  if (!range) return true;
  const key = dateKey(iso);
  return key >= range.start && key <= range.end;
};

// Unosi poredani po danu, s naslovom dana ispred svakog dana (prikaz tjedna ili svih dana).
// Retci naslova imaju type: 'day'.
export const withDayHeaders = (items, newestFirst = false) => {
  const sorted = [...items].sort((a, b) => {
    const diff = dateKey(a.createdAt).localeCompare(dateKey(b.createdAt));
    return newestFirst ? -diff : diff;
  });

  const rows = [];
  let current = null;
  sorted.forEach((item) => {
    const key = dateKey(item.createdAt);
    if (key !== current) {
      current = key;
      rows.push({ type: 'day', $id: `day-${key}`, label: formatDayShort(key) });
    }
    rows.push(item);
  });
  return rows;
};
