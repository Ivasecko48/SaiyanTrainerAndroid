import databaseService from './databaseService';
import { ID, Query } from 'react-native-appwrite';

// appwrite db and coll id
const dbId = process.env.EXPO_PUBLIC_APPWRITE_DB_ID;
const colId = process.env.EXPO_PUBLIC_APPWRITE_COL_NOTES_ID;

const saiyanService = {
  //get notes
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
};
// Add new note
//   async addExercise(user_id, text) {
//     if (!text) {
//       return { error: 'Exercise name cant be empty' };
//     }

//     const data = {
//       name: name,

//       createdAt: new Date().toISOString(),
//       user_id: user_id,
//     };

//     const response = await databaseService.createDocument(
//       dbId,
//       colId,
//       data,
//       ID.unique()
//     );

//     if (response?.error) {
//       return { error: response.error };
//     }

//     return { data: response };
//   },
//   // Update note
//   async updateNote(id, text) {
//     const response = await databaseService.updateDocument(dbId, colId, id, {
//       text,
//     });

//     if (response?.error) {
//       return { error: response.error };
//     }

//     return { data: response };
//   },
//   // Delete note
//   async deleteNote(id) {
//     const response = await databaseService.deleteDocument(dbId, colId, id);
//     if (response?.error) {
//       return { error: response.error };
//     }

//     return { success: true };
//   },
// };

export default saiyanService;
