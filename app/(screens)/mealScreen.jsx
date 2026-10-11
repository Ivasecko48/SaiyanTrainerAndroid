import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useDate } from '@/contexts/DateContext';
import MealRender from '@/components/MealRender';
import AddMealModal from '@/components/AddMealModal';
import saiyanService from '@/services/saiyanService';
import { parseNumber } from '@/utils/parseNumber';

const round1 = (n) => Math.round(n * 10) / 10;

const MealsScreen = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selectedDate } = useDate();

  const [meals, setMeals] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  // Inputi rade sa stringovima, pretvaramo ih u brojeve tek pri spremanju
  const [protein, setProtein] = useState('');
  const [calories, setCalories] = useState('');
  //for editing
  const [editingMeal, setEditingMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ukupne vrijednosti se računaju iz liste, pa se osvježe nakon svake promjene
  const { totalCalories, totalProtein } = useMemo(() => {
    let cal = 0;
    let prot = 0;
    meals.forEach((meal) => {
      cal += Number(meal.calories) || 0;
      prot += Number(meal.protein) || 0;
    });
    return { totalCalories: round1(cal), totalProtein: round1(prot) };
  }, [meals]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchMeals();
    }
  }, [selectedDate, user]);

  const fetchMeals = async () => {
    setLoading(true);
    const response = await saiyanService.getMeals(user.$id);

    if (response.error) {
      setError(response.error);
      Alert.alert('Error', response.error);
    } else {
      let list = response.data;
      if (selectedDate) {
        list = list.filter((meal) => {
          const mealDate = new Date(meal.createdAt).toISOString().split('T')[0];
          return mealDate === selectedDate;
        });
      }
      setMeals(list);
      setError(null);
    }

    setLoading(false);
  };

  // Vraća formu na početno stanje
  const resetForm = () => {
    setEditingMeal(null);
    setNewMealName('');
    setCalories('');
    setProtein('');
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  // Cancel i zatvaranje modala uvijek čiste formu
  const closeModal = () => {
    resetForm();
    setModalVisible(false);
  };

  //   Add new Meal / update existing
  const handleSave = async () => {
    if (!newMealName.trim()) {
      Alert.alert('Meal', 'Enter a meal name');
      return;
    }

    const caloriesValue = parseNumber(calories, NaN);
    if (Number.isNaN(caloriesValue)) {
      Alert.alert('Meal', 'Enter the calories');
      return;
    }

    const dateToSave = selectedDate
      ? new Date(selectedDate) // koristi selectedDate iz kalendara
      : new Date(); // današnji datum ako ništa nije odabrano
    const newData = {
      user_id: user.$id,
      createdAt: dateToSave.toISOString(),
      mealName: newMealName.trim(),
      protein: parseNumber(protein), // prazno polje = 0
      calories: caloriesValue,
    };

    if (editingMeal) {
      const response = await saiyanService.updateMeal({
        id: editingMeal.$id,
        ...newData,
      });

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      setMeals((prev) =>
        prev.map((m) => (m.$id === editingMeal.$id ? response.data : m))
      );
    } else {
      const response = await saiyanService.addMeal(newData);

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      setMeals((prev) => [...prev, response.data]);
    }

    closeModal();
  };

  // edit meal
  const openEditModal = (meal) => {
    setNewMealName(meal.mealName ?? '');
    setEditingMeal(meal); // Save reference
    setProtein(String(meal.protein ?? ''));
    setCalories(String(meal.calories ?? ''));
    setModalVisible(true);
  };

  //   delete meal
  const deleteMeal = async (id) => {
    Alert.alert('Delete Meal', 'Are you sure you want to delete?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const response = await saiyanService.deleteMeal(id);
          if (response.error) {
            Alert.alert('Error', response.error);
          } else {
            setMeals((prev) => prev.filter((meal) => meal.$id !== id));
          }
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={styles.headerText}>Meal</Text>
      <Text style={styles.headerText}>Protein</Text>
      <Text style={styles.headerText}>Calories</Text>
      <Text style={styles.deleteCell}></Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#fc7138" />
      ) : (
        <>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <FlatList
            data={meals}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => (
              <MealRender
                item={item}
                onDelete={deleteMeal}
                onEdit={openEditModal}
              />
            )}
            ListHeaderComponent={renderHeader}
          />
        </>
      )}
      <View style={styles.total}>
        <Text style={styles.totalText}>Ukupno kalorija: {totalCalories}</Text>
        <Text style={styles.totalText}>Ukupno proteina: {totalProtein}g</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>+ Add Meal</Text>
      </TouchableOpacity>
      {/* Modal */}
      <AddMealModal
        modalVisible={modalVisible}
        onClose={closeModal}
        mealName={newMealName}
        setMealName={setNewMealName}
        protein={protein}
        setProtein={setProtein}
        calories={calories}
        setCalories={setCalories}
        editingMeal={editingMeal}
        handleSave={handleSave}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  header: {
    backgroundColor: '#f0f0f0',
  },

  headerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteCell: {
    width: 15,
  },
  addButton: {
    position: 'absolute',
    bottom: 60,
    left: 25,
    right: 25,
    backgroundColor: '#fc7138',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
  },
  addButtonText: {
    color: '#0e0e0e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
  },
  total: {
    marginLeft: 10,
  },
  totalText: {
    fontWeight: 'bold',
    color: '#65617e',
  },
});
export default MealsScreen;
