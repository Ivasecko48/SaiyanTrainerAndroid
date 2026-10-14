import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import usernameService, {
  USERNAME_RULE,
  USERNAME_HINT,
  normalizeUsername,
} from '../services/usernameService';

const AuthContext = createContext();

// Računi registrirani uz potvrdu emaila imaju oznaku mustVerifyEmail i ne mogu ući
// dok ne upišu kod iz maila. Stari računi nemaju oznaku, pa za njih potvrda ne vrijedi.
const needsEmailCheck = (user) =>
  user?.prefs?.mustVerifyEmail === true && !user.emailVerification;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    setLoading(true);
    const response = await authService.getUser();

    if (!response || response.error) {
      setUser(null);
    } else if (needsEmailCheck(response)) {
      // Ostala je prijava bez potvrđenog emaila (npr. aplikacija ugašena usred
      // prijave): odjava, a kod sljedeće prijave aplikacija opet traži kod
      await authService.logout();
      setUser(null);
    } else {
      setUser(response);
    }

    setLoading(false);
  };

  // Pošalji kod na email i javi ekranu za prijavu da ga traži od korisnika.
  // Ekran s kodom se prikaže i kad slanje ne uspije (s greškom i "Pošalji kod").
  const startEmailCheck = async (userId, email) => {
    const sent = await authService.sendEmailCode(userId, email);
    return { needsCode: true, userId, email, codeError: sent?.error };
  };

  // Prijava e-mailom ili korisničkim imenom. Za username se e-mail dohvaća
  // preko Appwrite Functiona, jer Appwrite prijavu podržava samo e-mailom.
  const login = async (identifier, password) => {
    let email = String(identifier || '').trim();

    if (!email.includes('@')) {
      const username = normalizeUsername(email);
      if (!USERNAME_RULE.test(username)) {
        return { error: 'Upiši email ili ispravan Saiyan name' };
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

    const current = await authService.getUser();
    if (!current) {
      return { error: 'Prijava nije uspjela. Pokušaj ponovno.' };
    }

    if (needsEmailCheck(current)) {
      // Appwrite ne da prijavu kodom dok je ova prijava aktivna
      await authService.logout();
      return startEmailCheck(current.$id, current.email);
    }

    setUser(current);
    return { success: true };
  };

  // Provjera usernamea prije registracije ili naknadnog postavljanja
  const checkUsername = async (username) => {
    if (!USERNAME_RULE.test(username)) {
      return { error: `Saiyan name: ${USERNAME_HINT}` };
    }
    const check = await usernameService.isAvailable(username);
    if (check.error) {
      return check;
    }
    if (!check.available) {
      return { error: 'Taj Saiyan name je već zauzet' };
    }
    return { success: true };
  };

  const register = async (email, password, usernameInput) => {
    const username = normalizeUsername(usernameInput);
    const check = await checkUsername(username);
    if (check.error) {
      return check;
    }

    const created = await authService.register(email, password, username);

    if (created?.error) {
      return created;
    }

    // Novi račun mora potvrditi email kodom. Oznaka se sprema u postavke računa
    // (vrijedi na svakom mobitelu), zajedno s vodičem kroz aplikaciju koji čeka
    // (TourContext). Za spremanje treba kratka prijava lozinkom.
    const session = await authService.login(email, password);
    if (!session?.error) {
      await authService.updatePrefs({ mustVerifyEmail: true, tourPending: true });
      // Appwrite ne da prijavu kodom dok je ova prijava aktivna
      await authService.logout();
    }

    return startEmailCheck(created.$id, created.email || email);
  };

  // Kod iz maila: prijava kodom, nakon koje je email potvrđen
  const verifyEmailCode = async (userId, code) => {
    const response = await authService.loginWithCode(userId, code);
    if (response?.error) {
      return response;
    }
    return finishCodeLogin();
  };

  // Zaboravljena lozinka, 1. korak: pronađi račun (email ili Saiyan name) i pošalji kod
  const startPasswordReset = async (identifier) => {
    const found = await usernameService.resetCheck(identifier);
    if (found.error) {
      return found;
    }
    const sent = await authService.sendEmailCode(found.userId, found.email);
    if (sent?.error) {
      return sent;
    }
    return { needsCode: true, userId: found.userId, email: found.email };
  };

  // 2. korak: prijava kodom (dokaz da je email tvoj), pa nova lozinka preko Appwrite funkcije.
  // Ako lozinka ne prođe, korisnik je ipak prijavljen (passwordError).
  const finishPasswordReset = async (userId, code, password) => {
    const response = await authService.loginWithCode(userId, code);
    if (response?.error) {
      return response;
    }
    const jwt = await authService.createJWT();
    const changed = jwt?.error ? jwt : await usernameService.setPassword(jwt.jwt, password);
    const done = await finishCodeLogin();
    if (done.error) {
      return done;
    }
    return changed?.error ? { success: true, passwordError: changed.error } : { success: true };
  };

  // Zajednički kraj prijave kodom: korisnik u aplikaciju, oznaka za potvrdu emaila više ne treba
  const finishCodeLogin = async () => {
    let current = await authService.getUser();
    if (!current) {
      return { error: 'Prijava nije uspjela. Pokušaj ponovno.' };
    }

    // Email je potvrđen kodom, pa oznaka više ne treba
    if (current.prefs?.mustVerifyEmail) {
      const { mustVerifyEmail, ...prefs } = current.prefs;
      const updated = await authService.updatePrefs(prefs);
      if (!updated?.error) current = updated;
    }

    setUser(current);
    return { success: true };
  };

  const resendEmailCode = (userId, email) => authService.sendEmailCode(userId, email);

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
        verifyEmailCode,
        resendEmailCode,
        startPasswordReset,
        finishPasswordReset,
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
