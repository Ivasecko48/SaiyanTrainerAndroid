import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderLogout } from '../_layout';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#fc7138',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#fc7138',
        },
        headerTintColor: '#fff',
        tabBarIcon: ({ color, size }) => {
          let iconName;

          switch (route.name) {
            case 'trainingScreen':
              iconName = 'barbell';
              break;
            case 'mealScreen':
              iconName = 'fast-food';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="trainingScreen"
        options={{ title: 'Strong Boy', headerRight: () => <HeaderLogout /> }}
      />
      <Tabs.Screen
        name="mealScreen"
        options={{ title: 'Big man', headerRight: () => <HeaderLogout /> }}
      />
    </Tabs>
  );
}
