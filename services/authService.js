import { ID } from 'react-native-appwrite';
import { account } from './appwrite';

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
};

export default authService;
