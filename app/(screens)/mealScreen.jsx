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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useDate } from '@/contexts/DateContext';
import MealRender from '@/components/MealRender';
import TableHeader from '@/components/TableHeader';
import DayHeader, { RangeLabel } from '@/components/DayHeader';
import { MEAL_COLUMNS } from '@/components/tableStyles';
import AddMealModal from '@/components/AddMealModal';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import ShareDayModal from '@/components/ShareDayModal';
import { useTourTarget } from '@/contexts/TourContext';
import saiyanService from '@/services/saiyanService';
import {
  loadFoodCatalog,
  saveCustomFood,
  findFood,
  scaleFood,
} from '@/services/foodCatalog';
import { parseNumber } from '@/utils/parseNumber';
import { dateKey, todayKey, inRange, withDayHeaders, daysInRange } from '@/utils/dates';
import { calcTargets, calorieStatus, proteinStatus } from '@/utils/nutrition';

const round1 = (n) => Math.round(n * 10) / 10;

// Vrijednost za input; nepoznata vrijednost (null) je prazno polje
const asText = (value) => (value === null || value === undefined ? '' : String(value));

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
  // Pregled i dijeljenje dana kao slike
  const [shareOpen, setShareOpen] = useState(false);
  const summaryTourRef = useTourTarget('meal-summary');
  const addTourRef = useTourTarget('add-meal');

  // Svi obroci korisnika; prikazuju se samo oni u odabranom rasponu
  const [meals, setMeals] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  // Inputi rade sa stringovima, pretvaramo ih u brojeve tek pri spremanju
  const [protein, setProtein] = useState('');
  const [calories, setCalories] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [grams, setGrams] = useState('');
  // Namirnica odabrana iz prijedloga, iz nje se računaju kalorije i proteini
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodCatalog, setFoodCatalog] = useState([]);
  // Skener barkoda (Vegetin scouter) i rezultat zadnjeg skeniranja:
  // { barcode, source: 'off' | 'local' | 'missing' } dok je forma otvorena iz skenera
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scan, setScan] = useState(null);
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
  // Cilj se uspoređuje s prikazanim danom; kod tjedna i mjeseca sa zbrojem cijelog
  // razdoblja (dnevni cilj × broj dana); kod svih dana s današnjim danom.
  const isPeriod = mode === 'week' || mode === 'month';
  const days = isPeriod ? daysInRange(range) : 1;
  const goalDay = mode === 'day' ? selectedDate : todayKey();
  const { totalCalories, totalProtein, compared } = useMemo(() => {
    const all = sumMeals(visible);
    return {
      totalCalories: round1(all.calories),
      totalProtein: round1(all.protein),
      compared: isPeriod
        ? all
        : sumMeals(meals.filter((meal) => dateKey(meal.createdAt) === goalDay)),
    };
  }, [visible, meals, goalDay, isPeriod]);

  // Dnevni cilj iz profila (null dok profil nije postavljen)
  const targets = useMemo(
    () => calcTargets(user?.prefs?.profile),
    [user?.prefs?.profile]
  );
  const kcalStatus = targets && calorieStatus(compared.calories, targets, days);
  const protStatus = targets && proteinStatus(compared.protein, targets, days);
  const goalPrefix =
    mode === 'week'
      ? 'Cilj za tjedan'
      : mode === 'month'
        ? 'Cilj za mjesec'
        : goalDay === todayKey()
          ? 'Danas, cilj'
          : 'Cilj';

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
    setFat('');
    setCarbs('');
    setGrams('');
    setSelectedFood(null);
    setScan(null);
  };

  // Upisuje kalorije i proteine za odabranu namirnicu i količinu
  const applyFood = (food, gramsText) => {
    const amount = parseNumber(gramsText, NaN);
    if (!food || !(amount > 0)) return;
    const scaled = scaleFood(food, amount);
    setCalories(asText(scaled.calories));
    setProtein(asText(scaled.protein));
    setFat(asText(scaled.fat));
    setCarbs(asText(scaled.carbs));
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

  // Ručno mijenjanje naziva odvaja obrok od odabrane namirnice. Skenirani proizvod
  // (s barkodom) ostaje povezan, jer je naziv iz baze često na stranom jeziku pa ga
  // korisnik samo ispravlja.
  const handleNameChange = (text) => {
    setNewMealName(text);
    if (selectedFood && !selectedFood.barcode && text !== selectedFood.name) {
      setSelectedFood(null);
    }
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  // Rezultat scoutera otvara prozor "Add Meal": popunjen podacima proizvoda,
  // ili prazan kad proizvoda nema u bazi
  const handleScanned = ({ barcode, food, source }) => {
    resetForm();
    if (food) {
      handleSelectFood(food);
    }
    setScan({ barcode, source });
    setScannerOpen(false);
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
    // Masti i UH: prazno polje = nepoznato (null), ne 0
    const optionalGrams = (text) => {
      const value = parseNumber(text, NaN);
      return Number.isNaN(value) ? null : Math.round(value);
    };
    const fatValue = optionalGrams(fat);
    const carbsValue = optionalGrams(carbs);
    const newData = {
      user_id: user.$id,
      createdAt: dateToSave.toISOString(),
      mealName: newMealName.trim(),
      protein: proteinValue,
      fat: fatValue,
      carbs: carbsValue,
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
      // Skenirani proizvod pamti točne vrijednosti iz baze (npr. na 100 g), osim ako
      // ih je korisnik ručno ispravio. Zaokružena porcija bi s vremenom kvarila podatke.
      const amount = parseNumber(grams, NaN);
      const fromFood =
        selectedFood?.barcode && amount > 0 ? scaleFood(selectedFood, amount) : null;
      const keepFood =
        fromFood &&
        fromFood.calories === caloriesValue &&
        fromFood.protein === proteinValue &&
        fromFood.fat === fatValue &&
        fromFood.carbs === carbsValue;
      const values = keepFood
        ? selectedFood
        : {
            kcal: caloriesValue,
            protein: proteinValue,
            fat: fatValue,
            carbs: carbsValue,
            grams: parseNumber(grams, 100),
          };
      await saveCustomFood(user.$id, {
        name: newData.mealName,
        kcal: values.kcal,
        protein: values.protein,
        fat: values.fat,
        carbs: values.carbs,
        grams: values.grams,
        // Barkod se pamti i kad proizvoda nema u bazi pa ga je korisnik upisao sam
        barcode: scan?.barcode ?? selectedFood?.barcode,
        servingGrams: selectedFood?.servingGrams,
        packageGrams: selectedFood?.packageGrams,
        unit: selectedFood?.unit,
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
    setFat(String(meal.fat ?? ''));
    setCarbs(String(meal.carbs ?? ''));
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
      {/* Dijeli se samo jedan dan, i samo ako ima obroka */}
      <RangeLabel
        label={rangeLabel}
        onShare={mode === 'day' && visible.length > 0 ? () => setShareOpen(true) : undefined}
      />
      <View ref={summaryTourRef} collapsable={false} style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalCalories}</Text>
          <Text style={styles.summaryLabel}>Ukupno kalorija</Text>
          {kcalStatus && (
            <>
              <Text style={styles.goalTarget}>
                {goalPrefix} {targets.calories * days} kcal
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
                {goalPrefix} {targets.protein * days} g
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
      {/* "+ Add Meal" i gumb za skener barkoda; vodič ih pokazuje zajedno */}
      <View ref={addTourRef} collapsable={false} style={styles.addRow}>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Meal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setScannerOpen(true)}
          accessibilityLabel="Skeniraj barkod"
        >
          <MaterialCommunityIcons name="barcode-scan" size={28} color="#0e0e0e" />
        </TouchableOpacity>
      </View>
      {/* Modal */}
      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        catalog={foodCatalog}
        onResult={handleScanned}
      />
      <ShareDayModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        type="meals"
        items={visible}
        dayKey={selectedDate}
        targets={targets}
        username={user?.name}
        avatar={user?.prefs?.avatar}
      />

      <AddMealModal
        modalVisible={modalVisible}
        onClose={closeModal}
        catalog={foodCatalog}
        mealName={newMealName}
        setMealName={handleNameChange}
        onSelectFood={handleSelectFood}
        food={selectedFood}
        scanSource={scan?.source}
        grams={grams}
        setGrams={handleGramsChange}
        protein={protein}
        setProtein={setProtein}
        fat={fat}
        setFat={setFat}
        carbs={carbs}
        setCarbs={setCarbs}
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
  addRow: {
    position: 'absolute',
    bottom: 20, // isto kao "+ Add Exercise" na Strong Boy
    left: 20,
    right: 91, // ostavlja mjesta za ikonu kalendara s desne strane
    flexDirection: 'row',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#fc7138',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
  },
  // Iste boje i visine kao "+ Add Meal", između njega i kalendara
  scanButton: {
    width: 58,
    marginLeft: 10,
    backgroundColor: '#fc7138',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
