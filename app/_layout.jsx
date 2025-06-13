import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

export const HeaderLogout = () => {
  const { user, logout } = useAuth();

  const logoutAlert = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return user ? (
    <TouchableOpacity
      onPress={() => logoutAlert(logout)}
      style={{ paddingRight: 14 }}
    >
      <Feather name="log-out" size={24} color="white" />
    </TouchableOpacity>
  ) : null;
};

const RootLayout = () => {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fc7138',
          },
          headerTintColor: '#f7f7f7',
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
          headerRight: () => <HeaderLogout />,
          contentStyle: {
            padding: 0,
            backgroundColor: '#fff',
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Saiyan Trainer' }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(screens)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
};

export default RootLayout;
