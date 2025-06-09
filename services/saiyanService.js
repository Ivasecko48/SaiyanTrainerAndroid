import databaseService from './databaseService';
import { ID, Query } from 'react-native-appwrite';

// appwrite db and coll id
const dbId = process.env.EXPO_PUBLIC_APPWRITE_DB_ID;
const colId = process.env.EXPO_PUBLIC_APPWRITE_COL_NOTES_ID;

const saiyanService = {
  //get exers
  async getExercises() {
    // if (!userId) {
    //   console.error('Error; Missing userId in getExercise');
    //   return {
    //     data: [],
    //     error: 'User ID is missing',
    //   };
    //
    const response = await databaseService.listDocuments(dbId, colId);
    if (response.error) {
      return { error: response.error };
    }
    return { data: response };
  },

  // Add new ex
  async addExercise({ name, weight, sets, reps, rpe }) {
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
      //user_id: user_id,
    };

    const response = await databaseService.createDocument(
      dbId,
      colId,
      data,
      ID.unique()
    );

    if (response?.error) {
      return { error: response.error };
    }

    return { data: response };
  },

  //   // Update ex
  async updateExercise(id, name, weight, sets, reps, rpe) {
    const response = await databaseService.updateDocument(dbId, colId, id, {
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
  // Delete ex
  async deleteExercise(id) {
    const response = await databaseService.deleteDocument(dbId, colId, id);
    if (response?.error) {
      return { error: response.error };
    }

    return { success: true };
  },
};

export default saiyanService;
