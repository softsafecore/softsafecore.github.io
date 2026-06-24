import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFunctions, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";

const firebaseConfig = {
    apiKey: "AIzaSyD8E4ENQtP0xu_qZHe8G5TjqGPsrybkLOg",
    authDomain: "vivaleve258.firebaseapp.com",
    databaseURL: "https://vivaleve258-default-rtdb.firebaseio.com",
    projectId: "vivaleve258",
    storageBucket: "vivaleve258.firebasestorage.app",
    messagingSenderId: "39491335561",
    appId: "1:39491335561:web:43c0980cf3720ebaf49d58",
    measurementId: "G-X7T8582S06"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

console.log("Firebase App inicializado:", app.name);

// initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider('TUA_SITE_KEY_REAL_AQUI'),
//   isTokenAutoRefreshEnabled: true
// });

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

export const storage = getStorage(app);
export const analytics = getAnalytics(app);
export const functions = getFunctions(app);

// Conecta aos emuladores se estiver rodando localmente
// if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
//     console.info("Conectando aos emuladores locais do Firebase...");
//     connectAuthEmulator(auth, "http://127.0.0.1:9099");
//     connectFirestoreEmulator(db, "127.0.0.1", 8080);
//     connectStorageEmulator(storage, "127.0.0.1", 9199);
//     connectFunctionsEmulator(functions, "127.0.0.1", 5001);
// }