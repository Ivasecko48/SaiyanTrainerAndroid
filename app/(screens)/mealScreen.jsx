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
import TableHeader from '@/components/TableHeader';
import DayHeader, { RangeLabel } from '@/components/DayHeader';
import { MEAL_COLUMNS } from '@/components/tableStyles';
import AddMealModal from '@/components/AddMealModal';
import saiyanService from '@/services/saiyanService';
import {
  loadFoodCatalog,
  saveCustomFood,
  findFood,
  scaleFood,
} from '@/services/foodCatalog';
import { parseNumber } from '@/utils/parseNumber';
import { dateKey, todayKey, inRange, withDayHeaders } from '@/utils/dates';
import { calcTargets, calorieStatus, proteinStatus } from '@/utils/nutrition';

const round1 = (n) => Math.round(n * 10) / 10;

const sumMeals = (list) =>
  list.reduce(
    (sum, meal) => ({
      calories: sum.calories + (Number(meal.calories) || 0),
      protein: sum.protein + (Number(meal.protein) || 0),
    }),
    { calories: 0, protein: 0 }
  );

const MealsScreen = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selectedDate, range, mode, rangeLabel, entryDate } = useDate();

  // Svi obroci korisnika; prikazuju se samo oni u odabranom rasponu
  const [meals, setMeals] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  // Inputi rade sa stringovima, pretvaramo ih u brojeve tek pri spremanju
  const [protein, setProtein] = useState('');
  const [calories, setCalories] = useState('');
  const [grams, setGrams] = useState('');
  // Namirnica odabrana iz prijedloga, iz nje se računaju kalorije i proteini
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodCatalog, setFoodCatalog] = useState([]);
  //for editing
  const [editingMeal, setEditingMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obroci u odabranom rasponu i retci tablice (kod više dana s naslovom dana)
  const { visible, rows } = useMemo(() => {
    const list = meals.filter((meal) => inRange(meal.createdAt, range));
    return {
      visible: list,
      rows: mode === 'day' ? list : withDayHeaders(list, mode === 'all'),
    };
  }, [meals, range, mode]);

  // Ukupne vrijednosti se računaju iz liste, pa se osvježe nakon svake promjene.
  // Dnevni cilj se uspoređuje s prikazanim danom, a kod tjedna i svih dana s današnjim.
  const goalDay = mode === 'day' ? selectedDate : todayKey();
  const { totalCalories, totalProtein, day } = useMemo(() => {
    const all = sumMeals(visible);
    return {
      totalCalories: round1(all.calories),
      totalProtein: round1(all.protein),
      day: sumMeals(meals.filter((meal) => dateKey(meal.createdAt) === goalDay)),
    };
  }, [visible, meals, goalDay]);

  // Dnevni cilj iz profila (null dok profil nije postavljen)
  const targets = useMemo(
    () => calcTargets(user?.prefs?.profile),
    [user?.prefs?.profile]
  );
  const kcalStatus = targets && calorieStatus(day.calories, targets);
  const protStatus = targets && proteinStatus(day.protein, targets);
  const goalPrefix = goalDay === todayKey() ? 'Danas, cilj' : 'Cilj';

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchMeals();
    }
  }, [range?.start, range?.end, user]);

  useEffect(() => {
    if (user) {
      loadFoodCatalog(user.$id).then(setFoodCatalog);
    }
  }, [user]);

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

  // Vraća formu na početno stanje
  const resetForm = () => {
    setEditingMeal(null);
    setNewMealName('');
    setCalories('');
    setProtein('');
    setGrams('');
    setSelectedFood(null);
  };

  // Upisuje kalorije i proteine za odabranu namirnicu i količinu
  const applyFood = (food, gramsText) => {
    const amount = parseNumber(gramsText, NaN);
    if (!food || !(amount > 0)) return;
    const scaled = scaleFood(food, amount);
    setCalories(String(scaled.calories));
    setProtein(String(scaled.protein));
  };

  const handleSelectFood = (food) => {
    setNewMealName(food.name);
    setSelectedFood(food);
    setGrams(String(food.grams));
    applyFood(food, food.grams);
  };

  const handleGramsChange = (text) => {
    setGrams(text);
    applyFood(selectedFood, text);
  };

  // Ručno mijenjanje naziva odvaja obrok od odabrane namirnice
  const handleNameChange = (text) => {
    setNewMealName(text);
    if (selectedFood && text !== selectedFood.name) {
      setSelectedFood(null);
    }
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

    // Kalorije i proteini se spremaju kao cijeli brojevi
    const caloriesValue = Math.round(parseNumber(calories, NaN));
    if (Number.isNaN(caloriesValue)) {
      Alert.alert('Meal', 'Enter the calories');
      return;
    }

    // odabrani dan iz kalendara (kod tjedna i svih dana obično današnji)
    const dateToSave = new Date(entryDate);
    const proteinValue = Math.round(parseNumber(protein)); // prazno polje = 0
    const newData = {
      user_id: user.$id,
      createdAt: dateToSave.toISOString(),
      mealName: newMealName.trim(),
      protein: proteinValue,
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

    // Namirnicu koje nema u biblioteci pamtimo na uređaju za sljedeći put.
    // Bez upisanih grama vrijednosti se tretiraju kao porcija od 100 g.
    const known = findFood(foodCatalog, newData.mealName);
    if (!known || known.custom) {
      await saveCustomFood(user.$id, {
        name: newData.mealName,
        kcal: caloriesValue,
        protein: proteinValue,
        grams: parseNumber(grams, 100),
      });
      setFoodCatalog(await loadFoodCatalog(user.$id));
    }

    closeModal();
  };

  // edit meal
  const openEditModal = (meal) => {
    setNewMealName(meal.mealName ?? '');
    setEditingMeal(meal); // Save reference
    setProtein(String(meal.protein ?? ''));
    setCalories(String(meal.calories ?? ''));
    setGrams(''); // grami se ne spremaju u bazu
    setSelectedFood(null);
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

  const renderHeader = () => <TableHeader columns={MEAL_COLUMNS} />;

  return (
    <View style={styles.container}>
      <RangeLabel label={rangeLabel} />
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalCalories}</Text>
          <Text style={styles.summaryLabel}>Ukupno kalorija</Text>
          {kcalStatus && (
            <>
              <Text style={styles.goalTarget}>
                {goalPrefix} {targets.calories} kcal
              </Text>
              <Text
                style={[styles.goalStatus, kcalStatus.ok ? styles.goalOk : styles.goalBad]}
              >
                {kcalStatus.text}
              </Text>
            </>
          )}
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalProtein} g</Text>
          <Text style={styles.summaryLabel}>Ukupno proteina</Text>
          {protStatus && (
            <>
              <Text style={styles.goalTarget}>
                {goalPrefix} {targets.protein} g
              </Text>
              <Text
                style={[styles.goalStatus, protStatus.ok ? styles.goalOk : styles.goalBad]}
              >
                {protStatus.text}
              </Text>
            </>
          )}
        </View>
      </View>
      {!targets && (
        <TouchableOpacity onPress={() => router.navigate('/(screens)/profileScreen')}>
          <Text style={styles.goalHint}>
            Postavi profil (glava gore desno) i dobit ćeš dnevni cilj kalorija i proteina →
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#fc7138" />
      ) : (
        <>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <FlatList
            data={rows}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) =>
              item.type === 'day' ? (
                <DayHeader label={item.label} />
              ) : (
                <MealRender
                  item={item}
                  onDelete={deleteMeal}
                  onEdit={openEditModal}
                />
              )
            }
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>+ Add Meal</Text>
      </TouchableOpacity>
      {/* Modal */}
      <AddMealModal
        modalVisible={modalVisible}
        onClose={closeModal}
        catalog={foodCatalog}
        mealName={newMealName}
        setMealName={handleNameChange}
        onSelectFood={handleSelectFood}
        grams={grams}
        setGrams={handleGramsChange}
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
    padding: 14,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 140, // da zadnji redovi ne završe ispod gumba "+ Add"
  },
  addButton: {
    position: 'absolute',
    bottom: 60,
    left: 25,
    right: 91, // ostavlja mjesta za ikonu kalendara s desne strane
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3ec',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fc7138',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#65617e',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#f1d9cc',
  },
  goalTarget: {
    fontSize: 11,
    color: '#65617e',
    marginTop: 6,
  },
  goalStatus: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 1,
  },
  goalOk: {
    color: '#2e9e4f',
  },
  goalBad: {
    color: '#d63031',
  },
  goalHint: {
    fontSize: 12,
    color: '#fc7138',
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 12,
  },
});
export default MealsScreen;
