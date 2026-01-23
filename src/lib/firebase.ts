import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, push, update, remove, runTransaction, Database } from "firebase/database";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Lazy initialization - only initialize Firebase when actually needed and only in browser
let app: FirebaseApp | null = null;
let db: Database | null = null;

function getFirebaseApp(): FirebaseApp {
    if (typeof window === 'undefined') {
        // Server-side: throw a clear error if someone tries to use Firebase during SSR/build
        throw new Error('Firebase can only be used on the client side');
    }

    if (!app) {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    return app;
}

function getDb(): Database {
    if (!db) {
        db = getDatabase(getFirebaseApp());
    }
    return db;
}

// Export a getter for the database instead of the database directly
export const database = {
    get instance() {
        return getDb();
    }
};

// Helpers para la base de datos - these will only work client-side
export const dbRef = (path: string) => ref(getDb(), path);
export { set, get, onValue, push, update, remove, runTransaction };
