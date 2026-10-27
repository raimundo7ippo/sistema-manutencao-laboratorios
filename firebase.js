/**
 * Configuração e Inicialização do Firebase - DTI UFC
 * Este ficheiro centraliza a ligação à base de dados (Firestore) e ao sistema de autenticação (Auth).
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciais de acesso ao projeto Firebase da DTI
const firebaseConfig = {
  apiKey: "AIzaSyBOST0e0qOsXYd9ZLClOqfXW_g0oi8Ryzg",
  authDomain: "sistema-manutenca-labs.firebaseapp.com",
  projectId: "sistema-manutenca-labs",
  storageBucket: "sistema-manutenca-labs.firebasestorage.app",
  messagingSenderId: "876564853897",
  appId: "1:876564853897:web:e8aa524a2467f2f03c4258",
  measurementId: "G-EGQJ02E555"
};

// 1. Inicializa a Aplicação Firebase
const app = initializeApp(firebaseConfig);

// 2. Exporta os serviços para serem usados nos outros ficheiros (.js)
export const auth = getAuth(app);
export const db = getFirestore(app);