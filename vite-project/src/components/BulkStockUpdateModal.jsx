// ...existing code...
import React, { useState, useEffect } from "react";
import { updateInventory } from "../firebaseService";

const BulkStockUpdateModal = ({ isOpen, onClose, materials, setInventory }) => {
  const [stockData, setStockData] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && materials) {
      const items = Object.entries(materials || {}).map(([name, qty]) => ({
        name,
        qty: 0, // Start with 0 change, user can add/subtract
        available: qty,
        unit: "kg",
      }));
      setStockData(items);
      setShowConfirm(false);
    } else {
      setStockData([]);
      setShowConfirm(false);
    }
  }, [isOpen, materials]);

  if (!isOpen) return null;

  const handleChange = (index, value) => {
    const updated = [...stockData];
    updated[index].qty = Number(value) || 0;
    setStockData(updated);
  };

  // Preview modal before saving
  const handlePreview = () => {
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (!materials) return;

    const updatedL1 = { ...materials };
    const changes = [];
    let hasReduction = false;

    stockData.forEach(({ name, qty, available, unit }) => {
      const newQty = available + qty;
      if (available !== newQty) {
        changes.push(`${name}: ${available} → ${newQty} ${unit}`);
        if (newQty < available) {
          hasReduction = true;
        }
        updatedL1[name] = newQty;
      }
    });

    if (changes.length > 0) {
      const timestamp = new Date().toLocaleString();
      const newLog = {
        timestamp,
        action: hasReduction
          ? `⚠️ Discrepancy in Bulk stock update:\n${changes.join("\n")}`
          : `🔧 Bulk stock update:\n${changes.join("\n")}`,
        ...(hasReduction && { logType: "discrepency" }),
      };

      const updatedData = {
        ...materials,
        l1_component: updatedL1,
        logs: [...(materials.logs || []), newLog],
      };

      setInventory(updatedData);

      try {
        await updateInventory(updatedData);
        console.log("✅ Firebase inventory updated");
      } catch (err) {
        console.error("❌ Firebase update failed:", err);
      }
    }

    setShowConfirm(false);
    onClose();
  };

  // Prepare preview data
  const previewChanges = stockData
    .filter(({ qty }) => qty !== 0)
    .map(({ name, qty, available, unit }) => {
      const oldQty = available;
      const diff = qty;
      const newQty = available + qty;
      return {
        name,
        oldQty,
        newQty,
        unit,
        diff,
      };
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto shadow-lg">
        <h3 className="text-xl font-bold mb-4">🔧 Update Stock</h3>

        {showConfirm ? (
          <div>
            <h4 className="text-lg font-semibold mb-3">Confirm Changes</h4>
            {previewChanges.length > 0 ? (
              <ul className="space-y-2 mb-4">
                {previewChanges.map(({ name, oldQty, newQty, unit, diff }) => (
                  <li key={name} className="flex justify-between items-center">
                    <span className="capitalize">{name}:</span>
                    <span>
                      <span>
                        {oldQty} {unit}
                      </span>
                      {diff > 0 ? (
                        <span className="ml-2 text-green-600 font-bold">
                          +{diff} ({oldQty} + {diff} = {newQty} {unit})
                        </span>
                      ) : (
                        <span className="ml-2 text-red-600 font-bold">
                          {diff} ({oldQty} {diff} = {newQty} {unit})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No changes detected.</p>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Back
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                disabled={previewChanges.length === 0}
              >
                Confirm & Save
              </button>
            </div>
          </div>
        ) : (
          <>
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
                      min={-item.available}
                      placeholder={item.available}
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
                onClick={handlePreview}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                disabled={stockData.length === 0}
              >
                Preview & Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BulkStockUpdateModal;
