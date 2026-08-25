import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOST0e0qOsXYd9ZLClOqfXW_g0oi8Ryzg",
  authDomain: "sistema-manutenca-labs.firebaseapp.com",
  projectId: "sistema-manutenca-labs",
  storageBucket: "sistema-manutenca-labs.firebasestorage.app",
  messagingSenderId: "876564853897",
  appId: "1:876564853897:web:e8aa524a2467f2f03c4258",
  measurementId: "G-EGQJ02E555"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);