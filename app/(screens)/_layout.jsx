import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

const HeaderLogout = () => {
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
