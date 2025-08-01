import { Account, Client, Databases } from 'react-native-appwrite';
import { Platform } from 'react-native';

const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  db: process.env.EXPO_PUBLIC_APPWRITE_DB_ID,
  col: {
    exercises: process.env.EXPO_PUBLIC_APPWRITE_COL_EXERCISES_ID,
    meals: process.env.EXPO_PUBLIC_APPWRITE_COL_MEALS_ID,
  },
};

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

switch (Platform.OS) {
  case 'ios':
    client.setPlatform(process.env.EXPO_PUBLIC_APPWRITE_BUNDLE_ID);
    break;
  case 'android':
    client.setPlatform(process.env.EXPO_PUBLIC_APPWRITE_PACKAGE_NAME);
    break;
}

const database = new Databases(client);

const account = new Account(client);

export { account, client, config, database };
