import { Tabs } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  TouchableOpacity,
  Alert,
  View,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '@/contexts/AuthContext';
import { DateProvider } from '@/contexts/DateContext';

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
  const [calendarVisible, setCalendarVisible] = useState(false);
  const { selectedDate, setSelectedDate } = useDate();

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setCalendarVisible(false);
    // TODO: Po želji filtriraj obroke ili vježbe za taj datum
    console.log('Selected date:', day.dateString);
  };

  return (
    <DateProvider>
      <View style={{ flex: 1 }}>
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
            options={{
              title: 'Strong Boy',
              headerRight: () => <HeaderLogout />,
            }}
          />
          <Tabs.Screen
            name="mealScreen"
            options={{ title: 'Big man', headerRight: () => <HeaderLogout /> }}
          />
        </Tabs>

        {/* FAB Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setCalendarVisible(true)}
        >
          <Feather name="calendar" size={26} color="#fff" />
        </TouchableOpacity>

        {/* Calendar Modal */}
        <Modal
          visible={calendarVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setCalendarVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Calendar
                onDayPress={handleDayPress}
                markedDates={
                  selectedDate
                    ? {
                        [selectedDate]: {
                          selected: true,
                          selectedColor: '#fc7138',
                        },
                      }
                    : {}
                }
              />
            </View>
          </View>
        </Modal>
      </View>
    </DateProvider>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 70,
    right: 25,
    backgroundColor: '#fc7138',
    borderRadius: 30,
    padding: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
});
