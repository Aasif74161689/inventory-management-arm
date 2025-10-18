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

export const resetInventory = async () => {
  try {
    const collections = [
      "inventory",
      "productionOrders",
      "assemblyOrders",
      "logs",
    ];
    for (const collName of collections) {
      const querySnapshot = await getDocs(collection(db, collName));
      const deletePromises = querySnapshot.docs.map((d) =>
        deleteDoc(doc(db, collName, d.id))
      );
      await Promise.all(deletePromises);
    }
    return true;
  } catch (error) {
    console.error("Error resetting inventory:", error);
    return false;
  }
};

// Initialize inventory (if not exists)
export const initInventory = async (data) => {
  await setDoc(inventoryDocRef, data);
};

// Update inventory
export const updateInventory = async (updatedData) => {
  await updateDoc(inventoryDocRef, updatedData);
};
