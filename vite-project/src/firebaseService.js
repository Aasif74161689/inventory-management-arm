// src/firebaseService.js
import { db } from "./firebase";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const inventoryDocRef = doc(collection(db, "inventory"), "main"); // single doc "main"

// Fetch inventory
export const fetchInventory = async () => {
  const snap = await getDoc(inventoryDocRef);
  if (!snap.exists()) return null;
  return snap.data();
};

// Initialize inventory (if not exists)
export const initInventory = async (data) => {
  await setDoc(inventoryDocRef, data);
};

// Update inventory
export const updateInventory = async (updatedData) => {
  await updateDoc(inventoryDocRef, updatedData);
};
