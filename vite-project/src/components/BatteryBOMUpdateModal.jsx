// // src/components/BatteryBOMUpdateModal.jsx
// import React, { useState, useEffect } from "react";
// import { updateInventory } from "../firebaseService";
// // plateBOM is stored in inventory.plateBOM

// const BatteryBOMUpdateModal = ({
//   isOpen,
//   onClose,
//   inventory,
//   setInventory,
// }) => {
//   const [bom, setBOM] = useState([]);

//   useEffect(() => {
//     if (isOpen) {
//       setBOM(Array.isArray(inventory?.plateBOM) ? [...inventory.plateBOM] : []);
//     }
//   }, [isOpen, inventory]);

//   if (!isOpen) return null;

//   const handleChange = (productId, value) => {
//     const newVal = parseFloat(value) || 0;
//     setBOM((prev) =>
//       prev.map((b) => (b.productId === productId ? { ...b, qty: newVal } : b))
//     );
//   };

//   const handleSave = async () => {
//     // Persist updated BOM array into inventory and add a log
//     const existingLogs = inventory?.logs || [];
//     const timestamp = new Date().toLocaleString();
//     const updatedLogs = [
//       ...existingLogs,
//       {
//         timestamp,
//         action: `🔧 Battery BOM updated`,
//       },
//     ];

//     const updatedInventory = {
//       ...inventory,
//       plateBOM: bom,
//       logs: updatedLogs,
//     };

//     setInventory(updatedInventory);
//     try {
//       await updateInventory(updatedInventory);
//     } catch (e) {
//       console.error(e);
//     }

//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded shadow-lg w-96">
//         <h2 className="text-xl font-bold mb-4">Update Battery BOM</h2>

//         <div className="space-y-3">
//           {bom.map((b) => (
//             <div
//               key={b.productId}
//               className="flex justify-between items-center"
//             >
//               <span className="capitalize">
//                 {b.name || b.productName || b.productId}
//               </span>
//               <input
//                 type="number"
//                 min="0"
//                 step="any"
//                 value={b.qty}
//                 onChange={(e) => handleChange(b.productId, e.target.value)}
//                 className="border px-2 py-1 rounded w-24"
//               />
//             </div>
//           ))}
//         </div>

//         <div className="mt-6 flex justify-end space-x-3">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 rounded border hover:bg-gray-100"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSave}
//             className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
//           >
//             Save
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BatteryBOMUpdateModal;
