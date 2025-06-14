import { useState, useEffect } from 'react';
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
import MealRender from '@/components/MealRender';
import AddMealModal from '@/components/AddMealModal';
import saiyanService from '@/services/saiyanService';

const MealsScreen = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [meals, setMeals] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [NewMealName, setNewMealName] = useState('');
  const [protein, setProtein] = useState(10);
  const [calories, setCalories] = useState(3);
  //for editing
  const [editingMeal, setEditingMeal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchMeals();
    }
  }, []);

  const fetchMeals = async () => {
    setLoading(true);
    const response = await saiyanService.getMeals(user.$id);

    if (response.error) {
      setError(response.error);
      Alert.alert('Error', response.error);
    } else {
      setMeals(response.data);
      setError(null);
    }

    setLoading(false);
  };
  //   Add new Meal

  const handleSave = async () => {
    if (calories === '') return;
    const newData = {
      user_id: user.$id,
      name: String(NewMealName).trim(),
      protein: parseFloat(protein),
      calories: parseFloat(calories),
    };
    if (editingMeal) {
      // Update existing

      const response = await saiyanService.updateMeal({
        id: editingMeal.$id,
        ...newData,
      });

      if (!response.error) {
        setMeals((prev) =>
          prev.map((e) => (e.$id === editingMeal.$id ? response.data : e))
        );
      }
    } else {
      const response = await saiyanService.addMeal(newData);

      if (response.error) {
        Alert.alert('error', response.error);
      } else {
        setMeals([...Meal, response.data]);
      }
    }

    setEditingMeal(null);
    setNewMealName('');
    setCalories('');
    setProtein('');
    setModalVisible(false);
  };

  // edit meal

  const openEditModal = (Meal) => {
    setNewMealName(Meal.name); // Or whole object if you're editing more fields
    setEditingMeal(Meal); // Save reference
    setProtein(Meal.protein);
    setCalories(Meal.calories);
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
            Alert.alert('error', response.error);
          } else {
            setMeals(meals.filter((Meal) => Meal.$id !== id));
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
              <MealRender item={item} onDelete={deleteMeal} />
            )}
            ListHeaderComponent={renderHeader}
          />
        </>
      )}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add Meal</Text>
      </TouchableOpacity>
      {/* Modal */}
      <AddMealModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        mealName={NewMealName}
        setMealName={setNewMealName}
        protein={protein}
        setProtein={setProtein}
        calories={calories}
        setCalories={setCalories}
        editingMeal={editingMeal}
        setEditingMeal={setEditingMeal}
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
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
    marginRight: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
    flex: 1,
    height: 50,
  },
  label: {
    flex: 1,
    fontSize: 16,
    marginRight: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
  },
});
export default MealsScreen;
