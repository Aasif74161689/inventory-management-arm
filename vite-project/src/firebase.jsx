// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDRC3OZVYpdY8ZEp1MUXOosBewFxndpEsI",
  authDomain: "inventory-management-29113.firebaseapp.com",
  projectId: "inventory-management-29113",
  storageBucket: "inventory-management-29113.firebasestorage.app",
  messagingSenderId: "962787772667",
  appId: "1:962787772667:web:12fc35d7b1501f6686885e",
  measurementId: "G-GZ5LLQXPCW",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export auth instance
export const auth = getAuth(app);
