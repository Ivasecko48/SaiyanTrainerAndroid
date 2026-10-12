import { Tabs, usePathname } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  View,
  Text,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Calendar } from 'react-native-calendars';
import { useDate } from '@/contexts/DateContext';
import saiyanService from '@/services/saiyanService';

// zadana visina donje trake s tabovima (bez sigurnog razmaka na dnu ekrana)
const TAB_BAR_HEIGHT = 49;

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
    <TouchableOpacity onPress={logoutAlert} style={{ paddingRight: 14 }}>
      <Feather name="log-out" size={24} color="white" />
    </TouchableOpacity>
  ) : null;
};

export default function TabLayout() {
  const [calendarVisible, setCalendarVisible] = useState(false);
  const { selectedDate, setSelectedDate, refreshKey } = useDate();
  const { user } = useAuth();
  const [exercises, setExercises] = useState([]);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  // Ikona kalendara stoji na istoj visini kao gumb "+ Add" (60 px iznad donje trake s tabovima),
  // a ne preko same trake, pa se tab "Muscle Groups" lako dodiruje
  const calendarBottom = insets.bottom + TAB_BAR_HEIGHT + 60;
  // Tab s mišićima prikazuje cijeli tekući tjedan, pa kalendar tamo nema smisla
  const showCalendarButton = !pathname.includes('muscleScreen');

  // Učitaj dane s vježbama za oznake u kalendaru.
  // Ponovo se učitava kad se vježbe promijene (refreshKey) ili korisnik zamijeni.
  useEffect(() => {
    if (!user) {
      setExercises([]);
      return;
    }

    const fetchData = async () => {
      const res = await saiyanService.getExercises(user.$id);
      if (res.error) {
        console.error('Error fetching exercises:', res.error);
        setExercises([]);
      } else {
        setExercises(res.data || []);
      }
    };
    fetchData();
  }, [user?.$id, refreshKey]);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setCalendarVisible(false);
  };

  // Makni filter datuma i prikaži sve dane
  const handleShowAll = () => {
    setSelectedDate(null);
    setCalendarVisible(false);
  };

  const getMarkedDates = (exercises, selectedDate) => {
    const marked = {};

    exercises.forEach((ex) => {
      const dateStr = new Date(ex.createdAt).toISOString().split('T')[0];

      // Ako već postoji oznaka, nemoj prebrisati
      if (!marked[dateStr]) {
        marked[dateStr] = {
          selected: true,
          selectedColor: 'lightgreen',
        };
      }
    });

    // Dodaj odabrani datum kao posebno označen
    if (selectedDate) {
      marked[selectedDate] = {
        ...(marked[selectedDate] || {}),
        selected: true,
        selectedColor: '#fc7138',
      };
    }

    return marked;
  };

  return (
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
            // Tab s mišićima ima ikonu ruke koja radi biceps curl
            if (route.name === 'muscleScreen') {
              return (
                <MaterialCommunityIcons
                  name="arm-flex"
                  size={size}
                  color={color}
                />
              );
            }

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
        <Tabs.Screen
          name="muscleScreen"
          options={{ title: 'Muscle Groups', headerRight: () => <HeaderLogout /> }}
        />
      </Tabs>

      {/* FAB Button */}
      {showCalendarButton && (
        <TouchableOpacity
          style={[styles.fab, { bottom: calendarBottom }]}
          onPress={() => setCalendarVisible(true)}
        >
          <Feather name="calendar" size={26} color="#fff" />
        </TouchableOpacity>
      )}

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
              current={selectedDate || undefined}
              onDayPress={handleDayPress}
              markedDates={getMarkedDates(exercises, selectedDate)}
            />
            <View style={styles.calendarActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShowAll}
              >
                <Text style={styles.actionText}>Prikaži sve dane</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setCalendarVisible(false)}
              >
                <Text style={styles.actionText}>Zatvori</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  actionText: {
    color: '#fc7138',
    fontSize: 16,
    fontWeight: '600',
  },
});
