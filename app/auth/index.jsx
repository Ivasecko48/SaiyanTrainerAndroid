import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { USERNAME_HINT } from '@/services/usernameService';
import { checkPassword, isStrongPassword } from '@/utils/password';

// Koliko sekundi treba pričekati prije ponovnog slanja koda
const RESEND_SECONDS = 30;
const CODE_LENGTH = 6;

const AuthScreen = () => {
  const { login, register, verifyEmailCode, resendEmailCode } = useAuth();
  const router = useRouter();
  // Kod prijave: e-mail ili username; kod registracije: e-mail
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

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError(
        isRegistering
          ? 'Email and password are required'
          : 'Email/username and password are required'
      );
      return;
    }

    if (isRegistering && !email.includes('@')) {
      setError('Enter a valid email');
      return;
    }

    if (isRegistering && !username.trim()) {
      setError('Username is required');
      return;
    }

    // Pravila lozinke vrijede samo za nove račune; stare lozinke i dalje rade za prijavu
    if (isRegistering && !isStrongPassword(password)) {
      setError('Lozinka ne ispunjava sva pravila');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError('Passwords do not match');
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
      Alert.alert('Error', response.error);
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

  if (pending) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Potvrdi email</Text>
        <Text style={styles.codeText}>
          {pending.sent ? 'Poslali smo' : 'Šaljemo'} kod od {CODE_LENGTH} znamenki na{'\n'}
          <Text style={styles.codeEmail}>{pending.email}</Text>
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}

        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="000000"
          placeholderTextColor="#ccc"
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoFocus
        />
        <Text style={styles.codeHint}>
          Kod vrijedi 15 minuta. Ako mail ne stigne, provjeri i spam.
        </Text>

        <TouchableOpacity
          style={[styles.button, code.length !== CODE_LENGTH && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Potvrdi</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={busy || cooldown > 0}>
          <Text style={[styles.switchText, cooldown > 0 && styles.linkDisabled]}>
            {pending.sent ? 'Pošalji novi kod' : 'Pošalji kod'}
            {cooldown > 0 ? ` (${cooldown} s)` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleBack} disabled={busy}>
          <Text style={styles.backText}>Natrag na prijavu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{isRegistering ? 'Sign Up' : 'Login'}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder={isRegistering ? 'Email' : 'Email ili username'}
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      {isRegistering && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Username (Saiyan name)"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <Text style={styles.hint}>{USERNAME_HINT}</Text>
        </>
      )}

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {isRegistering && (
        <View style={styles.rules}>
          {checkPassword(password).map((rule) => (
            <Text key={rule.id} style={[styles.rule, rule.ok && styles.ruleOk]}>
              {rule.ok ? '✓' : '•'} {rule.label}
            </Text>
          ))}
        </View>
      )}

      {isRegistering && (
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#aaa"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="none"
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isRegistering ? 'Sign Up' : 'Login'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
        <Text style={styles.switchText}>
          {isRegistering
            ? 'Already have an account? Login'
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    // bez ovoga je tekst (i točkice lozinke) bijel kad je mobitel u tamnom načinu
    color: '#333',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchText: {
    marginTop: 10,
    color: '#007bff',
    fontSize: 16,
  },
  rules: {
    alignSelf: 'flex-start',
    marginTop: -4,
    marginBottom: 12,
  },
  rule: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  ruleOk: {
    color: '#2e9e4f',
    fontWeight: '600',
  },
  hint: {
    alignSelf: 'flex-start',
    fontSize: 12,
    color: '#888',
    marginTop: -6,
    marginBottom: 12,
  },
  error: {
    color: 'red',
    marginBottom: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  info: {
    color: '#2e9e4f',
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  codeText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  codeEmail: {
    fontWeight: 'bold',
    color: '#333',
  },
  codeInput: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 10,
    textAlign: 'center',
  },
  codeHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkDisabled: {
    color: '#9bbcf0',
  },
  backText: {
    marginTop: 14,
    color: '#888',
    fontSize: 15,
  },
});

export default AuthScreen;
