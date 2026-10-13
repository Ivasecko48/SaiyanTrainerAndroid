import { config, functions } from './appwrite';

// Username: 3-20 znakova, mala slova, brojke, _ i . (sprema se kao ime Appwrite korisnika)
export const USERNAME_RULE = /^[a-z0-9_.]{3,20}$/;
export const USERNAME_HINT = '3-20 znakova: mala slova, brojke, _ i .';

export const normalizeUsername = (text) => String(text || '').trim().toLowerCase();

// Poziva Appwrite Function username-lookup; vraća { data } ili { error }
const callFunction = async (action, username) => {
  if (!config.fn.username) {
    return { error: 'Prijava korisničkim imenom još nije postavljena.' };
  }

  try {
    const execution = await functions.createExecution(
      config.fn.username,
      JSON.stringify({ action, username }),
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
    const response = await callFunction('check', username);
    return response.error ? response : { available: Boolean(response.data.available) };
  },

  // { email } ili { error }
  async emailFor(username) {
    const response = await callFunction('lookup', username);
    return response.error ? response : { email: response.data.email };
  },
};

export default usernameService;
