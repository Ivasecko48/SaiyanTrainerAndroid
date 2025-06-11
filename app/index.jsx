import { useEffect } from 'react';
import Goku from '@/assets/images/dragon-ball-super-iphone.jpg';
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const HomeScreen = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/training');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="orange" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={Goku}
        style={styles.backgroundImage}
        resizeMode="cover"
      ></ImageBackground>

      <Text style={styles.text}>Welcome back, Saiyan Warrior!</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/training')}
      >
        <Text style={styles.buttonText}>IT'S OVER 9000!!🔥</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    height: '100%',
    flex: 7,
    width: '100%',
  },
  text: {
    fontSize: 20,
    color: '#121212',
    fontWeight: 600,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    marginBottom: '15%',
    backgroundColor: '#fc7138',
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centeredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
});

export default HomeScreen;
