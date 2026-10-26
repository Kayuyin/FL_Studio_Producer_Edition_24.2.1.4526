
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración del proyecto FutMatch
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBHwdQYcTBaL3C3zJx75ecP14sX-U_y6Ak",
  authDomain: "proyecto-de-titulo-futmatch.firebaseapp.com",
  projectId: "proyecto-de-titulo-futmatch",
  storageBucket: "proyecto-de-titulo-futmatch.firebasestorage.app",
  messagingSenderId: "712606614344",
  appId: "1:712606614344:web:701720a965fcb27415a97d",
  measurementId: "G-C7441Q70GJ"
};

const app = initializeApp(firebaseConfig);

// Autenticación de usuarios
export const auth = getAuth(app);

// Base de datos de FutMatch
export const db = getFirestore(app);
