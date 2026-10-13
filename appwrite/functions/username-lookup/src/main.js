import { Client, Users, Databases, Query } from 'node-appwrite';

// Appwrite Function za prijavu korisničkim imenom i pretragu drugih Saiyana.
// Username se sprema kao "name" Appwrite korisnika (mala slova, 3-20 znakova).
//
// Zahtjev (POST, JSON):
//   { "action": "check",  "username": "goku" }  -> { "available": true | false }
//   { "action": "lookup", "username": "goku" }  -> { "email": "..." } ili 404
//   { "action": "search", "query": "go" }       -> { "users": [{ id, username, avatar }] }
//   { "action": "stats",  "userId": "..." }     -> { user: {...}, week: {...}, totalWorkouts }
//
// Pretraga i statistika vraćaju samo javne podatke (username, avatar, razina aktivnosti,
// zbirna statistika). Korisnici s prefs.searchHidden = true ne pojavljuju se.
//
// Postavke funkcije u Appwrite konzoli:
//   - Execute access: Any (poziva se i prije prijave)
//   - Scopes: users.read + documents.read (listDocuments; samo rows.read nije dovoljan)
//   - Varijable: SAIYAN_DB_ID i SAIYAN_COL_EXERCISES_ID (ID baze i kolekcije vježbi)

const USERNAME = /^[a-z0-9_.]{3,20}$/;
const SEARCH = /^[a-z0-9_.]{2,20}$/;
const PAGE_SIZE = 100;

const readBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const text = req.bodyText ?? req.bodyRaw ?? (typeof req.body === 'string' ? req.body : '');
  return text ? JSON.parse(text) : {};
};

// Javni podaci korisnika (nikad e-mail)
const publicUser = (user) => ({
  id: user.$id,
  username: user.name,
  avatar: user.prefs?.avatar ?? null,
  activity: user.prefs?.profile?.activity ?? null,
});

const isVisible = (user) => Boolean(user.name) && user.prefs?.searchHidden !== true;

// 'YYYY-MM-DD' (UTC), isto kao dateKey u aplikaciji
const dayKey = (iso) => new Date(iso).toISOString().split('T')[0];

// Tekući tjedan od ponedjeljka do nedjelje (UTC)
const currentWeek = () => {
  const now = new Date();
  const sinceMonday = (now.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - sinceMonday));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: dayKey(start.toISOString()), end: dayKey(end.toISOString()) };
};

const volumeOf = (ex) => (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0);

const listAllExercises = async (databases, userId) => {
  const all = [];
  let cursor = null;
  while (true) {
    const queries = [Query.equal('user_id', userId), Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await databases.listDocuments({
      databaseId: process.env.SAIYAN_DB_ID,
      collectionId: process.env.SAIYAN_COL_EXERCISES_ID,
      queries,
    });
    all.push(...page.documents);
    if (page.documents.length < PAGE_SIZE) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }
  return all;
};

export default async ({ req, res, error }) => {
  let body;
  try {
    body = readBody(req);
  } catch {
    return res.json({ error: 'Neispravan zahtjev' }, 400);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const users = new Users(client);

  try {
    if (body.action === 'check' || body.action === 'lookup') {
      const username = String(body.username || '').trim().toLowerCase();
      if (!USERNAME.test(username)) {
        return res.json({ error: 'Neispravan username' }, 400);
      }
      const found = await users.list({ queries: [Query.equal('name', username), Query.limit(2)] });

      if (body.action === 'check') {
        return res.json({ available: found.total === 0 });
      }
      if (found.total !== 1) {
        return res.json({ error: 'Korisnik s tim imenom ne postoji' }, 404);
      }
      return res.json({ email: found.users[0].email });
    }

    if (body.action === 'search') {
      const query = String(body.query || '').trim().toLowerCase();
      if (!SEARCH.test(query)) {
        return res.json({ users: [] });
      }
      const found = await users.list({
        queries: [Query.startsWith('name', query), Query.limit(25)],
      });
      return res.json({ users: found.users.filter(isVisible).slice(0, 20).map(publicUser) });
    }

    if (body.action === 'stats') {
      const userId = String(body.userId || '');
      if (!userId) {
        return res.json({ error: 'Nedostaje korisnik' }, 400);
      }

      let user;
      try {
        user = await users.get({ userId });
      } catch {
        return res.json({ error: 'Korisnik ne postoji' }, 404);
      }
      if (!isVisible(user)) {
        return res.json({ error: 'Korisnik ne postoji' }, 404);
      }

      const exercises = await listAllExercises(new Databases(client), userId);
      const week = currentWeek();
      const thisWeek = exercises.filter((ex) => {
        const key = dayKey(ex.createdAt);
        return key >= week.start && key <= week.end;
      });

      return res.json({
        user: publicUser(user),
        week: {
          start: week.start,
          end: week.end,
          workouts: new Set(thisWeek.map((ex) => dayKey(ex.createdAt))).size,
          exercises: thisWeek.length,
          volume: Math.round(thisWeek.reduce((sum, ex) => sum + volumeOf(ex), 0)),
          muscles: [...new Set(thisWeek.flatMap((ex) => ex.muscles || []))],
        },
        totalWorkouts: new Set(exercises.map((ex) => dayKey(ex.createdAt))).size,
      });
    }
  } catch (err) {
    error(`${body.action} nije uspio: ${err.message}`);
    return res.json({ error: 'Greška na serveru' }, 500);
  }

  return res.json({ error: 'Nepoznata akcija' }, 400);
};
