import React, { useState, useEffect } from "react";
import batteryBOM from "../data/batteryBOM";
import BulkStockUpdateModal from "./BulkStockUpdateModal";
import { fetchInventory } from "../firebaseService";

const LOW_STOCK_THRESHOLD = 10; // low stock warning limit

const Inventory = () => {
  const [showMaterials, setShowMaterials] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to safely render numbers
  const safeNumber = (val) => (isNaN(val) || val == null ? 0 : val);

  // 🔹 Fetch Inventory Data from Firebase
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const data = await fetchInventory();
        setInventory(data || {});
      } catch (error) {
        console.error("Error fetching inventory:", error);
        setInventory({});
      } finally {
        setLoading(false);
      }
    };
    loadInventory();
  }, []);

  // 🔸 Loading State
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <div className="text-center">
          <p className="text-lg animate-pulse">Loading Inventory...</p>
        </div>
      </div>
    );

  // 🔸 Empty or Missing Data
  if (!inventory)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-gray-600">
          <p className="text-2xl font-semibold mb-2">⚠️ No inventory data</p>
          <p className="text-gray-500">
            Please wait for inventory to load or refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 space-y-8">
        <h2 className="text-3xl font-bold text-center mb-6">
          📦 Inventory Overview
        </h2>

        {/* ✅ Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-white mb-8">
          <div className="bg-blue-500 p-4 rounded shadow text-center">
            <h4 className="text-lg font-semibold">In Production</h4>
            <p className="text-2xl">
              {safeNumber(
                inventory.productionOrders?.filter(
                  (order) => order.status === "started"
                ).length
              )}
            </p>
          </div>

          <div className="bg-yellow-500 p-4 rounded shadow text-center">
            <h4 className="text-lg font-semibold">In Assembly</h4>
            <p className="text-2xl">
              {safeNumber(
                inventory.assemblyOrders?.filter(
                  (order) => order.status === "started"
                ).length
              )}
            </p>
          </div>

          <div className="bg-red-500 p-4 rounded shadow text-center">
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

          <div className="bg-green-600 p-4 rounded shadow text-center">
            <h4 className="text-lg font-semibold">Products</h4>
            <p className="text-2xl">{safeNumber(inventory.finalProducts)}</p>
          </div>
        </div>

        {/* ✅ Raw Materials and Components Table */}
        <section>
          <div
            className="flex items-center justify-between cursor-pointer mb-3 border-b border-gray-300 pb-1"
            onClick={() => setShowMaterials((prev) => !prev)}
          >
            <h3 className="text-xl font-semibold">
              Raw Materials | L1 Production and Components | L2 Assembly
            </h3>
            <span className="text-gray-500 text-lg">
              {showMaterials ? "▼" : "►"}
            </span>
          </div>

          {showMaterials && (
            <div className="overflow-x-auto transition-all duration-300 ease-in-out">
              <table className="min-w-full border border-gray-300 rounded-md">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 border-b border-gray-300">
                      Item
                    </th>
                    <th className="text-left px-4 py-2 border-b border-gray-300">
                      Quantity
                    </th>
                    <th className="text-left px-4 py-2 border-b border-gray-300">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* 🔹 L1 Subheader */}
                  <tr className="bg-blue-50">
                    <td
                      colSpan="3"
                      className="px-4 py-2 font-semibold text-blue-800"
                    >
                      🔹 L1 | Battery : Raw Materials
                    </td>
                  </tr>

                  {Object.entries(inventory.l1_component || {}).map(
                    ([key, value]) => (
                      <tr
                        key={`raw-${key}`}
                        className={
                          safeNumber(value) <= LOW_STOCK_THRESHOLD
                            ? "bg-red-100 text-red-800 font-semibold"
                            : "bg-white"
                        }
                      >
                        <td className="px-4 py-2 capitalize border-b border-gray-200">
                          {key}
                        </td>
                        <td className="px-4 py-2 border-b border-gray-200">
                          {safeNumber(value)}
                        </td>
                        <td className="px-4 py-2 border-b border-gray-200">
                          Raw Material
                        </td>
                      </tr>
                    )
                  )}

                  {/* 🔸 L2 Subheader */}
                  <tr className="bg-green-50">
                    <td
                      colSpan="3"
                      className="px-4 py-2 font-semibold text-green-800"
                    >
                      🔸 L2 | Inverter: Components
                    </td>
                  </tr>

                  {Object.entries(inventory.l2_component || {}).map(
                    ([key, value]) => (
                      <tr key={`comp-${key}`} className="bg-white">
                        <td className="px-4 py-2 capitalize border-b border-gray-200">
                          {key}
                        </td>
                        <td className="px-4 py-2 border-b border-gray-200">
                          {safeNumber(value)}
                        </td>
                        <td className="px-4 py-2 border-b border-gray-200">
                          Component
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ✅ Production Orders */}
        <section>
          <h3 className="text-xl font-semibold mb-3 border-b border-gray-300 pb-1">
            🛠️ Production Orders
          </h3>
          {inventory.productionOrders?.length > 0 ? (
            <ul className="space-y-6">
              {inventory.productionOrders.map((order) => {
                const expectedMaterials = {};
                const discrepancies = [];

                if (order.status === "completed") {
                  Object.entries(order.materialsUsed || {}).forEach(
                    ([mat, qty]) => {
                      expectedMaterials[mat] =
                        (batteryBOM?.[mat] || 0) *
                        safeNumber(order.predictedOutput);
                    }
                  );

                  Object.entries(order.materialsUsed || {}).forEach(
                    ([mat, usedQty]) => {
                      const expected = expectedMaterials[mat] || 0;
                      if (safeNumber(usedQty) > expected) {
                        discrepancies.push(
                          `${mat}: used ${usedQty}, expected max ${expected}`
                        );
                      }
                    }
                  );

                  if (
                    safeNumber(order.actualOutput) <
                    safeNumber(order.predictedOutput)
                  ) {
                    discrepancies.push(
                      `Actual output ${safeNumber(
                        order.actualOutput
                      )} is less than predicted ${safeNumber(
                        order.predictedOutput
                      )}`
                    );
                  }
                }

                return (
                  <li
                    key={order.id}
                    className="bg-white shadow rounded p-4 border border-gray-200"
                  >
                    <p>
                      <strong>Order #{order.id}</strong> — Status:{" "}
                      <em className="capitalize">{order.status}</em> — Predicted
                      Output: {safeNumber(order.predictedOutput)} battery
                      {safeNumber(order.predictedOutput) !== 1 ? "ies" : ""}
                    </p>
                    <p>Started At: {order.timestamp}</p>
                    <div className="mt-2">
                      <p className="font-semibold">Materials Used:</p>
                      <ul className="list-disc list-inside ml-5 capitalize text-gray-700">
                        {Object.entries(order.materialsUsed || {}).map(
                          ([mat, qty]) => (
                            <li key={mat}>
                              {mat}: {safeNumber(qty)}
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    {order.status === "completed" &&
                      discrepancies.length > 0 && (
                        <div className="mt-4 border border-red-500 bg-red-50 text-red-800 p-3 rounded">
                          <strong className="block mb-1">
                            ⚠️ Discrepancy Report
                          </strong>
                          <ul className="list-disc list-inside text-sm">
                            {discrepancies.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No production orders yet.</p>
          )}
        </section>

        {/* ✅ Activity Logs */}
        <h3 className="text-xl font-semibold mt-10 mb-4">📜 Logs</h3>
        <ul className="space-y-2">
          {(inventory.logs || []).map((log, idx) => {
            const isDiscrepancy =
              log.action?.includes("⚠️") &&
              log.action?.toLowerCase().includes("discrepancy");

            return (
              <li
                key={idx}
                className={`border p-4 rounded-md ${
                  isDiscrepancy
                    ? "border-red-500 bg-red-50 text-red-800"
                    : "border-gray-300 bg-white"
                }`}
              >
                <div className="text-sm text-gray-500">{log.timestamp}</div>
                <div className="mt-1 text-base">
                  {isDiscrepancy ? (
                    <>
                      <strong className="block mb-1">
                        ⚠️ Discrepancy in Production Order
                      </strong>
                      <div className="whitespace-pre-wrap">
                        {log.action.replace("⚠️ ", "")}
                      </div>
                    </>
                  ) : (
                    <span>{log.action}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ✅ Bulk Stock Update Modal */}
      <BulkStockUpdateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        inventory={inventory}
        setInventory={setInventory}
      />
    </>
  );
};

export default Inventory;
