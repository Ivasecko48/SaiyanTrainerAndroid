import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultFoods from '../components/foods.json';

// Vlastite namirnice su odvojene po korisniku
const keyFor = (userId) => `CUSTOM_FOODS_V1:${userId}`;

export const MY_FOODS = 'Moje namirnice';

const lower = (text) => String(text || '').trim().toLowerCase();

// Broj ili null kad podatak ne postoji (starije vlastite namirnice nemaju masti i UH)
const optional = (value) =>
  value === null || value === undefined || value === '' || Number.isNaN(Number(value))
    ? null
    : Number(value);

// Vrijednosti u biblioteci su na 100 g
const libraryItems = defaultFoods.map((food) => ({
  name: food.name,
  category: food.category || 'Ostalo',
  kcal: food.kcal,
  protein: food.protein,
  fat: food.fat,
  carbs: food.carbs,
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
      fat: optional(food.fat),
      carbs: optional(food.carbs),
      grams: Number(food.grams) > 0 ? Number(food.grams) : 100,
      custom: true,
      // Skenirani proizvodi pamte barkod, porciju i pakiranje (za brze gumbe)
      barcode: food.barcode || null,
      servingGrams: optional(food.servingGrams),
      packageGrams: optional(food.packageGrams),
      unit: food.unit || 'g',
    })),
  ];
};

// Sprema novu vlastitu namirnicu ili ažurira postojeću.
// `grams` je količina na koju se odnose kcal, protein, masti i UH.
// Barkod, porcija i pakiranje ostaju zapamćeni i kad se namirnica kasnije
// spremi bez njih (npr. upisom naziva umjesto skeniranja).
export const saveCustomFood = async (
  userId,
  { name, kcal, protein, fat, carbs, grams, barcode, servingGrams, packageGrams, unit }
) => {
  const cleanName = String(name || '').trim();
  if (!userId || !cleanName) return;
  if (libraryNames.has(lower(cleanName))) return; // biblioteka se ne mijenja

  const custom = await loadCustom(userId);
  const index = custom.findIndex((food) => lower(food.name) === lower(cleanName));
  const previous = index >= 0 ? custom[index] : {};
  const entry = {
    name: cleanName,
    kcal: Number(kcal) || 0,
    protein: Number(protein) || 0,
    fat: optional(fat),
    carbs: optional(carbs),
    grams: Number(grams) > 0 ? Number(grams) : 100,
    barcode: barcode || previous.barcode || null,
    servingGrams: optional(servingGrams ?? previous.servingGrams),
    packageGrams: optional(packageGrams ?? previous.packageGrams),
    unit: unit || previous.unit || 'g',
  };

  // Barkod pripada samo jednoj namirnici: zadnjem nazivu pod kojim je spremljen
  if (entry.barcode) {
    custom.forEach((food) => {
      if (food.barcode === entry.barcode) food.barcode = null;
    });
  }

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

// Vlastita namirnica spremljena s ovim barkodom (proizvod skeniran ranije)
export const findFoodByBarcode = (catalog, barcode) => {
  if (!barcode) return null;
  return (catalog || []).find((food) => food.barcode === barcode) || null;
};

// Kalorije, proteini, masti i UH za zadanu količinu u gramima, zaokruženo na cijele
// brojeve. Vrijednost koju namirnica nema (masti i UH starijih namirnica, ili podatak
// koji fali u bazi proizvoda) je null.
export const scaleFood = (food, grams) => {
  const factor = grams / food.grams;
  const scale = (value) => (value === null || value === undefined ? null : Math.round(value * factor));
  return {
    calories: scale(food.kcal),
    protein: scale(food.protein),
    fat: scale(food.fat),
    carbs: scale(food.carbs),
  };
};
