import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

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

  const login = async (email, password) => {
    const response = await authService.login(email, password);

    if (response?.error) {
      return response;
    }

    await checkUser();
    return { success: true };
  };

  const register = async (email, password) => {
    const response = await authService.register(email, password);

    if (response?.error) {
      return response;
    }
    return login(email, password); // Auto-login
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

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateProfile,
        updateAvatar,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
