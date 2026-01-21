import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, push, update, remove, runTransaction } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBE0S7-i4h8txM1q9VpEnRvSoxyLWdf9rw",
    authDomain: "quiag-a6943.firebaseapp.com",
    projectId: "quiag-a6943",
    storageBucket: "quiag-a6943.firebasestorage.app",
    messagingSenderId: "423254997376",
    appId: "1:423254997376:web:6c0b73c5428d828b2b6965",
    databaseURL: "https://quiag-a6943-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// Helpers para la base de datos
export const dbRef = (path: string) => ref(database, path);
export { set, get, onValue, push, update, remove, runTransaction };
