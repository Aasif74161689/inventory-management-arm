import React, { useState, useEffect } from "react";
// import BulkStockUpdateModal from "../components/BulkStockUpdateModal";
import {
  fetchInventory,
  initInventory,
  updateInventory,
} from "../firebaseService";
import Loader from "../components/Loader";
import { toast } from "react-toastify";
import AddProductModal from "../components/AddProductModal";
// import BulkL2UpdateModal from "../components/BulkL2UpdateModal";

import BulkUpdateModal from "../components/BulkUpdateModal";
import InventorySettingsSection from "../components/InventorySettingsSection";

const LOW_STOCK_THRESHOLD = 10;

// thissssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss
/////////////////////

const Inventory = () => {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isL1Open, setIsL1Open] = useState(false); // l1
  const [isL2Open, setIsL2Open] = useState(false); // l2
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddModalL2, setShowAddModalL2] = useState(false);
  const [activeTab, setActiveTab] = useState("l1"); // l1 | l2 | orders | logs

  const safeNumber = (val) => (isNaN(val) || val == null ? 0 : val);

  useEffect(() => {
    const loadInventory = async () => {
      let data = await fetchInventory();

      // If inventory exists but inverterBOM is missing, add it
      if (data && !data.inverterBOM) {
        data.inverterBOM = [
          { productId: "AS-001", name: "Positive Plate", qty: 12 },
          { productId: "AS-002", name: "Negative Plate", qty: 18 },
          { productId: "AS-003", name: "Separator", qty: 3 },
          { productId: "AS-004", name: "Container Set", qty: 1 },
          { productId: "AS-005", name: "Stool", qty: 0.88 },
          { productId: "AS-006", name: "Side Packing Jali", qty: 0.88 },
          { productId: "AS-007", name: "Thermocol", qty: 1 },
          { productId: "AS-008", name: "Indicator", qty: 6 },
          { productId: "AS-009", name: "Nutt Bolt", qty: 2 },
          { productId: "AS-010", name: "Gelly Pouch", qty: 1 },
          { productId: "AS-011", name: "Terminal Cover", qty: 2 },
          { productId: "AS-012", name: "Polythene", qty: 2 },
          { productId: "AS-013", name: "Sticker", qty: 2 },
          { productId: "AS-014", name: "Box", qty: 1 },
          { productId: "AS-015", name: "Warranty Card", qty: 1 },
          { productId: "AS-016", name: "Acid", qty: 30 },
        ];
        await updateInventory(data);
        console.log("✅ inverterBOM added to Firebase");
      }

      if (!data) {
        await initInventory({
          l1_component: [
            {
              productId: "PD-001",
              productName: "Lead Alloy",
              unit: "KG",
              quantity: 250,
              minThreshold: 10,
            },
            {
              productId: "PD-002",
              productName: "Gray Oxide",
              unit: "KG",
              quantity: 150,
              minThreshold: 10,
            },
            {
              productId: "PD-003",
              productName: "Red Oxide",
              unit: "KG",
              quantity: 500,
              minThreshold: 5,
            },
            {
              productId: "PD-004",
              productName: "Tub Bags",
              unit: "PCS",
              quantity: 300,
              minThreshold: 10,
            },
            {
              productId: "PD-005",
              productName: "DM Water",
              unit: "KG",
              quantity: 320,
              minThreshold: 10,
            },
            {
              productId: "PD-006",
              productName: "Acid",
              unit: "KG",
              quantity: 100,
              minThreshold: 10,
            },
            {
              productId: "PD-007",
              productName: "Carbon",
              unit: "KG",
              quantity: 50,
              minThreshold: 10,
            },
            {
              productId: "PD-008",
              productName: "Lignin",
              unit: "KG",
              quantity: 40,
              minThreshold: 10,
            },
            {
              productId: "PD-009",
              productName: "Sulphate",
              unit: "KG",
              quantity: 60,
              minThreshold: 10,
            },
            {
              productId: "PD-010",
              productName: "Fiber",
              unit: "KG",
              quantity: 80,
              minThreshold: 10,
            },
            {
              productId: "PD-011",
              productName: "Bottom Bar",
              unit: "PCS",
              quantity: 200,
              minThreshold: 10,
            },
            {
              productId: "PD-012",
              productName: "Raddi Paper",
              unit: "KG",
              quantity: 150,
              minThreshold: 10,
            },
          ],
          l2_component: [
            {
              productId: "AS-001",
              productName: "Positive Plate",
              unit: "PCS",
              quantity: 12,
              minThreshold: 10,
            },
            {
              productId: "AS-002",
              productName: "Negative Plate",
              unit: "PCS",
              quantity: 18,
              minThreshold: 10,
            },
            {
              productId: "AS-003",
              productName: "Separator",
              unit: "PCS",
              quantity: 3,
              minThreshold: 10,
            },
            {
              productId: "AS-004",
              productName: "Container Set",
              unit: "PCS",
              quantity: 1,
              minThreshold: 5,
            },
            {
              productId: "AS-005",
              productName: "Stool",
              unit: "KG",
              quantity: 0.88,
              minThreshold: 5,
            },
            {
              productId: "AS-006",
              productName: "Side Packing Jali",
              unit: "KG",
              quantity: 0.88,
              minThreshold: 5,
            },
            {
              productId: "AS-007",
              productName: "Thermocol",
              unit: "PCS",
              quantity: 1,
              minThreshold: 10,
            },
            {
              productId: "AS-008",
              productName: "Indicator",
              unit: "PCS",
              quantity: 6,
              minThreshold: 10,
            },
            {
              productId: "AS-009",
              productName: "Nutt Bolt",
              unit: "PCS",
              quantity: 2,
              minThreshold: 10,
            },
            {
              productId: "AS-010",
              productName: "Gelly Pouch",
              unit: "PCS",
              quantity: 1,
              minThreshold: 10,
            },
            {
              productId: "AS-011",
              productName: "Terminal Cover",
              unit: "PCS",
              quantity: 2,
              minThreshold: 10,
            },
            {
              productId: "AS-012",
              productName: "Polythene",
              unit: "PCS",
              quantity: 2,
              minThreshold: 10,
            },
            {
              productId: "AS-013",
              productName: "Sticker",
              unit: "PCS",
              quantity: 2,
              minThreshold: 10,
            },
            {
              productId: "AS-014",
              productName: "Box",
              unit: "PCS",
              quantity: 1,
              minThreshold: 10,
            },
            {
              productId: "AS-015",
              productName: "Warranty Card",
              unit: "PCS",
              quantity: 1,
              minThreshold: 10,
            },
            {
              productId: "AS-016",
              productName: "Acid",
              unit: "LTR",
              quantity: 30,
              minThreshold: 10,
            },
          ],

          logs: [],
          productionOrders: [],
          assemblyOrders: [],
          finalProducts: 0,

          plateBOM: {
            positivePlateBOM: [
              { productId: "PD-001", productName: "Lead Alloy", qty: 0.26 },
              { productId: "PD-002", productName: "Gray Oxide", qty: 0.25 },
              { productId: "PD-003", productName: "Red Oxide", qty: 0.084 },
              { productId: "PD-004", productName: "Tub Bags", qty: 1 },
              { productId: "PD-005", productName: "DM Water", qty: 0.315 },
              { productId: "PD-006", productName: "Acid", qty: 0.07 },
              { productId: "PD-011", productName: "Bottom Bar", qty: 1 },
            ],

            negativePlateBOM: [
              { productId: "PD-001", productName: "Lead Alloy", qty: 0.166 },
              { productId: "PD-002", productName: "Gray Oxide", qty: 0.304 },
              { productId: "PD-005", productName: "DM Water", qty: 0.045 },
              { productId: "PD-006", productName: "Acid", qty: 0.011 },
              { productId: "PD-007", productName: "Carbon", qty: 0.001 },
              { productId: "PD-008", productName: "Lignin", qty: 0.001 },
              { productId: "PD-009", productName: "Sulphate", qty: 0.003 },
              { productId: "PD-010", productName: "Fiber", qty: 0.0004 },
              { productId: "PD-012", productName: "Raddi Paper", qty: 0.06 },
            ],
          },
        });
        data = await fetchInventory();
      }
      setInventory(data);
      setLoading(false);
    };
    loadInventory();
  }, []);

  if (loading) return <Loader />;

  const handleBOMUpdate = async (item, bomPath) => {
    const currentBOM =
      inventory.plateBOM[bomPath].find((i) => i.productId === item.productId)
        ?.qty ?? 0;

    const input = window.prompt(
      `Enter new BOM qty for ${item.productName}:`,
      currentBOM
    );

    if (!input) return;

    const val = parseFloat(input);
    if (isNaN(val) || val <= 0) return alert("Invalid number");

    setInventory((prev) => {
      const copy = { ...prev };

      // Update qty
      copy.plateBOM[bomPath] = copy.plateBOM[bomPath].map((i) =>
        i.productId === item.productId ? { ...i, qty: val } : i
      );

      // ✅ Add log entry
      const logEntry = {
        timestamp: new Date().toLocaleString(),
        action: `🔧 L1 BOM Updated (${bomPath}): ${item.productName} → ${val}`,
        logType: "bom",
      };

      copy.logs = [...(prev.logs || []), logEntry];

      updateInventory(copy);
      return copy;
    });

    toast.success("BOM updated");
  };

  const handleThresholdUpdate = (productId, field, value) => {
    setInventory((prev) => {
      const copy = { ...prev };

      copy.l1_component = copy.l1_component.map((item) =>
        item.productId === productId
          ? { ...item, [field]: Number(value) }
          : item
      );

      // Find item for log message
      const updatedItem = prev.l1_component.find(
        (i) => i.productId === productId
      );

      // ✅ Add log entry
      const logEntry = {
        timestamp: new Date().toLocaleString(),
        action: `⚠️ L1 Threshold Updated: ${updatedItem?.productName} → ${value}`,
        logType: "threshold",
      };

      copy.logs = [...(prev.logs || []), logEntry];

      updateInventory(copy);
      return copy;
    });
  };

  const handleBOMUpdateL2 = async (item) => {
    const current =
      inventory.inverterBOM.find((i) => i.productId === item.productId)?.qty ??
      0;

    const input = window.prompt(
      `Enter new BOM qty for ${item.productName}:`,
      current
    );
    if (!input) return;

    const val = parseFloat(input);
    if (isNaN(val) || val <= 0) return alert("Invalid value");

    setInventory((prev) => {
      const copy = { ...prev };

      copy.inverterBOM = copy.inverterBOM.map((i) =>
        i.productId === item.productId ? { ...i, qty: val } : i
      );

      // ✅ Add log entry
      const logEntry = {
        timestamp: new Date().toLocaleString(),
        action: `🔧 L2 BOM Updated: ${item.productName} → ${val}`,
        logType: "bom",
      };

      copy.logs = [...(prev.logs || []), logEntry];

      updateInventory(copy);
      return copy;
    });

    toast.success("L2 BOM updated");
  };

  // const handleThresholdUpdateL2 = (productId, field, value) => {
  //   setInventory((prev) => {
  //     const copy = { ...prev };

  //     copy.l2_component = copy.l2_component.map((item) =>
  //       item.productId === productId
  //         ? { ...item, [field]: Number(value) }
  //         : item
  //     );

  //     updateInventory(copy); // save to Firebase
  //     return copy;
  //   });
  // };

  const handleThresholdUpdateL2 = (productId, field, value) => {
    setInventory((prev) => {
      const copy = { ...prev };

      copy.l2_component = copy.l2_component.map((item) =>
        item.productId === productId
          ? { ...item, [field]: Number(value) }
          : item
      );

      // Find item name for log
      const updatedItem = prev.l2_component.find(
        (i) => i.productId === productId
      );

      // ✅ Add log entry
      const logEntry = {
        timestamp: new Date().toLocaleString(),
        action: `⚠️ L2 Threshold Updated: ${updatedItem?.productName} → ${value}`,
        logType: "threshold",
      };

      copy.logs = [...(prev.logs || []), logEntry];

      updateInventory(copy);
      return copy;
    });
  };

  if (!inventory)
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        <div className="text-center">
          <p className="text-2xl font-semibold mb-2">⚠️ No inventory data</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );

  // Total Positive Plates produced
  const totalPositiveProduced =
    inventory.productionOrders
      ?.filter(
        (order) => order.bomType === "positive" && order.status === "completed"
      )
      .reduce((acc, order) => acc + (Number(order.actualOutput) || 0), 0) || 0;

  // Total Negative Plates produced
  const totalNegativeProduced =
    inventory.productionOrders
      ?.filter(
        (order) => order.bomType === "negative" && order.status === "completed"
      )
      .reduce((acc, order) => acc + (Number(order.actualOutput) || 0), 0) || 0;

  // Total Plates produced
  const totalPlatesProduced = totalPositiveProduced + totalNegativeProduced;

  // ✅ Low Stock Calculations
  const lowStockL1 = (inventory.l1_component || []).filter(
    (item) => safeNumber(item.quantity) <= safeNumber(item.minThreshold)
  ).length;

  const lowStockL2 = (inventory.l2_component || []).filter(
    (item) => safeNumber(item.quantity) <= safeNumber(item.minThreshold)
  ).length;

  const totalLowStock = lowStockL1 + lowStockL2;

  const positiveBOM = inventory?.plateBOM?.positivePlateBOM || [];
  const negativeBOM = inventory?.plateBOM?.negativePlateBOM || [];

  const positiveMaterials = inventory.l1_component.filter((item) =>
    positiveBOM.some((p) => p.productId === item.productId)
  );

  const negativeMaterials = inventory.l1_component.filter((item) =>
    negativeBOM.some((n) => n.productId === item.productId)
  );

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-3xl font-bold text-center mb-6">
        📦 Inventory Dashboard
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-cols-fr gap-4 text-white mb-8">
        <div className="bg-indigo-500 p-4 rounded shadow text-center h-28 flex flex-col justify-center items-center">
          <h4 className="text-lg font-semibold mb-2">Plates Produced</h4>
          <p className="text-2xl font-bold">Total: {totalPlatesProduced}</p>
          <div className="flex gap-4 mt-1 text-sm">
            <span>Positive: {totalPositiveProduced}</span>
            <span>Negative: {totalNegativeProduced}</span>
          </div>
        </div>

        <div className="bg-teal-500 p-4 rounded shadow text-center h-28 flex flex-col justify-center items-center">
          <h4 className="text-lg font-semibold">Low Stock</h4>
          <p className="text-2xl font-bold">{totalLowStock}</p>
          <p className="text-xs mt-1">
            L1: {lowStockL1} | L2: {lowStockL2}
          </p>
        </div>

        <div className="bg-green-600 p-4 rounded shadow text-center h-28 flex flex-col justify-center items-center">
          <h4 className="text-lg font-semibold">Batteries</h4>
          <p className="text-2xl">{safeNumber(inventory.finalProducts)}</p>
        </div>

        <div className="bg-red-500 p-4 rounded shadow text-center h-28 flex flex-col justify-center items-center">
          <h4 className="text-lg font-semibold">Discrepancies</h4>
          <p className="text-2xl">
            {safeNumber(
              inventory.logs?.filter(
                (log) =>
                  log.action?.includes("⚠️") &&
                  log.action?.toLowerCase().includes("discrepancy")
              ).length
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-300 mb-6">
        <button
          onClick={() => setActiveTab("l1")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "l1"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600"
          }`}
        >
          L1 Production / Inventory
        </button>
        <button
          onClick={() => setActiveTab("l2")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "l2"
              ? "border-b-2 border-green-600 text-green-600"
              : "text-gray-600"
          }`}
        >
          L2 Assembly / Inventory
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "settings"
              ? "border-b-2 border-purple-600 text-purple-600"
              : "text-gray-600"
          }`}
        >
          Settings
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "l1" && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex justify-between">
            🔹 L1 | Battery Raw Materials
            <div className="flex gap-2">
              <button
                className="px-4 py-1 rounded bg-blue-600  text-white hover:bg-blue-700 cursor-pointer"
                onClick={() => setShowAddModal("true")}
              >
                Add
              </button>

              <button
                className="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                onClick={() => setIsL1Open(true)}
              >
                Update
              </button>
            </div>
          </h3>

          <table className="min-w-full border border-gray-300 rounded-md mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-b text-left">Product ID</th>
                <th className="px-4 py-2 border-b text-left">Product Name</th>
                <th className="px-4 py-2 border-b text-left">Qty / Unit</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const grouped = {};
                (inventory.l1_component || []).forEach((item) => {
                  if (!grouped[item.category]) grouped[item.category] = [];
                  grouped[item.category].push(item);
                });

                return Object.entries(grouped).map(([category, items]) => (
                  <React.Fragment key={category}>
                    {/* <tr className="bg-blue-100 text-left">
                      <td colSpan={3} className="px-4 py-2 font-bold">
                        {category}
                      </td>
                    </tr> */}
                    {items.map((item) => (
                      <tr
                        key={item.productId}
                        className={
                          safeNumber(item.quantity) <=
                          Number(item.minThreshold ?? LOW_STOCK_THRESHOLD)
                            ? "bg-red-100 text-red-800 font-semibold"
                            : "bg-white"
                        }
                      >
                        <td className="px-4 py-2 border-b">{item.productId}</td>
                        <td className="px-4 py-2 border-b">
                          {item.productName}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {safeNumber(item.quantity)} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "l2" && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex justify-between">
            🔸 L2 | Assembly Components
            <div className="flex gap-2">
              <button
                className="px-4 py-1 rounded bg-blue-600  text-white hover:bg-blue-700 cursor-pointer"
                onClick={() => setShowAddModalL2("true")}
              >
                Add
              </button>
              <button
                className="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                onClick={() => setIsL2Open(true)}
              >
                Update
              </button>
            </div>
          </h3>
          <table className="min-w-full border border-gray-300 rounded-md mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-b text-left">Product ID</th>
                <th className="px-4 py-2 border-b text-left">Product Name</th>
                <th className="px-4 py-2 border-b text-left">Qty / Unit</th>
              </tr>
            </thead>
            <tbody>
              {(inventory.l2_component || []).map((item) => (
                <tr
                  key={item.productId}
                  className={
                    safeNumber(item.quantity) <=
                    Number(item.minThreshold ?? LOW_STOCK_THRESHOLD)
                      ? "bg-red-100 text-red-800 font-semibold"
                      : "bg-white"
                  }
                >
                  <td className="px-4 py-2 border-b">{item.productId}</td>
                  <td className="px-4 py-2 border-b">{item.productName}</td>
                  <td className="px-4 py-2 border-b">
                    {safeNumber(item.quantity)} {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings panel */}
      {activeTab === "settings" && (
        <div>
          <h3 className="text-xl font-semibold mb-4">⚙️ Settings</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              {/* <h4 className="text-lg font-semibold mb-3">
                L1 | Raw Material Settings
              </h4> */}

              <InventorySettingsSection
                title="L1 | Positive Plate"
                items={positiveMaterials}
                // items={inventory.l1_component.filter((item) =>
                //   item.productName.includes("Positive Plate")
                // )}
                bomSource="positivePlateBOM"
                lowStock={LOW_STOCK_THRESHOLD}
                updateThreshold={handleThresholdUpdate}
                updateBOM={handleBOMUpdate}
              />

              <InventorySettingsSection
                title="L1 | Negative Plate"
                items={negativeMaterials}
                // items={inventory.l1_component.filter((item) =>
                //   item.productName.includes("Negative Plate")
                // )}
                bomSource="negativePlateBOM"
                lowStock={LOW_STOCK_THRESHOLD}
                updateThreshold={handleThresholdUpdate}
                updateBOM={handleBOMUpdate}
              />
            </div>

            <div>
              <InventorySettingsSection
                title="L2 | Assembly Settings"
                items={inventory.l2_component}
                bomSource="inverterBOM"
                lowStock={LOW_STOCK_THRESHOLD}
                updateThreshold={handleThresholdUpdateL2}
                updateBOM={handleBOMUpdateL2}
              />
            </div>
          </div>
        </div>
      )}

      <BulkUpdateModal
        isOpen={isL1Open}
        onClose={() => setIsL1Open(false)}
        materials={inventory.l1_component}
        type="L1"
        setInventory={setInventory}
      />

      <BulkUpdateModal
        isOpen={isL2Open}
        onClose={() => setIsL2Open(false)}
        materials={inventory.l2_component}
        type="L2"
        setInventory={setInventory}
      />

      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        inventory={inventory}
        setInventory={setInventory}
        type="l1" // or "l2"
      />

      <AddProductModal
        isOpen={showAddModalL2}
        onClose={() => setShowAddModalL2(false)}
        inventory={inventory}
        setInventory={setInventory}
        type="l2" // or "l2"
      />
    </div>
  );
};

export default Inventory;
