import { ID } from 'react-native-appwrite';
import { account } from './appwrite';

// Razumljive poruke za greške kod potvrde emaila kodom
const codeError = (error, fallback) => {
  if (error?.code === 429) {
    return 'Previše pokušaja. Pričekaj malo pa pokušaj ponovno.';
  }
  if (error?.type === 'user_invalid_token') {
    return 'Kod nije točan ili je istekao. Provjeri ga ili pošalji novi.';
  }
  if (error?.type === 'user_auth_method_unsupported') {
    return 'Potvrda emaila nije uključena u Appwriteu (Auth → Settings → Email OTP).';
  }
  return error?.message || fallback;
};

const authService = {
  // Register a user (username se sprema kao ime korisnika)
  async register(email, password, username) {
    try {
      const response = await account.create(ID.unique(), email, password, username);
      return response;
    } catch (error) {
      return {
        error: error.message || 'Registration failed. Try again',
      };
    }
  },
  // Login
  async login(email, password) {
    try {
      const response = await account.createEmailPasswordSession(
        email,
        password
      );
      return response;
    } catch (error) {
      return {
        error: error.message || 'Login failed. Try again',
      };
    }
  },
  // Get logged in user
  async getUser() {
    try {
      return await account.get();
    } catch (error) {
      return null;
    }
  },

  // Postavi username (ime korisnika) za račun koji ga još nema. Vraća ažuriranog korisnika.
  async updateName(name) {
    try {
      return await account.updateName(name);
    } catch (error) {
      return {
        error: error.message || 'Saving username failed. Try again',
      };
    }
  },

  // Spremi korisničke postavke (profil). Appwrite zamijeni cijeli objekt,
  // pa pozivatelj šalje i postojeće postavke. Vraća ažuriranog korisnika.
  async updatePrefs(prefs) {
    try {
      return await account.updatePrefs(prefs);
    } catch (error) {
      return {
        error: error.message || 'Saving profile failed. Try again',
      };
    }
  },

  // Logout user
  async logout() {
    try {
      await account.deleteSession('current');
    } catch (error) {
      return {
        error: error.message || 'Logout failed. Try again',
      };
    }
  },

  // Kratkotrajni token koji Appwrite funkciji dokazuje tko je prijavljen
  async createJWT() {
    try {
      return await account.createJWT();
    } catch (error) {
      return { error: error.message || 'Prijava nije uspjela. Pokušaj ponovno.' };
    }
  },

  // Pošalji kod od 6 znamenki na email (Appwrite Email OTP). Radi bez prijave.
  async sendEmailCode(userId, email) {
    try {
      return await account.createEmailToken(userId, email);
    } catch (error) {
      return { error: codeError(error, 'Slanje koda nije uspjelo. Pokušaj ponovno.') };
    }
  },

  // Prijava kodom iz maila. Appwrite tad sam označi email kao potvrđen.
  async loginWithCode(userId, code) {
    try {
      return await account.createSession(userId, code);
    } catch (error) {
      // Appwrite ne da novu prijavu dok je stara aktivna: makni zaostalu i pokušaj ponovno
      if (error?.type === 'user_session_already_exists') {
        try {
          await account.deleteSession('current');
          return await account.createSession(userId, code);
        } catch (retryError) {
          return { error: codeError(retryError, 'Potvrda nije uspjela. Pokušaj ponovno.') };
        }
      }
      return { error: codeError(error, 'Potvrda nije uspjela. Pokušaj ponovno.') };
    }
  },
};

export default authService;
