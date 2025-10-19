import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // add this at the top
import batteryBOM from "../data/batteryBOM";
import BulkStockUpdateModal from "../components/BulkStockUpdateModal";
import { fetchInventory, initInventory } from "../firebaseService";

const LOW_STOCK_THRESHOLD = 10;

const Inventory = () => {
  const navigate = useNavigate(); // inside your component

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
          l1_component: {
            lead: 100,
            acid: 50,
            plastic: 75,
            copper: 200,
            lithium: 20,
          },
          l2_component: { battery: 20, casing: 120, transformer: 20 },
          logs: [],
          productionOrders: [],
          assemblyOrders: [],
          finalProducts: 0,
          batteryBOM: { lead: 2, acid: 1, plastic: 1, copper: 1, lithium: 1 },
        });
        data = await fetchInventory();
      }
      setInventory(data);
      setLoading(false);
    };
    loadInventory();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <p className="animate-pulse">Loading Inventory...</p>
      </div>
    );

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

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-3xl font-bold text-center mb-6">
        📦 Inventory Dashboard
      </h2>

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
        {/* <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "orders"
              ? "border-b-2 border-yellow-600 text-yellow-600"
              : "text-gray-600"
          }`}
        >
          Production Orders
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "logs"
              ? "border-b-2 border-gray-600 text-gray-600"
              : "text-gray-600"
          }`}
        >
          Logs
        </button> */}
        <button className="px-4 py-2 font-semibold text-gray-600 hover:text-blue-600">
          setting
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "l1" && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex justify-between">
            🔹 L1 | Battery Raw Materials
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setModalOpen(true)}
            >
              Update
            </button>
          </h3>

          <table className="min-w-full border border-gray-300 rounded-md mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-b">Material</th>
                <th className="px-4 py-2 border-b">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(inventory.l1_component || {}).map(
                ([key, val]) => (
                  <tr
                    key={key}
                    className={
                      safeNumber(val) <= LOW_STOCK_THRESHOLD
                        ? "bg-red-100 text-red-800 font-semibold"
                        : "bg-white"
                    }
                  >
                    <td className="px-4 py-2 border-b capitalize">{key}</td>
                    <td className="px-4 py-2 border-b">{safeNumber(val)}</td>
                  </tr>
                )
              )}
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
                <th className="px-4 py-2 border-b">Component</th>
                <th className="px-4 py-2 border-b">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(inventory.l2_component || {}).map(
                ([key, val]) => (
                  <tr key={key} className="bg-white">
                    <td className="px-4 py-2 border-b capitalize">{key}</td>
                    <td className="px-4 py-2 border-b">{safeNumber(val)}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* {activeTab === "orders" && (
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
                  // Calculate expected material usage
                  Object.entries(order.materialsUsed || {}).forEach(
                    ([mat, qty]) => {
                      expectedMaterials[mat] =
                        (batteryBOM?.[mat] || 0) *
                        safeNumber(order.predictedOutput);
                    }
                  );

                  // Check for discrepancies
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
                    className={`shadow rounded p-4 border ${
                      discrepancies.length > 0
                        ? "bg-red-100 border-red-300"
                        : order.status === "completed"
                        ? "bg-green-100 border-green-300"
                        : "bg-white border-gray-200"
                    }`}
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
                        <div className="mt-4 border border-red-50 bg-red-50 text-black-800 p-3 rounded">
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
      )}

      {activeTab === "logs" && (
        <div>
          <h3 className="text-xl font-semibold mt-10 mb-4">📜 Logs</h3>

          <ul className="space-y-2">
            {(inventory.logs || []).map((log, idx) => {
              const isDiscrepancy = log.logType === "discrepency";

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
                          ⚠️ Discrepancy Alert
                        </strong>
                        <div className="whitespace-pre-wrap">
                          {log.action.replace("⚠️ ", "")}
                        </div>
                      </>
                    ) : (
                      <>
                        <span>{log.action}</span>
                        <div>{log?.remarks}</div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )} */}

      {/* Bulk Stock Update Modal */}
      <BulkStockUpdateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        materials={inventory.l1_component}
        setInventory={setInventory}
      />
    </div>
  );
};

export default Inventory;
