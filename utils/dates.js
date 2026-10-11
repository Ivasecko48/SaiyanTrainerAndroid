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
