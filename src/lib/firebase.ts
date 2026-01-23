import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, push, update, remove, runTransaction } from "firebase/database";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Initialize Firebase only if config is complete or we are in the browser
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const database = getDatabase(app);

// Helpers para la base de datos
export const dbRef = (path: string) => ref(database, path);
export { set, get, onValue, push, update, remove, runTransaction };
