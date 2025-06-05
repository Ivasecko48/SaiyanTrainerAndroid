import { Stack } from 'expo-router';
const RootLayout = () => {
  return (
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
      <Stack.Screen name="meals" options={{ headerTitle: 'Big Man' }} />
      <Stack.Screen name="training" options={{ headerTitle: 'Strong Boy' }} />
    </Stack>
  );
};

export default RootLayout;
