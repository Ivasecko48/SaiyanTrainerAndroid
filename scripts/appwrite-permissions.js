'use strict';
// Zaštita podataka u Appwriteu: vježbe i obroci vidljivi su samo svom vlasniku.
// Provjerava (a s --fix i ispravlja):
//  1) dozvole svakog dokumenta: read/update/delete samo za korisnika iz polja user_id
//  2) postavke kolekcija: "Users" smije samo stvarati dokumente i uključen je
//     "Document security" (tada vrijede dozvole pojedinog dokumenta)
// Pokretanje iz korijena projekta:
//   node scripts/appwrite-permissions.js        samo provjera, ništa ne mijenja
//   node scripts/appwrite-permissions.js --fix  ispravi dokumente pa kolekcije
// Treba API ključ (Appwrite konzola -> Overview -> API keys) sa scopeovima
// collections.read, collections.write, documents.read i documents.write, upisan u .env
// kao APPWRITE_API_KEY=... (.env nije u gitu). Nakon toga ključ možeš obrisati u konzoli.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const env = {};
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const ENDPOINT = (env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/$/, '');
const PROJECT = env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const DB = env.EXPO_PUBLIC_APPWRITE_DB_ID;
const KEY = process.env.APPWRITE_API_KEY || env.APPWRITE_API_KEY;
const COLLECTIONS = [
  ['vježbe', env.EXPO_PUBLIC_APPWRITE_COL_EXERCISES_ID],
  ['obroci', env.EXPO_PUBLIC_APPWRITE_COL_MEALS_ID],
];
const FIX = process.argv.includes('--fix');
const PAGE = 100;

async function api(method, route, body) {
  const res = await fetch(ENDPOINT + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT,
      'X-Appwrite-Key': KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const error = new Error(data.message || res.statusText);
    error.code = res.status;
    throw error;
  }
  return data;
}

const ownerOnly = (userId) => [`read("user:${userId}")`, `update("user:${userId}")`, `delete("user:${userId}")`];
const COLLECTION_PERMISSIONS = ['create("users")'];
const sameSet = (a, b) => a.length === b.length && a.every((p) => b.includes(p));

async function* allDocuments(colId) {
  let cursor = null;
  for (;;) {
    const queries = [JSON.stringify({ method: 'limit', values: [PAGE] })];
    if (cursor) queries.push(JSON.stringify({ method: 'cursorAfter', values: [cursor] }));
    const qs = queries.map((q) => `queries[]=${encodeURIComponent(q)}`).join('&');
    const page = await api('GET', `/databases/${DB}/collections/${colId}/documents?${qs}`);
    for (const doc of page.documents) yield doc;
    if (page.documents.length < PAGE) return;
    cursor = page.documents[page.documents.length - 1].$id;
  }
}

async function checkDocuments(label, colId) {
  let total = 0;
  let wrong = 0;
  let fixed = 0;
  let noOwner = 0;
  for await (const doc of allDocuments(colId)) {
    total++;
    if (!doc.user_id) {
      noOwner++;
      console.log(`  ! ${label} ${doc.$id} nema user_id, preskačem`);
      continue;
    }
    const want = ownerOnly(doc.user_id);
    if (sameSet(doc.$permissions || [], want)) continue;
    wrong++;
    if (FIX) {
      await api('PATCH', `/databases/${DB}/collections/${colId}/documents/${doc.$id}`, { permissions: want });
      fixed++;
    }
  }
  console.log(`  ${label}: ${total} dokumenata, krive dozvole: ${wrong}${FIX ? `, ispravljeno: ${fixed}` : ''}${noOwner ? `, bez vlasnika: ${noOwner}` : ''}`);
  return wrong - fixed;
}

async function checkCollection(label, colId) {
  const col = await api('GET', `/databases/${DB}/collections/${colId}`);
  const ok = col.documentSecurity && sameSet(col.$permissions || [], COLLECTION_PERMISSIONS);
  console.log(`  ${label}: Document security ${col.documentSecurity ? 'uključen' : 'ISKLJUČEN'}, dozvole kolekcije: ${JSON.stringify(col.$permissions)}`);
  if (ok) return 0;
  if (!FIX) return 1;
  await api('PUT', `/databases/${DB}/collections/${colId}`, {
    name: col.name,
    permissions: COLLECTION_PERMISSIONS,
    documentSecurity: true,
    enabled: col.enabled,
  });
  console.log(`  ${label}: postavljeno -> Document security uključen, Users smije samo stvarati`);
  return 0;
}

async function main() {
  if (!ENDPOINT || !PROJECT || !DB || COLLECTIONS.some(([, id]) => !id)) {
    console.error('U .env nedostaju EXPO_PUBLIC_APPWRITE_* vrijednosti.');
    process.exit(1);
  }
  if (!KEY) {
    console.error('Nema API ključa. U Appwrite konzoli napravi ključ (scopeovi collections.read,');
    console.error('collections.write, documents.read, documents.write) i dodaj u .env redak:');
    console.error('APPWRITE_API_KEY=tvoj_ključ');
    process.exit(1);
  }

  console.log(FIX ? 'Ispravljam dozvole...' : 'Samo provjera (za ispravak pokreni s --fix)...');
  let problems = 0;
  try {
    console.log('Dokumenti:');
    for (const [label, id] of COLLECTIONS) problems += await checkDocuments(label, id);
    // kolekcije tek nakon dokumenata, da nitko ni na trenutak ne izgubi svoje podatke
    console.log('Kolekcije:');
    for (const [label, id] of COLLECTIONS) problems += await checkCollection(label, id);
  } catch (error) {
    console.error(`Greška (${error.code || '?'}): ${error.message}`);
    if (error.code === 401) console.error('Provjeri da API ključ ima sva četiri scopea.');
    process.exit(1);
  }
  console.log(problems ? `\nZa ispravljanje: node scripts/appwrite-permissions.js --fix` : '\nSve je zaštićeno.');
}

main();
