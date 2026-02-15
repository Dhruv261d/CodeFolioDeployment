import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyAtoruRZWCbBmtdKL_zQ2KgBVa5kqIBlvI",
//   authDomain: "codefolio-dc15e.firebaseapp.com",
//   projectId: "codefolio-dc15e",
//   storageBucket: "codefolio-dc15e.firebasestorage.app",
//   messagingSenderId: "976455322727",
//   appId: "1:976455322727:web:900bd38d98b19cfd5b18c2",
// };

const firebaseConfig = {
  apiKey: "AIzaSyAtoruRZWCbBmtdKL_zQ2KgBVa5kqIBlvI",
  authDomain: "codefolio-dc15e.firebaseapp.com",
  projectId: "codefolio-dc15e",
  storageBucket: "codefolio-dc15e.firebasestorage.app",
  messagingSenderId: "976455322727",
  appId: "1:976455322727:web:900bd38d98b19cfd5b18c2",
};

// Replace your hardcoded object with this:
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);