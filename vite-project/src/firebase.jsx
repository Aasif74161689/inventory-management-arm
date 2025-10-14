import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
const db = getFirestore(app);

export { db, collection, getDocs, addDoc, updateDoc, doc, deleteDoc };

// Export auth instance
export const auth = getAuth(app);
