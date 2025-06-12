import { Stack } from 'expo-router';
import TrainingHeaderNav from './TrainingHeaderNav';
import { View } from 'react-native-web';
const TrainingLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fc7138',
        },
        headerTintColor: '#fff',
        headerTitle: () => <TrainingHeaderNav />,
        contentStyle: {
          backgroundColor: '#fff',
        },
      }}
    />
  );
};

export default TrainingLayout;
