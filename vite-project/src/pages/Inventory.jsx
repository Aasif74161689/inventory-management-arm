import React, { useState, useEffect } from "react";
import BulkStockUpdateModal from "../components/BulkStockUpdateModal";
import {
  fetchInventory,
  initInventory,
  updateInventory,
} from "../firebaseService";
import Loader from "../components/Loader";
import { ToastContainer, toast } from "react-toastify";

const LOW_STOCK_THRESHOLD = 10;

const Inventory = () => {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("l1"); // l1 | l2 | orders | logs

  const safeNumber = (val) => (isNaN(val) || val == null ? 0 : val);

  useEffect(() => {
    const loadInventory = async () => {
      let data = await fetchInventory();
      if (!data) {
        await initInventory({
          l1_component: [
            {
              productId: "PD-001",
              productName: "Positive Jali",
              category: "Lead Alloy",
              unit: "KG",
              quantity: 250,
              minThreshold: 10,
            },
            {
              productId: "PD-002",
              productName: "Negative Jali",
              category: "Lead Alloy",
              unit: "KG",
              quantity: 150,
              minThreshold: 10,
            },
            {
              productId: "PD-003",
              productName: "Part Die",
              category: "Lead Alloy",
              unit: "KG",
              quantity: 500,
              minThreshold: 5,
            },
            {
              productId: "PD-004",
              productName: "Positive Filling",
              category: "Oxide",
              unit: "KG",
              quantity: 300,
              minThreshold: 10,
            },
            {
              productId: "PD-005",
              productName: "Negative Pasting",
              category: "Oxide",
              unit: "KG",
              quantity: 320,
              minThreshold: 10,
            },
            {
              productId: "PD-006",
              productName: "Positive Filling",
              category: "Red Oxide",
              unit: "KG",
              quantity: 100,
              minThreshold: 10,
            },
            {
              productId: "PD-007",
              productName: "Berium",
              category: "Chemical",
              unit: "KG",
              quantity: 50,
              minThreshold: 10,
            },
            {
              productId: "PD-008",
              productName: "Carbon",
              category: "Chemical",
              unit: "KG",
              quantity: 40,
              minThreshold: 10,
            },
            {
              productId: "PD-009",
              productName: "Lignin",
              category: "Chemical",
              unit: "KG",
              quantity: 60,
              minThreshold: 10,
            },
            {
              productId: "PD-010",
              productName: "Fibre",
              category: "Chemical",
              unit: "KG",
              quantity: 80,
              minThreshold: 10,
            },
            {
              productId: "PD-011",
              productName: "DM Water",
              category: "Chemical",
              unit: "LTR",
              quantity: 200,
              minThreshold: 10,
            },
            {
              productId: "PD-012",
              productName: "Acid",
              category: "Chemical",
              unit: "LTR",
              quantity: 150,
              minThreshold: 10,
            },
            {
              productId: "PD-013",
              productName: "Bag",
              category: "Chemical",
              unit: "PCS",
              quantity: 100,
              minThreshold: 5,
            },
            {
              productId: "PD-014",
              productName: "Bottom",
              category: "Chemical",
              unit: "PCS",
              quantity: 100,
              minThreshold: 5,
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
          batteryBOM: [
            { productId: "PD-001", name: "Positive Jali", qty: 0.251 },
            { productId: "PD-002", name: "Negative Jali", qty: 0.152 },
            { productId: "PD-003", name: "Part Die", qty: 1.5 },
            {
              productId: "PD-004",
              name: "Positive Filling (Oxide)",
              qty: 0.258,
            },
            {
              productId: "PD-005",
              name: "Negative Pasting (Oxide)",
              qty: 0.312,
            },
            {
              productId: "PD-006",
              name: "Positive Filling (Red Oxide)",
              qty: 0.086,
            },
            { productId: "PD-007", name: "Berium", qty: 0.003125 },
            { productId: "PD-008", name: "Carbon", qty: 0.00078125 },
            { productId: "PD-009", name: "Lignin", qty: 0.0009375 },
            { productId: "PD-010", name: "Fibre", qty: 0.000375 },
            { productId: "PD-011", name: "DM Water", qty: 0.03125 },
            { productId: "PD-012", name: "Acid", qty: 0.019375 },
            { productId: "PD-013", name: "Bag", qty: 1 },
            { productId: "PD-014", name: "Bottom", qty: 1 },
          ],
        });
        data = await fetchInventory();
      }
      setInventory(data);
      setLoading(false);
    };
    loadInventory();
  }, []);

  if (loading) return <Loader />;

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

  // Non-invasive computed metric: Total L1 produced
  // Sum actualOutput for completed orders, fallback to predictedOutput when actual is missing
  const totalL1Produced = (inventory.productionOrders || [])
    .filter((o) => o != null)
    .reduce((sum, o) => {
      // only count completed orders by default; if you prefer to count all, remove the filter
      if (o.status && o.status !== "completed") return sum;
      const val = Number(o.actualOutput ?? o.predictedOutput ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-3xl font-bold text-center mb-6">
        📦 Inventory Dashboard
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-white mb-8">
        <div className="bg-blue-500 p-3 rounded shadow text-center h-20 flex flex-col justify-center items-center">
          <h4 className="text-lg font-semibold">In Production</h4>
          <p className="text-2xl">
            {safeNumber(
              inventory.productionOrders?.filter(
                (order) => order.status === "started"
              ).length
            )}
          </p>
        </div>

        <div className="bg-yellow-500 p-3 rounded shadow text-center h-20 flex flex-col justify-center items-center">
          <h4 className="text-lg font-semibold">In Assembly</h4>
          <p className="text-2xl">
            {safeNumber(
              inventory.assemblyOrders?.filter(
                (order) => order.status === "started"
              ).length
            )}
          </p>
        </div>

        <div className="bg-red-500 p-3 rounded shadow text-center h-20 flex flex-col justify-center items-center">
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

        {/* Plates Produced (computed) */}
        <div className="bg-indigo-500 p-3 rounded shadow text-center h-20 flex flex-col justify-center items-center">
          <h4 className="text-lg font-semibold">Plates Produced</h4>
          <p className="text-2xl">{totalL1Produced}</p>
        </div>

        <div className="bg-teal-500 p-3 rounded shadow text-center h-20 flex flex-col justify-center items-center">
          <h4 className="text-lg font-semibold">Assembled</h4>
          <p className="text-2xl">0</p>
        </div>

        <div className="bg-green-600 p-3 rounded shadow text-center h-20 flex flex-col justify-center items-center">
          <h4 className="text-lg font-semibold">Ready to Ship</h4>
          <p className="text-2xl">{safeNumber(inventory.finalProducts)}</p>
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
            <button
              className="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setModalOpen(true)}
            >
              Update
            </button>
          </h3>

          <table className="min-w-full border border-gray-300 rounded-md mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-b">Product ID</th>
                <th className="px-4 py-2 border-b">Product Name</th>
                <th className="px-4 py-2 border-b">Qty / Unit</th>
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
                    <tr className="bg-blue-100 text-left">
                      <td colSpan={3} className="px-4 py-2 font-bold">
                        {category}
                      </td>
                    </tr>
                    {items.map((item) => (
                      <tr
                        key={item.productId}
                        className={
                          safeNumber(item.quantity) <= LOW_STOCK_THRESHOLD
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
          <h3 className="text-xl font-semibold mb-4">
            🔸 L2 | Assembly Components
          </h3>
          <table className="min-w-full border border-gray-300 rounded-md mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-b">Product ID</th>
                <th className="px-4 py-2 border-b">Product Name</th>
                <th className="px-4 py-2 border-b">Qty / Unit</th>
              </tr>
            </thead>
            <tbody>
              {(inventory.l2_component || []).map((item) => (
                <tr
                  key={item.productId}
                  className={
                    safeNumber(item.quantity) <= LOW_STOCK_THRESHOLD
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
              <h4 className="text-lg font-semibold mb-3">
                L1 | Raw Material Settings
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {(inventory.l1_component || []).map((item) => (
                  <div
                    key={item.productId}
                    className={`border rounded p-4 shadow ${
                      safeNumber(item.quantity) <= LOW_STOCK_THRESHOLD
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm text-gray-500">
                          {item.productId}
                        </div>
                        <div className="text-lg font-semibold">
                          {item.productName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.category}
                        </div>
                        <div className="mt-2">
                          <span className="font-medium">Qty:</span>{" "}
                          {safeNumber(item.quantity)} {item.unit}
                        </div>
                        <div>
                          <span className="font-medium">Min Threshold:</span>{" "}
                          {safeNumber(item.minThreshold)} {item.unit}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <button
                          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                          onClick={async () => {
                            const input = window.prompt(
                              `Enter new BOM qty for ${item.productName} (per unit):`,
                              item.qty ?? ""
                            );
                            if (input == null) return;
                            const val = parseFloat(input);
                            if (isNaN(val)) return alert("Invalid number");
                            setInventory((prev) => {
                              const copy = { ...prev };
                              copy.batteryBOM = (copy.batteryBOM || []).map(
                                (it) =>
                                  it.productId === item.productId
                                    ? { ...it, qty: val }
                                    : it
                              );
                              updateInventory(copy)
                                .then(() => toast.success("BOM updated"))
                                .catch((e) => {
                                  console.error(e);
                                  toast.error("Failed to update BOM");
                                });
                              return copy;
                            });
                          }}
                        >
                          Update BOM
                        </button>

                        <button
                          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                          onClick={async () => {
                            const input = window.prompt(
                              `Enter new min threshold for ${item.productName}:`,
                              item.minThreshold ?? ""
                            );
                            if (input == null) return;
                            const val = parseFloat(input);
                            if (isNaN(val)) return alert("Invalid number");
                            setInventory((prev) => {
                              const copy = { ...prev };
                              copy.l1_component = (copy.l1_component || []).map(
                                (it) =>
                                  it.productId === item.productId
                                    ? { ...it, minThreshold: val }
                                    : it
                              );
                              updateInventory(copy)
                                .then(() => toast.success("Threshold updated"))
                                .catch((e) => {
                                  console.error(e);
                                  toast.error("Failed to update threshold");
                                });
                              return copy;
                            });
                          }}
                        >
                          Update Threshold
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3">
                L2 | Assembly Settings
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {(inventory.l2_component || []).map((item) => (
                  <div
                    key={item.productId}
                    className={`border rounded p-4 shadow ${
                      safeNumber(item.quantity) <= LOW_STOCK_THRESHOLD
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm text-gray-500">
                          {item.productId}
                        </div>
                        <div className="text-lg font-semibold">
                          {item.productName}
                        </div>
                        <div className="mt-2">
                          <span className="font-medium">Qty:</span>{" "}
                          {safeNumber(item.quantity)} {item.unit}
                        </div>
                        <div>
                          <span className="font-medium">Min Threshold:</span>{" "}
                          {safeNumber(item.minThreshold)} {item.unit}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <button
                          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                          onClick={async () => {
                            const input = window.prompt(
                              `Enter new BOM qty for ${item.productName} (per unit):`,
                              item.bomQty ?? ""
                            );
                            if (input == null) return;
                            const val = parseFloat(input);
                            if (isNaN(val)) return alert("Invalid number");
                            setInventory((prev) => {
                              const copy = { ...prev };
                              copy.l2_component = (copy.l2_component || []).map(
                                (it) =>
                                  it.productId === item.productId
                                    ? { ...it, bomQty: val }
                                    : it
                              );
                              updateInventory(copy)
                                .then(() => toast.success("BOM updated"))
                                .catch((e) => {
                                  console.error(e);
                                  toast.error("Failed to update BOM");
                                });
                              return copy;
                            });
                          }}
                        >
                          Update BOM
                        </button>

                        <button
                          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                          onClick={async () => {
                            const input = window.prompt(
                              `Enter new min threshold for ${item.productName}:`,
                              item.minThreshold ?? ""
                            );
                            if (input == null) return;
                            const val = parseFloat(input);
                            if (isNaN(val)) return alert("Invalid number");
                            setInventory((prev) => {
                              const copy = { ...prev };
                              copy.l2_component = (copy.l2_component || []).map(
                                (it) =>
                                  it.productId === item.productId
                                    ? { ...it, minThreshold: val }
                                    : it
                              );
                              updateInventory(copy)
                                .then(() => toast.success("Threshold updated"))
                                .catch((e) => {
                                  console.error(e);
                                  toast.error("Failed to update threshold");
                                });
                              return copy;
                            });
                          }}
                        >
                          Update Threshold
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Stock Update Modal */}
      <BulkStockUpdateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        materials={inventory.l1_component}
        setInventory={setInventory}
      />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Inventory;
