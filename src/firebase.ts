import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get } from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAezH2_ZZxDLATdqfAAJkxTK0Mblq3Yu7Y",
  authDomain: "priemimumzone.firebaseapp.com",
  databaseURL: "https://priemimumzone-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "priemimumzone",
  storageBucket: "priemimumzone.firebasestorage.app",
  messagingSenderId: "390055858892",
  appId: "1:390055858892:web:d0166e4155ee2ca9046869",
  measurementId: "G-HMTHGNDXFV"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

export { ref, onValue, set, get, signInAnonymously, onAuthStateChanged };
