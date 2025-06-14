import databaseService from './databaseService';
import { ID, Query } from 'react-native-appwrite';

// appwrite db and coll id
const dbId = process.env.EXPO_PUBLIC_APPWRITE_DB_ID;
const exerColId = process.env.EXPO_PUBLIC_APPWRITE_COL_EXERCISES_ID;
const mealsColId = process.env.EXPO_PUBLIC_APPWRITE_COL_MEALS_ID;

const saiyanService = {
  //get exers
  async getExercises(userId) {
    if (!userId) {
      console.error('Error; Missing userId in getExercise');
      return {
        data: [],
        error: 'User ID is missing',
      };
    }

    try {
      const response = await databaseService.listDocuments(dbId, exerColId, [
        Query.equal('user_id', userId),
      ]);
      return response;
    } catch (error) {
      console.log('Error fetching notes:', error.message);
      return { data: [], error: error.message };
    }
  },

  //get meals
  async getMeals(userId) {
    if (!userId) {
      console.error('Error; Missing userId in getExercise');
      return {
        data: [],
        error: 'User ID is missing',
      };
    }

    try {
      const response = await databaseService.listDocuments(dbId, exerColId, [
        Query.equal('user_id', userId),
      ]);
      return response;
    } catch (error) {
      console.log('Error fetching notes:', error.message);
      return { data: [], error: error.message };
    }
  },

  // Add new ex
  async addExercise({ user_id, name, weight, sets, reps, rpe }) {
    if (!name) {
      return { error: 'Exercise name cant be empty' };
    }

    const data = {
      name,
      weight,
      sets,
      reps,
      rpe,
      createdAt: new Date().toISOString(),
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

  async addMeal({ user_id, name, calories, protein }) {
    if (!name) {
      return { error: 'Calories cant be null' };
    }

    const data = {
      name,
      calories,
      protein,
      createdAt: new Date().toISOString(),
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
  async updateMeal({ id, name, calories, protein }) {
    const response = await databaseService.updateDocument(
      dbId,
      mealsColId,
      id,
      {
        name,
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
