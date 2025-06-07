import { database } from './appwrite';

const databaseService = {
  // list documents
  async listDocuments(dbId, colId = []) {
    try {
      const response = await database.listDocuments(dbId, colId);
      return response.documents || [];
    } catch (error) {
      console.error('error fetching documents:', error.message);
      return { error: error.message };
    }
  },
  // Create Docs
  async createDocument(dbId, colId, data, id = null) {
    try {
      return await database.createDocument(dbId, colId, id || undefined, data);
    } catch (error) {
      console.error('error creating document', error.message);
      return {
        error: error.message,
      };
    }
  },
  //update doc
  async updateDocument(dbId, colId, id, data) {
    try {
      return await database.updateDocument(dbId, colId, id, data);
    } catch (error) {
      console.error('error updating document', error.message);
      return {
        error: error.message,
      };
    }
  },
  //delete doc
  async deleteDocument(dbId, colId, id) {
    try {
      await database.deleteDocument(dbId, colId, id);
      return { success: true };
    } catch (error) {
      console.error('error deleting document', error.message);
      return {
        error: error.message,
      };
    }
  },
};

export default databaseService;
