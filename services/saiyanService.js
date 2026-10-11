import databaseService from './databaseService';
import { ID, Query } from 'react-native-appwrite';

// appwrite db and coll id
const dbId = process.env.EXPO_PUBLIC_APPWRITE_DB_ID;
const exerColId = process.env.EXPO_PUBLIC_APPWRITE_COL_EXERCISES_ID;
const mealsColId = process.env.EXPO_PUBLIC_APPWRITE_COL_MEALS_ID;

const PAGE_SIZE = 100;

// Appwrite po defaultu vraća samo 25 dokumenata po upitu.
// Zato dohvaćamo stranicu po stranicu dok ne stignemo do kraja.
const listAllForUser = async (colId, userId) => {
  const all = [];
  let cursor = null;

  while (true) {
    const queries = [Query.equal('user_id', userId), Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databaseService.listDocuments(dbId, colId, queries);
    if (response.error) {
      return { data: [], error: response.error };
    }

    all.push(...response.data);

    if (response.data.length < PAGE_SIZE) break;
    cursor = response.data[response.data.length - 1].$id;
  }

  return { data: all, error: null };
};

const saiyanService = {
  //get exers
  async getExercises(userId) {
    if (!userId) {
      console.error('Error; Missing userId in getExercises');
      return {
        data: [],
        error: 'User ID is missing',
      };
    }

    return listAllForUser(exerColId, userId);
  },

  //get meals
  async getMeals(userId) {
    if (!userId) {
      console.error('Error; Missing userId in getMeals');
      return {
        data: [],
        error: 'User ID is missing',
      };
    }

    return listAllForUser(mealsColId, userId);
  },

  // Add new ex
  async addExercise({ user_id, createdAt, name, weight, sets, reps, rpe }) {
    if (!name) {
      return { error: 'Exercise name cant be empty' };
    }

    const data = {
      name,
      createdAt,
      weight,
      sets,
      reps,
      rpe,
      user_id: user_id,
    };

    const response = await databaseService.createDocument(
      dbId,
      exerColId,
      data,
      ID.unique()
    );

    if (response?.error) {
      return { error: response.error };
    }

    return { data: response };
  },

  //add new meal
  // Polje u Appwrite kolekciji se zove `mealName`.
  // createdAt dolazi s ekrana, pa obrok završi na odabranom danu u kalendaru.
  async addMeal({ user_id, createdAt, mealName, calories, protein }) {
    if (!mealName) {
      return { error: 'Meal name cant be empty' };
    }
    if (calories == null || Number.isNaN(calories)) {
      return { error: 'Calories cant be null' };
    }

    const data = {
      mealName,
      calories,
      protein,
      createdAt: createdAt || new Date().toISOString(),
      user_id: user_id,
    };

    const response = await databaseService.createDocument(
      dbId,
      mealsColId,
      data,
      ID.unique()
    );

    if (response?.error) {
      return { error: response.error };
    }

    return { data: response };
  },

  // Update ex
  async updateExercise({ id, name, weight, sets, reps, rpe }) {
    const response = await databaseService.updateDocument(dbId, exerColId, id, {
      name,
      weight,
      sets,
      reps,
      rpe,
    });

    if (response?.error) {
      return { error: response.error };
    }

    return { data: response };
  },

  // Update meal
  async updateMeal({ id, mealName, calories, protein }) {
    const response = await databaseService.updateDocument(
      dbId,
      mealsColId,
      id,
      {
        mealName,
        calories,
        protein,
      }
    );

    if (response?.error) {
      return { error: response.error };
    }

    return { data: response };
  },

  // Delete ex
  async deleteExer(id) {
    const response = await databaseService.deleteDocument(dbId, exerColId, id);
    if (response?.error) {
      return { error: response.error };
    }

    return { success: true };
  },

  // Delete meal
  async deleteMeal(id) {
    const response = await databaseService.deleteDocument(dbId, mealsColId, id);
    if (response?.error) {
      return { error: response.error };
    }

    return { success: true };
  },
};

export default saiyanService;
