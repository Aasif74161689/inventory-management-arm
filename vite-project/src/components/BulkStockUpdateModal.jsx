// ...existing code...
import React, { useState, useEffect } from "react";
import { updateInventory } from "../firebaseService";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BulkStockUpdateModal = ({ isOpen, onClose, materials, setInventory }) => {
  const [stockData, setStockData] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (isOpen && materials) {
      // support two shapes:
      // 1) materials is an array of product objects (preferred)
      // 2) materials is a map object { name: qty }
      let items = [];
      if (Array.isArray(materials)) {
        items = materials.map((m) => ({
          productId: m.productId,
          productName: m.productName || m.name || m.productId,
          qty: 0,
          available: m.quantity ?? m.qty ?? 0,
          unit: m.unit || "KG",
        }));
      } else if (typeof materials === "object") {
        items = Object.entries(materials || {}).map(([name, qty]) => ({
          productId: name,
          productName: name,
          qty: 0,
          available: qty,
          unit: "KG",
        }));
      }
      setStockData(items);
      setShowConfirm(false);
      setRemarks("");
    } else {
      setStockData([]);
      setShowConfirm(false);
      setRemarks("");
    }
  }, [isOpen, materials]);

  if (!isOpen) return null;

  const handleChange = (index, value) => {
    const updated = [...stockData];
    // allow decimals
    updated[index].qty = value === "" ? 0 : Number(value);
    setStockData(updated);
  };

  // Preview modal before saving
  const handlePreview = () => {
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (!materials) return;

    // Build updated l1_component array from stockData
    const changes = [];
    let hasReduction = false;

    // We'll start from materials if it's an array, else try to read previous inventory via setInventory
    const baseArray = Array.isArray(materials)
      ? materials.map((m) => ({ ...m }))
      : [];

    stockData.forEach(({ productId, productName, qty, available, unit }) => {
      const newQty = (available ?? 0) + (qty ?? 0);
      if ((available ?? 0) !== newQty) {
        const diff = newQty - (available ?? 0);
        const diffWithSign = diff > 0 ? `+${diff}` : `${diff}`;
        if (newQty < (available ?? 0)) {
          changes.push(
            `⚠️ ${productName}: ${available} → ${newQty} ${unit} {${diffWithSign}}`
          );
          hasReduction = true;
        } else {
          changes.push(
            `${productName}: ${available} → ${newQty} ${unit} {${diffWithSign}}`
          );
        }

        // Update or add in baseArray
        const idx = baseArray.findIndex(
          (it) => it.productId === productId || it.productName === productName
        );
        if (idx !== -1) {
          baseArray[idx] = { ...baseArray[idx], quantity: newQty };
        } else {
          baseArray.push({ productId, productName, unit, quantity: newQty });
        }
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
        ...(remarks && { remarks }),
      };

      // Build updatedInventory: try to merge with previous inventory via setInventory(prev => ...)
      let updatedInventory = { l1_component: baseArray, logs: [newLog] };

      setInventory((prev) => {
        if (prev && typeof prev === "object") {
          const merged = {
            ...prev,
            l1_component: baseArray,
            logs: [...(prev.logs || []), newLog],
          };
          updatedInventory = merged;
          return merged;
        }
        return updatedInventory;
      });

      try {
        await updateInventory(updatedInventory);
        toast.success("Inventory updated successfully");
        console.log("✅ Firebase inventory updated");
      } catch (err) {
        console.error("❌ Firebase update failed:", err);
        toast.error("Failed to update inventory");
      }
    }

    setShowConfirm(false);
    onClose();
  };

  // Prepare preview data
  const previewChanges = stockData
    .filter(({ qty }) => qty !== 0)
    .map(({ productId, productName, qty, available, unit }) => {
      const oldQty = available;
      const diff = qty;
      const newQty = available + qty;
      return {
        productId,
        productName,
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
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 border-b">Item</th>
                      <th className="text-left px-4 py-2 border-b">Old</th>
                      <th className="text-left px-4 py-2 border-b">Change</th>
                      <th className="text-left px-4 py-2 border-b">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewChanges.map(
                      ({
                        productId,
                        productName,
                        oldQty,
                        newQty,
                        unit,
                        diff,
                      }) => (
                        <tr
                          key={productId}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="capitalize px-4 py-2">
                            {productName}
                          </td>
                          <td className="px-4 py-2">
                            {oldQty} {unit}
                          </td>
                          <td
                            className={`px-4 py-2 font-semibold ${
                              diff > 0
                                ? "text-green-600"
                                : diff < 0
                                ? "text-red-600"
                                : ""
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                          <td className="px-4 py-2">
                            {newQty} {unit}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No changes detected.</p>
            )}

            {/* Remarks input */}
            <div className="mt-4">
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="remarks"
              >
                Remarks (optional):
              </label>
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="border rounded px-2 py-1 w-full resize-none"
                rows={2}
                placeholder="Add remarks for this update..."
              />
            </div>

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
              <div className="flex gap-12">
                {/* Split stockData into two halves */}
                {[
                  stockData.slice(0, Math.ceil(stockData.length / 2)),
                  stockData.slice(Math.ceil(stockData.length / 2)),
                ].map((half, idx) => (
                  <div key={idx} className="flex-1 space-y-3">
                    {half.map((item, index) => (
                      <div
                        key={item.productId || item.productName}
                        className="flex justify-between items-center"
                      >
                        <span className="capitalize">
                          {item.productName} ({item.unit})
                        </span>
                        <input
                          type="number"
                          min={-item.available}
                          step="any"
                          placeholder={String(item.available)}
                          value={item.qty === 0 ? "" : item.qty}
                          onChange={(e) =>
                            handleChange(
                              stockData.indexOf(item), // keep correct index reference
                              e.target.value
                            )
                          }
                          className="border px-2 py-1 rounded w-28 text-right"
                        />
                      </div>
                    ))}
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
