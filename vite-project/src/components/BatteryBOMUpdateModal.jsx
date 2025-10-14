// src/components/BatteryBOMUpdateModal.js
import React, { useState, useEffect } from "react";
import batteryBOMData from "../data/batteryBOM";

const BatteryBOMUpdateModal = ({
  isOpen,
  onClose,
  inventory,
  setInventory,
}) => {
  const [bom, setBOM] = useState({});

  useEffect(() => {
    setBOM({ ...batteryBOMData });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (material, value) => {
    const newVal = parseFloat(value) || 0;
    setBOM((prev) => ({ ...prev, [material]: newVal }));
  };

  const handleSave = () => {
    // Update batteryBOM data (in-memory)
    Object.keys(bom).forEach((key) => {
      batteryBOMData[key] = bom[key];
    });

    // Optional: add log to inventory
    const timestamp = new Date().toLocaleString();
    const updatedLogs = [
      ...inventory.logs,
      {
        timestamp,
        action: `🔧 Battery BOM updated: ${Object.entries(bom)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}`,
      },
    ];
    setInventory({ ...inventory, logs: updatedLogs });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Update Battery BOM</h2>

        <div className="space-y-3">
          {Object.entries(bom).map(([material, qty]) => (
            <div key={material} className="flex justify-between items-center">
              <span className="capitalize">{material}</span>
              <input
                type="number"
                min="0"
                value={qty}
                onChange={(e) => handleChange(material, e.target.value)}
                className="border px-2 py-1 rounded w-24"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatteryBOMUpdateModal;
