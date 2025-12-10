import React, { useState } from "react";
import { updateInventory } from "../firebaseService";
import { toast } from "react-toastify";

const AddProductModal = ({
  isOpen,
  onClose,
  inventory,
  setInventory,
  type, // "l1" or "l2"
}) => {
  if (!isOpen) return null;

  // ---- Multiple product rows ----
  const [rows, setRows] = useState([
    { productName: "", quantity: "", minThreshold: "", unit: "KG" },
  ]);

  const nextProductId = () => {
    const items =
      type === "l1" ? inventory.l1_component : inventory.l2_component;

    if (!items || items.length === 0) return "PD-001";

    const maxId = items
      .map((item) => parseInt(item.productId.split("-")[1], 10))
      .filter((n) => !isNaN(n))
      .reduce((a, b) => Math.max(a, b), 0);

    return `PD-${String(maxId + 1).padStart(3, "0")}`;
  };

  const addRow = () => {
    setRows([
      ...rows,
      { productName: "", quantity: "", minThreshold: "", unit: "KG" },
    ]);
  };

  const updateRow = (index, field, value) => {
    const copy = [...rows];
    copy[index][field] = value;
    setRows(copy);
  };

  const handleSubmit = () => {
    // Validate all rows
    for (let r of rows) {
      if (!r.productName.trim()) return alert("Product name required");
      if (!r.quantity) return alert("Quantity missing");
      if (!r.minThreshold) return alert("Threshold missing");
    }

    setInventory((prev) => {
      const copy = { ...prev };
      const target = type === "l1" ? "l1_component" : "l2_component";

      let idCounter = 0;

      const newItems = rows.map((r) => {
        idCounter++;
        const id = nextProductId().replace(/\d+$/, (n) =>
          String(Number(n) + idCounter - 1).padStart(3, "0")
        );

        return {
          productId: id,
          productName: r.productName.trim(),
          quantity: parseFloat(r.quantity),
          minThreshold: parseFloat(r.minThreshold),
          unit: r.unit,
        };
      });

      // Add all products
      copy[target] = [...copy[target], ...newItems];

      // Add logs
      newItems.forEach((item) => {
        copy.logs = [
          ...(copy.logs || []),
          {
            timestamp: new Date().toLocaleString(),
            action: `Added new ${target}: ${item.productName} (${item.productId})`,
            logType: "add-product",
          },
        ];
      });

      updateInventory(copy)
        .then(() => toast.success("Products added"))
        .catch(() => toast.error("Failed to add product"));

      return copy;
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-3xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Products</h2>

          <button
            className="text-black-900 hover:text-red-600 text-2xl leading-none"
            onClick={onClose}
          >
            X
          </button>
        </div>

        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
          {rows.map((row, index) => (
            <div
              key={index}
              className="border p-4 rounded-lg bg-gray-50 relative"
            >
              {/* DELETE ROW BUTTON */}
              {rows.length > 1 && (
                <button
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                  onClick={() => {
                    setRows(rows.filter((_, i) => i !== index));
                  }}
                >
                  ✖
                </button>
              )}

              <h4 className="mb-3 font-semibold">Product #{index + 1}</h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <input
                    type="text"
                    className="mt-1 w-full border p-2 rounded"
                    value={row.productName}
                    onChange={(e) =>
                      updateRow(index, "productName", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Qty</label>
                  <input
                    type="number"
                    className="mt-1 w-full border p-2 rounded"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(index, "quantity", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Min Threshold</label>
                  <input
                    type="number"
                    className="mt-1 w-full border p-2 rounded"
                    value={row.minThreshold}
                    onChange={(e) =>
                      updateRow(index, "minThreshold", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <select
                    className="mt-1 w-full border p-2 rounded"
                    value={row.unit}
                    onChange={(e) => updateRow(index, "unit", e.target.value)}
                  >
                    <option>KG</option>
                    <option>LTR</option>
                    <option>PCS</option>
                    <option>SET</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addRow} className="text-blue-600 underline mt-3">
          + Add Another Product
        </button>

        <div className="mt-6 flex justify-end space-x-3">
          <button className="px-4 py-2 rounded bg-gray-300" onClick={onClose}>
            Cancel
          </button>

          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white"
            onClick={handleSubmit}
          >
            Save All
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
