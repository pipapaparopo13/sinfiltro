// Script to clear all rooms from Firebase
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, remove } = require('firebase/database');

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
const database = getDatabase(app);

async function clearRooms() {
    try {
        console.log("🗑️  Clearing all rooms from Firebase...");
        const roomsRef = ref(database, 'rooms');
        await remove(roomsRef);
        console.log("✅ All rooms cleared successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error clearing rooms:", error);
        process.exit(1);
    }
}

clearRooms();
