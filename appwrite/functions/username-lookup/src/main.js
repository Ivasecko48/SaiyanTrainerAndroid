import { Client, Users, Query } from 'node-appwrite';

// Appwrite Function za prijavu korisničkim imenom.
// Username se sprema kao "name" Appwrite korisnika (mala slova, 3-20 znakova).
//
// Zahtjev (POST, JSON):
//   { "action": "check",  "username": "goku" }  -> { "available": true | false }
//   { "action": "lookup", "username": "goku" }  -> { "email": "..." } ili 404
//
// Postavke funkcije u Appwrite konzoli:
//   - Execute access: Any (poziva se prije prijave)
//   - Scopes: users.read (dinamički API ključ stiže u zaglavlju x-appwrite-key)

const USERNAME = /^[a-z0-9_.]{3,20}$/;

const readBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const text = req.bodyText ?? req.bodyRaw ?? (typeof req.body === 'string' ? req.body : '');
  return text ? JSON.parse(text) : {};
};

export default async ({ req, res, error }) => {
  let body;
  try {
    body = readBody(req);
  } catch {
    return res.json({ error: 'Neispravan zahtjev' }, 400);
  }

  const username = String(body.username || '').trim().toLowerCase();
  if (!USERNAME.test(username)) {
    return res.json({ error: 'Neispravan username' }, 400);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const users = new Users(client);

  let found;
  try {
    found = await users.list({ queries: [Query.equal('name', username), Query.limit(2)] });
  } catch (err) {
    error(`users.list nije uspio: ${err.message}`);
    return res.json({ error: 'Greška na serveru' }, 500);
  }

  if (body.action === 'check') {
    return res.json({ available: found.total === 0 });
  }

  if (body.action === 'lookup') {
    if (found.total !== 1) {
      return res.json({ error: 'Korisnik s tim imenom ne postoji' }, 404);
    }
    return res.json({ email: found.users[0].email });
  }

  return res.json({ error: 'Nepoznata akcija' }, 400);
};
