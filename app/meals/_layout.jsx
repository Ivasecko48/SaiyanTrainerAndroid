import { Stack } from 'expo-router';

const MealsLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fc7138',
        },
        headerTintColor: '#fff',
        contentStyle: {
          backgroundColor: '#fff',
        },
      }}
    />
  );
};

export default MealsLayout;
