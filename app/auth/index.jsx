import { useState } from 'react';
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

const AuthScreen = () => {
  const { login, register } = useAuth();
  const router = useRouter();
  // Kod prijave: e-mail ili username; kod registracije: e-mail
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

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

    if (response?.error) {
      Alert.alert('Error', response.error);
      return;
    }

    router.replace('../(screens)/trainingScreen');
  };

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
  },
});

export default AuthScreen;
