// // BulkL2UpdateModal.jsx
// import React, { useState, useEffect } from "react";
// import { updateInventory } from "../firebaseService";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const BulkL2UpdateModal = ({ isOpen, onClose, materials, setInventory }) => {
//   const [stockData, setStockData] = useState([]);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [remarks, setRemarks] = useState("");

//   useEffect(() => {
//     if (isOpen && materials) {
//       let items = [];
//       if (Array.isArray(materials)) {
//         items = materials.map((m) => ({
//           productId: m.productId,
//           productName: m.productName || m.name || m.productId,
//           qty: 0,
//           available: m.quantity ?? m.qty ?? 0,
//           unit: m.unit || "PCS",
//         }));
//       } else if (typeof materials === "object") {
//         items = Object.entries(materials || {}).map(([name, qty]) => ({
//           productId: name,
//           productName: name,
//           qty: 0,
//           available: qty,
//           unit: "PCS",
//         }));
//       }
//       setStockData(items);
//       setShowConfirm(false);
//       setRemarks("");
//     } else {
//       setStockData([]);
//       setShowConfirm(false);
//       setRemarks("");
//     }
//   }, [isOpen, materials]);

//   if (!isOpen) return null;

//   const handleChange = (index, value) => {
//     const updated = [...stockData];
//     updated[index].qty = value === "" ? 0 : Number(value);
//     setStockData(updated);
//   };

//   const handlePreview = () => setShowConfirm(true);

//   const handleConfirmSave = async () => {
//     if (!materials) return;

//     const changes = [];
//     let hasReduction = false;

//     const baseArray = Array.isArray(materials)
//       ? materials.map((m) => ({ ...m }))
//       : [];

//     stockData.forEach(({ productId, productName, qty, available, unit }) => {
//       const newQty = (available ?? 0) + (qty ?? 0);
//       if ((available ?? 0) !== newQty) {
//         const diff = newQty - (available ?? 0);
//         const diffWithSign = diff > 0 ? `+${diff}` : `${diff}`;
//         if (newQty < (available ?? 0)) {
//           changes.push(
//             `⚠️ ${productName}: ${available} → ${newQty} ${unit} {${diffWithSign}}`
//           );
//           hasReduction = true;
//         } else {
//           changes.push(
//             `${productName}: ${available} → ${newQty} ${unit} {${diffWithSign}}`
//           );
//         }

//         const idx = baseArray.findIndex(
//           (it) => it.productId === productId || it.productName === productName
//         );
//         if (idx !== -1) {
//           baseArray[idx] = { ...baseArray[idx], quantity: newQty };
//         } else {
//           baseArray.push({ productId, productName, unit, quantity: newQty });
//         }
//       }
//     });

//     if (changes.length > 0) {
//       const timestamp = new Date().toLocaleString();
//       const newLog = {
//         timestamp,
//         action: hasReduction
//           ? `⚠️ Discrepancy in Assembly stock update:\n${changes.join("\n")}`
//           : `🔧 Assembly stock update:\n${changes.join("\n")}`,
//         ...(hasReduction && { logType: "discrepancy" }),
//         ...(remarks && { remarks }),
//       };

//       let updatedInventory = { l2_component: baseArray, logs: [newLog] };

//       setInventory((prev) => {
//         if (prev && typeof prev === "object") {
//           const merged = {
//             ...prev,
//             l2_component: baseArray,
//             logs: [...(prev.logs || []), newLog],
//           };
//           updatedInventory = merged;
//           return merged;
//         }
//         return updatedInventory;
//       });

//       try {
//         await updateInventory(updatedInventory);
//         toast.success("L2 stock updated successfully");
//         console.log("✅ Firebase L2 inventory updated");
//       } catch (err) {
//         console.error("❌ Firebase update failed:", err);
//         toast.error("Failed to update L2 inventory");
//       }
//     }

//     setShowConfirm(false);
//     onClose();
//   };

//   const previewChanges = stockData
//     .filter(({ qty }) => qty !== 0)
//     .map(({ productId, productName, qty, available, unit }) => {
//       const oldQty = available;
//       const diff = qty;
//       const newQty = available + qty;
//       return {
//         productId,
//         productName,
//         oldQty,
//         newQty,
//         unit,
//         diff,
//       };
//     });

//   return (
//     <div className="fixed inset-0 flex items-center justify-center z-50 px-4 sm:px-0 bg-black/40 backdrop-blur-sm ">
//       <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[700px] max-h-[85vh] shadow-lg overflow-y-auto">
//         <h3 className="text-lg sm:text-xl font-bold mb-4 text-center gap-2 flex justify-between items-center">
//           🔧 Update L2 Stock
//           <button className="text-black-600 cursor-pointer" onClick={onClose}>
//             X
//           </button>
//         </h3>

//         {showConfirm ? (
//           <div>
//             <h4 className="text-base sm:text-lg font-semibold mb-3 text-center sm:text-left">
//               Confirm L2 Changes
//             </h4>

//             {previewChanges.length > 0 ? (
//               <div className="overflow-x-auto">
//                 <table className="min-w-full border border-gray-300 rounded-lg text-sm sm:text-base">
//                   <thead className="bg-gray-100">
//                     <tr>
//                       <th className="text-left px-2 sm:px-4 py-2 border-b">
//                         Item
//                       </th>
//                       <th className="text-left px-2 sm:px-4 py-2 border-b">
//                         Old
//                       </th>
//                       <th className="text-left px-2 sm:px-4 py-2 border-b">
//                         Change
//                       </th>
//                       <th className="text-left px-2 sm:px-4 py-2 border-b">
//                         New
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {previewChanges.map(
//                       ({
//                         productId,
//                         productName,
//                         oldQty,
//                         newQty,
//                         unit,
//                         diff,
//                       }) => (
//                         <tr
//                           key={productId}
//                           className="border-b hover:bg-gray-50"
//                         >
//                           <td className="capitalize px-2 sm:px-4 py-2">
//                             {productName}
//                           </td>
//                           <td className="px-2 sm:px-4 py-2">
//                             {oldQty} {unit}
//                           </td>
//                           <td
//                             className={`px-2 sm:px-4 py-2 font-semibold ${
//                               diff > 0
//                                 ? "text-green-600"
//                                 : diff < 0
//                                 ? "text-red-600"
//                                 : ""
//                             }`}
//                           >
//                             {diff > 0 ? `+${diff}` : diff}
//                           </td>
//                           <td className="px-2 sm:px-4 py-2">
//                             {newQty} {unit}
//                           </td>
//                         </tr>
//                       )
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             ) : (
//               <p className="text-gray-500 text-center sm:text-left">
//                 No L2 changes detected.
//               </p>
//             )}

//             {/* Remarks */}
//             <div className="mt-4">
//               <label
//                 className="block text-sm font-medium mb-1"
//                 htmlFor="remarks"
//               >
//                 Remarks (optional):
//               </label>
//               <textarea
//                 id="remarks"
//                 value={remarks}
//                 onChange={(e) => setRemarks(e.target.value)}
//                 className="border rounded px-2 py-1 w-full resize-none text-sm sm:text-base"
//                 rows={2}
//                 placeholder="Add remarks for this update..."
//               />
//             </div>

//             <div className="flex flex-col sm:flex-row justify-end sm:space-x-3 mt-6 space-y-2 sm:space-y-0">
//               <button
//                 onClick={() => setShowConfirm(false)}
//                 className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base"
//               >
//                 Back
//               </button>
//               <button
//                 onClick={handleConfirmSave}
//                 className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base disabled:opacity-50"
//                 disabled={previewChanges.length === 0}
//               >
//                 Confirm & Save
//               </button>
//             </div>
//           </div>
//         ) : (
//           <>
//             {stockData.length > 0 ? (
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-12">
//                 {[
//                   stockData.slice(0, Math.ceil(stockData.length / 2)),
//                   stockData.slice(Math.ceil(stockData.length / 2)),
//                 ].map((half, idx) => (
//                   <div key={idx} className="space-y-3">
//                     {half.map((item) => {
//                       const name = item.productName?.toLowerCase() || "";

//                       // Materials where only whole numbers (no decimals) are allowed
//                       const absoluteItems = [
//                         "positive plate",
//                         "negative plate",
//                         "separator",
//                         "container set",
//                         "thermocol",
//                         "indicator",
//                         "nutt bolt",
//                         "gelly pouch",
//                         "terminal cover",
//                         "polythene",
//                         "sticker",
//                         "box",
//                         "warranty card",
//                       ];

//                       const isAbsolute = absoluteItems.some((m) =>
//                         name.includes(m)
//                       );

//                       return (
//                         <div
//                           key={item.productId || item.productName}
//                           className="flex justify-between items-center"
//                         >
//                           <span className="capitalize text-sm sm:text-base">
//                             {item.productName} ({item.unit})
//                           </span>
//                           <input
//                             type="number"
//                             inputMode="numeric"
//                             placeholder={String(item.available)}
//                             value={item.qty === 0 ? "" : item.qty}
//                             onChange={(e) => {
//                               const val = e.target.value;

//                               if (val === "") {
//                                 handleChange(stockData.indexOf(item), "");
//                                 return;
//                               }

//                               const num = Number(val);
//                               if (isNaN(num)) return;

//                               if (isAbsolute) {
//                                 // Allow only integers (no decimals)
//                                 if (!/^-?\d+$/.test(val)) return;
//                               }

//                               // Restrict: negative not less than -available
//                               if (num < -item.available) return;

//                               handleChange(stockData.indexOf(item), val);
//                             }}
//                             className="border px-2 py-1 rounded w-20 sm:w-28 text-right text-sm sm:text-base"
//                           />
//                         </div>
//                       );
//                     })}
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-500 text-center py-6 text-sm sm:text-base">
//                 ⚠️ No L2 inventory data found.
//               </p>
//             )}

//             <div className="flex flex-col sm:flex-row justify-end sm:space-x-3 mt-6 space-y-2 sm:space-y-0">
//               <button
//                 onClick={onClose}
//                 className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handlePreview}
//                 className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base disabled:opacity-50"
//                 disabled={stockData.length === 0}
//               >
//                 Preview & Save
//               </button>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default BulkL2UpdateModal;
