import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { USERNAME_HINT } from '@/services/usernameService';
import { checkPassword, isStrongPassword } from '@/utils/password';
import loginBackground from '@/assets/images/auth/login_shenron.jpg';
import signupBackground from '@/assets/images/auth/signup_arena.jpg';

// Koliko sekundi treba pričekati prije ponovnog slanja koda
const RESEND_SECONDS = 30;
const CODE_LENGTH = 6;

// Prijava: noć u kojoj se Shenron diže iz zmajevih kugli (tamno staklo, zeleno i zlatno)
const NIGHT = {
  card: { backgroundColor: 'rgba(4, 20, 24, 0.82)', borderColor: 'rgba(110, 230, 150, 0.3)' },
  title: '#ffe9a6',
  text: '#cfe6dc',
  hint: '#9db8ac',
  input: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.24)', color: '#ffffff' },
  placeholder: 'rgba(255, 255, 255, 0.5)',
  button: '#22a35a',
  link: '#ffd76a',
  muted: '#9db8ac',
  ruleOk: '#5fe08f',
  error: '#ff8a80',
  info: '#7ee2a8',
};

// Registracija: dan na areni Turnira svjetskih borilačkih vještina (svijetlo staklo, plavo)
const DAY = {
  card: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(255, 255, 255, 0.95)' },
  title: '#1b2a4a',
  text: '#4a5568',
  hint: '#6b7280',
  input: { backgroundColor: '#ffffff', borderColor: '#d3d9e4', color: '#333333' },
  placeholder: '#9aa3b2',
  button: '#2457c5',
  link: '#2457c5',
  muted: '#7b8494',
  ruleOk: '#2e9e4f',
  error: '#d93025',
  info: '#2e9e4f',
};

const AuthScreen = () => {
  const { login, register, verifyEmailCode, resendEmailCode } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Kod prijave: email ili Saiyan name; kod registracije: email
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  // Potvrda emaila: račun koji čeka kod ({ userId, email }), upisani kod i odbrojavanje
  const [pending, setPending] = useState(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [info, setInfo] = useState(false);
  // Pozadina registracije lagano prekrije pozadinu prijave
  const arena = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    Animated.timing(arena, {
      toValue: isRegistering ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [isRegistering]);

  const theme = isRegistering ? DAY : NIGHT;
  const inputStyle = [styles.input, theme.input];

  const switchMode = () => {
    setError(false);
    setIsRegistering(!isRegistering);
  };

  const handleAuth = async () => {
    if (isRegistering && !username.trim()) {
      setError('Upiši Saiyan name');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError(isRegistering ? 'Upiši email i lozinku' : 'Upiši email ili Saiyan name i lozinku');
      return;
    }

    if (isRegistering && !email.includes('@')) {
      setError('Upiši ispravan email');
      return;
    }

    // Pravila lozinke vrijede samo za nove račune; stare lozinke i dalje rade za prijavu
    if (isRegistering && !isStrongPassword(password)) {
      setError('Lozinka ne ispunjava sva pravila');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError('Lozinke se ne podudaraju');
      return;
    }

    setError(false);
    setBusy(true);
    const response = isRegistering
      ? await register(email.trim(), password, username)
      : await login(email, password);
    setBusy(false);

    // Novi račun: prije ulaska treba upisati kod koji je stigao na email
    if (response?.needsCode) {
      setPending({ userId: response.userId, email: response.email, sent: !response.codeError });
      setCode('');
      setInfo(false);
      setError(response.codeError || false);
      setCooldown(response.codeError ? 0 : RESEND_SECONDS);
      return;
    }

    if (response?.error) {
      Alert.alert('Greška', response.error);
      return;
    }

    router.replace('../(screens)/trainingScreen');
  };

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) {
      setError(`Upiši svih ${CODE_LENGTH} znamenki`);
      return;
    }

    setError(false);
    setInfo(false);
    setBusy(true);
    const response = await verifyEmailCode(pending.userId, code);
    setBusy(false);

    if (response?.error) {
      setError(response.error);
      return;
    }

    router.replace('../(screens)/trainingScreen');
  };

  const handleResend = async () => {
    setError(false);
    setInfo(false);
    setBusy(true);
    const response = await resendEmailCode(pending.userId, pending.email);
    setBusy(false);

    if (response?.error) {
      setError(response.error);
      return;
    }

    setCode('');
    setInfo(pending.sent ? 'Novi kod je poslan.' : 'Kod je poslan.');
    setPending((current) => ({ ...current, sent: true }));
    setCooldown(RESEND_SECONDS);
  };

  // Račun ostaje nepotvrđen; kod sljedeće prijave aplikacija opet pošalje kod
  const handleBack = () => {
    setPending(null);
    setCode('');
    setError(false);
    setInfo(false);
    setIsRegistering(false);
  };

  const messages = (
    <>
      {error ? <Text style={[styles.message, { color: theme.error }]}>{error}</Text> : null}
      {info ? <Text style={[styles.message, styles.info, { color: theme.info }]}>{info}</Text> : null}
    </>
  );

  const button = (label, onPress, dimmed) => (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.button }, dimmed && styles.buttonDimmed]}
      onPress={onPress}
      disabled={busy}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </TouchableOpacity>
  );

  const codeStep = pending && (
    <>
      <Text style={[styles.title, { color: theme.title }]}>Potvrdi email</Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        {pending.sent ? 'Poslali smo' : 'Šaljemo'} kod od {CODE_LENGTH} znamenki na{'\n'}
        <Text style={[styles.codeEmail, { color: theme.title }]}>{pending.email}</Text>
      </Text>

      {messages}

      <TextInput
        style={[inputStyle, styles.codeInput]}
        placeholder="000000"
        placeholderTextColor={theme.placeholder}
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        autoFocus
      />
      <Text style={[styles.centerHint, { color: theme.hint }]}>
        Kod vrijedi 15 minuta. Ako mail ne stigne, provjeri i spam.
      </Text>

      {button('Potvrdi', handleVerify, code.length !== CODE_LENGTH)}

      <TouchableOpacity onPress={handleResend} disabled={busy || cooldown > 0}>
        <Text style={[styles.link, { color: cooldown > 0 ? theme.muted : theme.link }]}>
          {pending.sent ? 'Pošalji novi kod' : 'Pošalji kod'}
          {cooldown > 0 ? ` (${cooldown} s)` : ''}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleBack} disabled={busy}>
        <Text style={[styles.backLink, { color: theme.muted }]}>Natrag na prijavu</Text>
      </TouchableOpacity>
    </>
  );

  const form = !pending && (
    <>
      <Text style={[styles.title, { color: theme.title }]}>
        {isRegistering ? 'Registracija' : 'Prijava'}
      </Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        {isRegistering
          ? 'Upiši se na Turnir svjetskih borilačkih vještina!'
          : 'Shenron čeka tvoju želju.'}
      </Text>

      {messages}

      {isRegistering && (
        <>
          <TextInput
            style={inputStyle}
            placeholder="Saiyan name"
            placeholderTextColor={theme.placeholder}
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <Text style={[styles.hint, { color: theme.hint }]}>{USERNAME_HINT}</Text>
        </>
      )}

      <TextInput
        style={inputStyle}
        placeholder={isRegistering ? 'Email' : 'Email ili Saiyan name'}
        placeholderTextColor={theme.placeholder}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      <TextInput
        style={inputStyle}
        placeholder="Lozinka"
        placeholderTextColor={theme.placeholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {isRegistering && (
        <>
          <View style={styles.rules}>
            {checkPassword(password).map((rule) => (
              <Text
                key={rule.id}
                style={[styles.rule, { color: rule.ok ? theme.ruleOk : theme.hint }, rule.ok && styles.ruleOk]}
              >
                {rule.ok ? '✓' : '•'} {rule.label}
              </Text>
            ))}
          </View>
          <TextInput
            style={inputStyle}
            placeholder="Potvrdi lozinku"
            placeholderTextColor={theme.placeholder}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="none"
          />
        </>
      )}

      {button(isRegistering ? 'Registriraj se' : 'Prijavi se', handleAuth)}

      <TouchableOpacity onPress={switchMode} disabled={busy}>
        <Text style={[styles.link, { color: theme.link }]}>
          {isRegistering ? 'Već imaš račun? Prijavi se' : 'Nemaš račun? Registriraj se'}
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.screen}>
      {/* svijetle ikone na noćnom nebu, tamne na dnevnom */}
      <StatusBar style={isRegistering ? 'dark' : 'light'} />
      <Image source={loginBackground} style={styles.background} resizeMode="cover" />
      <Animated.Image
        source={signupBackground}
        style={[styles.background, { opacity: arena }]}
        resizeMode="cover"
      />

      {/* edge-to-edge: prozor se ne smanji kad se otvori tipkovnica, pa se mjesto radi ovdje */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, theme.card]}>{pending ? codeStep : form}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#04141a',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 4,
    marginBottom: 18,
  },
  codeEmail: {
    fontWeight: 'bold',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 10,
  },
  info: {
    fontWeight: '600',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 10,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 12,
  },
  centerHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 8,
  },
  rules: {
    marginTop: -4,
    marginBottom: 12,
  },
  rule: {
    fontSize: 13,
    marginBottom: 2,
  },
  ruleOk: {
    fontWeight: '600',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDimmed: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  backLink: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AuthScreen;
