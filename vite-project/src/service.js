import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc, // Used for creating new documents in a collection (e.g., a new log)
  query, // Used to build complex queries
  getDocs, // Used to fetch a collection (instead of a single document)
  orderBy, // Used for sorting data (e.g., logs by time)
  limit, // Used to cap results
} from "firebase/firestore";

// --- Single Document References (for static/summary data) ---
// This document should only hold small, static, or aggregate data
// (e.g., total sales figure, global app status, fixed configs).
const inventorySummaryRef = doc(collection(db, "inventory_summary"), "main");

// --- Collection References (for growing lists) ---
const productionOrdersCollection = collection(db, "production_orders");
const plateBOMsCollection = collection(db, "plate_boms");
const logsCollection = collection(db, "logs");
const l1ComponentsCollection = collection(db, "l1_components"); // L1 Raw Materials
const l2ComponentsCollection = collection(db, "l2_components"); // L2 Assembly/Finished Components

// =======================================================
// 1. Inventory Summary (Keep this simple and small)
// =======================================================

// Fetch the static/summary part of the inventory
export const fetchInventorySummary = async () => {
  const snap = await getDoc(inventorySummaryRef);
  if (!snap.exists()) return null;
  // This should now ONLY return fixed/aggregate data, not frequently changing quantities.
  return snap.data();
};

// Update the summary part of the inventory (use this sparingly)
export const updateInventorySummary = async (updatedData) => {
  await updateDoc(inventorySummaryRef, updatedData);
};

// =======================================================
// 2. Component Inventory Operations (Each component is a document)
// =======================================================

// Helper function to get the correct collection reference
const getComponentCollection = (level) => {
  if (level === "L1") return l1ComponentsCollection;
  if (level === "L2") return l2ComponentsCollection;
  throw new Error("Invalid component level. Must be 'L1' or 'L2'.");
};

/**
 * Fetches details (including current quantity) for a specific component.
 * @param {string} level - The component level ('L1' or 'L2').
 * @param {string} componentId - The ID of the component (e.g., 'PD-001').
 */
export const fetchComponent = async (level, componentId) => {
  const componentRef = doc(getComponentCollection(level), componentId);
  const snap = await getDoc(componentRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

/**
 * Updates the quantity of a specific component.
 * @param {string} level - The component level ('L1' or 'L2').
 * @param {string} componentId - The ID of the component (e.g., 'PD-001').
 * @param {object} updatedFields - The fields to update, e.g., { quantity: 150 }.
 */
export const updateComponentQuantity = async (
  level,
  componentId,
  updatedFields
) => {
  const componentRef = doc(getComponentCollection(level), componentId);
  await updateDoc(componentRef, updatedFields);
};

// =======================================================
// 3. Logs Operations (Log is a document with its own ID)
// =======================================================

// Add a new log entry
// This is an ADD operation, NOT an array update on the main doc.
export const addLogEntry = async (logData) => {
  // Add a timestamp so we can query them easily
  const logWithTimestamp = { ...logData, timestamp: Date.now() };
  return await addDoc(logsCollection, logWithTimestamp);
};

// Fetch the most recent logs (you should NEVER load all of them)
export const fetchRecentLogs = async (count = 50) => {
  const q = query(logsCollection, orderBy("timestamp", "desc"), limit(count));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// =======================================================
// 4. Production Orders Operations (Each order is a document)
// =======================================================

// Create a new production order
export const createProductionOrder = async (orderData) => {
  return await addDoc(productionOrdersCollection, orderData);
};

// Update a single production order (using the order ID)
export const updateProductionOrder = async (orderId, updatedFields) => {
  const orderRef = doc(productionOrdersCollection, orderId);
  await updateDoc(orderRef, updatedFields);
};

// Fetch all open production orders
export const fetchProductionOrders = async () => {
  // You can add a 'where' clause here to filter by 'status: "open"'
  const q = query(productionOrdersCollection);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
