// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBOST0e0qOsXYd9ZLClOqfXW_g0oi8Ryzg",
  authDomain: "sistema-manutenca-labs.firebaseapp.com",
  projectId: "sistema-manutenca-labs",
  storageBucket: "sistema-manutenca-labs.firebasestorage.app",
  messagingSenderId: "876564853897",
  appId: "1:876564853897:web:e8aa524a2467f2f03c4258",
  measurementId: "G-EGQJ02E555"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);