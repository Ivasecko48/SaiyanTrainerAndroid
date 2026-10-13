import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultFoods from '../components/foods.json';

// Vlastite namirnice su odvojene po korisniku
const keyFor = (userId) => `CUSTOM_FOODS_V1:${userId}`;

export const MY_FOODS = 'Moje namirnice';

const lower = (text) => String(text || '').trim().toLowerCase();

// Vrijednosti u biblioteci su na 100 g
const libraryItems = defaultFoods.map((food) => ({
  name: food.name,
  category: food.category || 'Ostalo',
  kcal: food.kcal,
  protein: food.protein,
  grams: 100,
  custom: false,
}));

const libraryNames = new Set(libraryItems.map((food) => lower(food.name)));

const loadCustom = async (userId) => {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.log('Greška kod čitanja namirnica:', error);
    return [];
  }
};

// Biblioteka + vlastite namirnice ovog korisnika
export const loadFoodCatalog = async (userId) => {
  if (!userId) return libraryItems;

  const custom = await loadCustom(userId);
  return [
    ...libraryItems,
    ...custom.map((food) => ({
      name: food.name,
      category: MY_FOODS,
      kcal: Number(food.kcal) || 0,
      protein: Number(food.protein) || 0,
      grams: Number(food.grams) > 0 ? Number(food.grams) : 100,
      custom: true,
    })),
  ];
};

// Sprema novu vlastitu namirnicu ili ažurira postojeću.
// `grams` je količina na koju se odnose kcal i protein.
export const saveCustomFood = async (userId, { name, kcal, protein, grams }) => {
  const cleanName = String(name || '').trim();
  if (!userId || !cleanName) return;
  if (libraryNames.has(lower(cleanName))) return; // biblioteka se ne mijenja

  const custom = await loadCustom(userId);
  const index = custom.findIndex((food) => lower(food.name) === lower(cleanName));
  const entry = {
    name: cleanName,
    kcal: Number(kcal) || 0,
    protein: Number(protein) || 0,
    grams: Number(grams) > 0 ? Number(grams) : 100,
  };

  if (index >= 0) custom[index] = entry;
  else custom.push(entry);

  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(custom));
  } catch (error) {
    console.log('Greška kod spremanja namirnice:', error);
  }
};

export const findFood = (catalog, name) => {
  const wanted = lower(name);
  if (!wanted) return null;
  return (catalog || []).find((food) => lower(food.name) === wanted) || null;
};

// Kalorije i proteini za zadanu količinu u gramima, zaokruženo na cijele brojeve
export const scaleFood = (food, grams) => {
  const factor = grams / food.grams;
  return {
    calories: Math.round(food.kcal * factor),
    protein: Math.round(food.protein * factor),
  };
};
