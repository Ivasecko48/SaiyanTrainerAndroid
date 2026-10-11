import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultExercises from '../components/workout_exercises.json';
import {
  getLibraryMuscles,
  COARSE_GROUP_TO_MUSCLES,
} from '../utils/exerciseMuscles';
import { normalizeMuscles } from '../utils/muscles';

// Stari popis vlastitih vježbi bio je zajednički za cijeli uređaj
const OLD_KEY = 'CUSTOM_EXERCISE_LIST';
// Novi popis je odvojen po korisniku
const keyFor = (userId) => `CUSTOM_EXERCISES_V2:${userId}`;

export const CUSTOM_SECTION = 'Moje vježbe';

const lower = (text) => String(text || '').trim().toLowerCase();

const libraryItems = defaultExercises.map((ex) => ({
  name: ex.name,
  muscle_group: ex.muscle_group || 'Ostalo',
  description: ex.description || '',
  muscles: getLibraryMuscles(ex.name),
  custom: false,
}));

const libraryNames = new Set(libraryItems.map((ex) => lower(ex.name)));

const readJson = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.log('Greška kod čitanja vježbi:', error);
    return null;
  }
};

const loadCustom = async (userId) => {
  const existing = await readJson(keyFor(userId));
  if (Array.isArray(existing)) return existing;

  // Prvi put za ovog korisnika: preuzmi stare vlastite vježbe s uređaja.
  // Stari popis je uz njih sadržavao i cijelu biblioteku, pa je izbacujemo.
  const old = await readJson(OLD_KEY);
  const migrated = Array.isArray(old)
    ? old
        .filter((ex) => ex?.name && !libraryNames.has(lower(ex.name)))
        .map((ex) => {
          const own = normalizeMuscles(ex.muscles);
          return {
            name: ex.name,
            description: ex.description || '',
            muscles: own.length ? own : COARSE_GROUP_TO_MUSCLES[ex.muscle_group] || [],
          };
        })
    : [];

  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(migrated));
    await AsyncStorage.removeItem(OLD_KEY);
  } catch (error) {
    console.log('Greška kod spremanja vježbi:', error);
  }

  return migrated;
};

// Biblioteka + vlastite vježbe ovog korisnika
export const loadCatalog = async (userId) => {
  if (!userId) return libraryItems;

  const custom = await loadCustom(userId);
  return [
    ...libraryItems,
    ...custom.map((ex) => ({
      name: ex.name,
      muscle_group: CUSTOM_SECTION,
      description: ex.description || '',
      muscles: normalizeMuscles(ex.muscles),
      custom: true,
    })),
  ];
};

// Sprema novu vlastitu vježbu ili ažurira mišiće postojeće
export const saveCustomExercise = async (userId, { name, muscles }) => {
  const cleanName = String(name || '').trim();
  if (!userId || !cleanName) return;
  if (libraryNames.has(lower(cleanName))) return; // biblioteka se ne mijenja

  const custom = await loadCustom(userId);
  const index = custom.findIndex((ex) => lower(ex.name) === lower(cleanName));
  const entry = {
    name: cleanName,
    description: index >= 0 ? custom[index].description || '' : '',
    muscles: normalizeMuscles(muscles),
  };

  if (index >= 0) custom[index] = entry;
  else custom.push(entry);

  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(custom));
  } catch (error) {
    console.log('Greška kod spremanja vježbe:', error);
  }
};

export const findInCatalog = (catalog, name) => {
  const wanted = lower(name);
  if (!wanted) return null;
  return (catalog || []).find((ex) => lower(ex.name) === wanted) || null;
};
