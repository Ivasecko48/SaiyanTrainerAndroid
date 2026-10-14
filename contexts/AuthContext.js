import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import usernameService, {
  USERNAME_RULE,
  USERNAME_HINT,
  normalizeUsername,
} from '../services/usernameService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    setLoading(true);
    const response = await authService.getUser();

    if (response?.error) {
      setUser(null);
    } else {
      setUser(response);
    }

    setLoading(false);
  };

  // Prijava e-mailom ili korisničkim imenom. Za username se e-mail dohvaća
  // preko Appwrite Functiona, jer Appwrite prijavu podržava samo e-mailom.
  const login = async (identifier, password) => {
    let email = String(identifier || '').trim();

    if (!email.includes('@')) {
      const username = normalizeUsername(email);
      if (!USERNAME_RULE.test(username)) {
        return { error: 'Upiši e-mail ili ispravan username' };
      }
      const lookup = await usernameService.emailFor(username);
      if (lookup.error) {
        return lookup;
      }
      email = lookup.email;
    }

    const response = await authService.login(email, password);

    if (response?.error) {
      return response;
    }

    await checkUser();
    return { success: true };
  };

  // Provjera usernamea prije registracije ili naknadnog postavljanja
  const checkUsername = async (username) => {
    if (!USERNAME_RULE.test(username)) {
      return { error: `Username: ${USERNAME_HINT}` };
    }
    const check = await usernameService.isAvailable(username);
    if (check.error) {
      return check;
    }
    if (!check.available) {
      return { error: 'Taj username je već zauzet' };
    }
    return { success: true };
  };

  const register = async (email, password, usernameInput) => {
    const username = normalizeUsername(usernameInput);
    const check = await checkUsername(username);
    if (check.error) {
      return check;
    }

    const response = await authService.register(email, password, username);

    if (response?.error) {
      return response;
    }

    const result = await login(email, password); // Auto-login
    if (result.success) {
      // Novi korisnik: nakon prijave kreće vodič kroz aplikaciju (TourContext)
      const updated = await authService.updatePrefs({ tourPending: true });
      if (!updated?.error) setUser(updated);
    }
    return result;
  };

  // Računi napravljeni prije uvođenja usernamea mogu ga postaviti jednom (na Profilu)
  const setUsername = async (usernameInput) => {
    const username = normalizeUsername(usernameInput);
    const check = await checkUsername(username);
    if (check.error) {
      return check;
    }

    const response = await authService.updateName(username);
    if (response?.error) {
      return response;
    }

    setUser(response);
    return { success: true };
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    await checkUser();
  };

  // Profil (visina, težina, cilj...) i avatar se čuvaju u Appwrite postavkama korisnika.
  // Appwrite zamijeni cijele postavke, pa se promjene spajaju s postojećima.
  const savePrefs = async (changes) => {
    const response = await authService.updatePrefs({
      ...(user?.prefs || {}),
      ...changes,
    });

    if (response?.error) {
      return response;
    }

    setUser(response);
    return { success: true };
  };

  const updateProfile = (profile) => savePrefs({ profile });
  const updateAvatar = (avatar) => savePrefs({ avatar });
  // Tko se sakrije, ne pojavljuje se drugima u pretrazi Saiyana
  const updateSearchVisible = (visible) => savePrefs({ searchHidden: !visible });
  // Vodič kroz aplikaciju čeka na pokretanje (samo novi korisnici)
  const setTourPending = (pending) => savePrefs({ tourPending: pending });

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        setUsername,
        logout,
        updateProfile,
        updateAvatar,
        updateSearchVisible,
        setTourPending,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
