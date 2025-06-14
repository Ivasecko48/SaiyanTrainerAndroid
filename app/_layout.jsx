import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';

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
