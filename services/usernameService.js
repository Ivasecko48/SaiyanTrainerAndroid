import { config, functions } from './appwrite';

// Username: 3-20 znakova, mala slova, brojke, _ i . (sprema se kao ime Appwrite korisnika)
export const USERNAME_RULE = /^[a-z0-9_.]{3,20}$/;
export const USERNAME_HINT = '3-20 znakova: mala slova, brojke, _ i .';

export const normalizeUsername = (text) => String(text || '').trim().toLowerCase();

// Poziva Appwrite Function username-lookup; vraća { data } ili { error }
const callFunction = async (action, params) => {
  if (!config.fn.username) {
    return { error: 'Prijava korisničkim imenom još nije postavljena.' };
  }

  try {
    const execution = await functions.createExecution(
      config.fn.username,
      JSON.stringify({ action, ...params }),
      false,
      '/',
      'POST',
      { 'content-type': 'application/json' }
    );

    let data = {};
    try {
      data = JSON.parse(execution.responseBody || '{}');
    } catch {
      // prazan ili neispravan odgovor obrađuje se ispod preko statusa
    }

    if (execution.responseStatusCode >= 400 || data.error) {
      return { error: data.error || `Greška na serveru (${execution.responseStatusCode})` };
    }
    return { data };
  } catch (error) {
    return { error: error.message || 'Provjera korisničkog imena nije uspjela' };
  }
};

const usernameService = {
  // { available } ili { error }
  async isAvailable(username) {
    const response = await callFunction('check', { username });
    return response.error ? response : { available: Boolean(response.data.available) };
  },

  // { email } ili { error }
  async emailFor(username) {
    const response = await callFunction('lookup', { username });
    return response.error ? response : { email: response.data.email };
  },

  // Pretraga drugih Saiyana po početku imena: { users: [{ id, username, avatar, activity }] }
  async search(query) {
    const response = await callFunction('search', { query: normalizeUsername(query) });
    return response.error ? response : { users: response.data.users || [] };
  },

  // Javna kartica i statistika korisnika: { user, week, totalWorkouts }
  async stats(userId) {
    const response = await callFunction('stats', { userId });
    return response.error ? response : response.data;
  },

  // Zaboravljena lozinka: račun po emailu ili usernameu -> { userId, email } ili { error }
  async resetCheck(identifier) {
    const response = await callFunction('reset-check', { identifier: String(identifier || '').trim() });
    return response.error ? response : { userId: response.data.userId, email: response.data.email };
  },

  // Nova lozinka za prijavljenog korisnika (jwt dokazuje tko je prijavljen) -> { ok } ili { error }
  async setPassword(jwt, password) {
    const response = await callFunction('set-password', { jwt, password });
    return response.error ? response : { ok: true };
  },
};

export default usernameService;
