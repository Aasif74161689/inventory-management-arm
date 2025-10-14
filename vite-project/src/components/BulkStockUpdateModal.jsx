import React, { useState, useEffect } from "react";

const BulkStockUpdateModal = ({ isOpen, onClose, inventory, setInventory }) => {
  const [stockData, setStockData] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Prepare modal data: all raw materials + components + finished goods
      const rawMaterials = Object.entries(inventory.rawMaterials).map(
        ([name, qty]) => ({
          name,
          qty,
          unit: "kg",
        })
      );
      const components = Object.entries(inventory.components).map(
        ([name, qty]) => ({
          name,
          qty,
          unit: "pc",
        })
      );
      const finished = [
        { name: "batteries", qty: inventory.batteries, unit: "pc" },
        { name: "inverters", qty: inventory.inverters, unit: "pc" },
      ];
      setStockData([...rawMaterials, ...components, ...finished]);
    }
  }, [isOpen, inventory]);

  if (!isOpen) return null;

  const handleChange = (index, value) => {
    const updated = [...stockData];
    updated[index].qty = parseFloat(value) || 0;
    setStockData(updated);
  };

  const handleSave = () => {
    const updatedRawMaterials = { ...inventory.rawMaterials };
    const updatedComponents = { ...inventory.components };
    let updatedBatteries = inventory.batteries;
    let updatedInverters = inventory.inverters;

    const changes = [];

    stockData.forEach(({ name, qty, unit }) => {
      if (updatedRawMaterials[name] !== undefined) {
        if (updatedRawMaterials[name] !== qty) {
          changes.push(
            `${name}: ${updatedRawMaterials[name]} → ${qty} ${unit}`
          );
          updatedRawMaterials[name] = qty;
        }
      } else if (updatedComponents[name] !== undefined) {
        if (updatedComponents[name] !== qty) {
          changes.push(`${name}: ${updatedComponents[name]} → ${qty} ${unit}`);
          updatedComponents[name] = qty;
        }
      } else if (name === "batteries") {
        if (updatedBatteries !== qty) {
          changes.push(`batteries: ${updatedBatteries} → ${qty} ${unit}`);
          updatedBatteries = qty;
        }
      } else if (name === "inverters") {
        if (updatedInverters !== qty) {
          changes.push(`inverters: ${updatedInverters} → ${qty} ${unit}`);
          updatedInverters = qty;
        }
      }
    });

    if (changes.length > 0) {
      const timestamp = new Date().toLocaleString();
      const newLog = {
        timestamp,
        action: `🔄 Bulk stock update: ${changes.join(", ")}`,
      };

      setInventory({
        ...inventory,
        rawMaterials: updatedRawMaterials,
        components: updatedComponents,
        batteries: updatedBatteries,
        inverters: updatedInverters,
        logs: [...inventory.logs, newLog],
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto shadow-lg">
        <h3 className="text-xl font-bold mb-4">🔧 Update Stock</h3>
        <div className="space-y-3">
          {stockData.map((item, index) => (
            <div key={item.name} className="flex justify-between items-center">
              <span className="capitalize">
                {item.name} ({item.unit})
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.qty}
                onChange={(e) => handleChange(index, e.target.value)}
                className="border px-2 py-1 rounded w-24"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 mt-4">
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
