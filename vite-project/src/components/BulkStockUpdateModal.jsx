// src/materials/BulkStockUpdateModal.jsx
import React, { useState, useEffect } from "react";
import { updateInventory } from "../firebaseService"; // ✅ Firebase function

const BulkStockUpdateModal = ({ isOpen, onClose, materials, setInventory }) => {
  const [stockData, setStockData] = useState([]);
  console.log("🔄 Rendering BulkStockUpdateModal", materials);
  // 🧩 Load structured inventory data
  useEffect(() => {
    if (isOpen && materials) {
      const items = Object.entries(materials || {}).map(([name, qty]) => ({
        name,
        qty,
        unit: "kg",
      }));

      setStockData(items);
    } else {
      setStockData([]);
    }
  }, [isOpen, materials]);

  if (!isOpen) return null;

  // 🔄 Handle quantity change
  const handleChange = (index, value) => {
    const updated = [...stockData];
    updated[index].qty = Number(value) || 0;
    setStockData(updated);
  };

  // 💾 Save stock changes
  const handleSave = async () => {
    if (!materials) return;

    const updatedL1 = { ...materials };
    const changes = [];
    let hasReduction = false; // Track if any material is reduced

    stockData.forEach(({ name, qty, unit }) => {
      if (updatedL1[name] !== qty) {
        changes.push(`${name}: ${updatedL1[name]} → ${qty} ${unit}`);
        if (qty < updatedL1[name]) {
          hasReduction = true;
        }
        updatedL1[name] = qty;
      }
    });

    if (changes.length > 0) {
      const timestamp = new Date().toLocaleString();
      const newLog = {
        timestamp,
        action: hasReduction
          ? `⚠️ Discrepancy in Bulk stock update:\n${changes.join("\n")}`
          : `🔧 Bulk stock update:\n${changes.join("\n")}`,
        ...(hasReduction && { logType: "discrepency" }), // Add logType if any reduction
      };

      const updatedData = {
        ...materials,
        l1_component: updatedL1,
        // l2_component: materials.l2_component,
        logs: [...(materials.logs || []), newLog],
      };

      // ✅ Update UI instantly
      setInventory(updatedData);

      // ✅ Push to Firestore
      try {
        await updateInventory(updatedData);
        console.log("✅ Firebase inventory updated");
      } catch (err) {
        console.error("❌ Firebase update failed:", err);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto shadow-lg">
        <h3 className="text-xl font-bold mb-4">🔧 Update Stock</h3>

        {stockData.length > 0 ? (
          <div className="space-y-3">
            {stockData.map((item, index) => (
              <div
                key={item.name}
                className="flex justify-between items-center"
              >
                <span className="capitalize">
                  {item.name} ({item.unit})
                </span>
                <input
                  type="number"
                  min="0"
                  value={item.qty}
                  onChange={(e) => handleChange(index, e.target.value)}
                  className="border px-2 py-1 rounded w-24"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">
            ⚠️ No inventory data found.
          </p>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Save All
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkStockUpdateModal;
