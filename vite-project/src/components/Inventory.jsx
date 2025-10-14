import React, { useState } from "react";
import batteryBOM from "../data/batteryBOM";
import BulkStockUpdateModal from "./BulkStockUpdateModal";

const LOW_STOCK_THRESHOLD = 10; // set your low stock limit here

const Inventory = ({ inventory }) => {
  const [showMaterials, setShowMaterials] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 space-y-8">
        <h2 className="text-3xl font-bold text-center mb-6">
          📦 Inventory Overview
        </h2>
        {/* Summary Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-white mb-8">
          <div className="bg-blue-500 p-4 rounded shadow text-center">
            <h4 className="text-lg font-semibold">In Production</h4>
            <p className="text-2xl">
              {inventory.productionOrders?.filter(
                (order) => order.status === "started"
              ).length || 0}
            </p>
          </div>

          <div className="bg-yellow-500 p-4 rounded shadow text-center">
            <h4 className="text-lg font-semibold">In Assembly</h4>
            <p className="text-2xl">
              {inventory.assemblyOrders?.filter(
                (order) => order.status === "started"
              ).length || 0}
            </p>
          </div>

          <div className="bg-red-500 p-4 rounded shadow text-center">
            <h4 className="text-lg font-semibold">Discrepancies</h4>
            <p className="text-2xl">
              {inventory.logs?.filter((log) =>
                log.action.toLowerCase().includes("discrepancy")
              ).length || 0}
            </p>
          </div>

          {/* New Badge - Material Consumption Analysis */}
          <div className="bg-green-600 p-4 rounded shadow text-center">
            <h4 className="text-lg font-semibold">Products</h4>
            <p className="text-2xl">{inventory.inverters}</p>
          </div>
        </div>
        {/* Merged Raw Materials and Components Table (Collapsible) */}

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
                  {/* L1 Subheader */}
                  <tr className="bg-blue-50">
                    <td
                      colSpan="3"
                      className="px-4 py-2 font-semibold text-blue-800"
                    >
                      🔹 L1 | Battery : Raw Materials
                    </td>
                  </tr>

                  {Object.entries(inventory.rawMaterials).map(
                    ([key, value]) => (
                      <tr
                        key={`raw-${key}`}
                        className={
                          value <= LOW_STOCK_THRESHOLD
                            ? "bg-red-100 text-red-800 font-semibold"
                            : "bg-white"
                        }
                      >
                        <td className="px-4 py-2 capitalize border-b border-gray-200">
                          {key}
                        </td>
                        <td className="px-4 py-2 border-b border-gray-200">
                          {value}
                        </td>
                        <td className="px-4 py-2 border-b border-gray-200">
                          Raw Material
                        </td>
                      </tr>
                    )
                  )}

                  {/* L2 Subheader */}
                  <tr className="bg-green-50">
                    <td
                      colSpan="3"
                      className="px-4 py-2 font-semibold text-green-800"
                    >
                      🔸 L2 | Inverter: Components
                    </td>
                  </tr>

                  {Object.entries(inventory.components).map(([key, value]) => (
                    <tr key={`comp-${key}`} className="bg-white">
                      <td className="px-4 py-2 capitalize border-b border-gray-200">
                        {key}
                      </td>
                      <td className="px-4 py-2 border-b border-gray-200">
                        {value}
                      </td>
                      <td className="px-4 py-2 border-b border-gray-200">
                        Component
                      </td>
                    </tr>
                  ))}

                  {/* Batteries from inventory.batteries as Component */}
                  <tr key="comp-batteries" className="bg-white">
                    <td className="px-4 py-2 capitalize border-b border-gray-200">
                      Batteries
                    </td>
                    <td className="px-4 py-2 border-b border-gray-200">
                      {inventory.batteries}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-200">
                      Component
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Production Orders */}
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
                  // calculate expected materials
                  Object.entries(order.materialsUsed).forEach(([mat, qty]) => {
                    expectedMaterials[mat] =
                      (batteryBOM?.[mat] || 0) * order.predictedOutput;
                  });

                  // compare used vs expected
                  Object.entries(order.materialsUsed).forEach(
                    ([mat, usedQty]) => {
                      const expected = expectedMaterials[mat] || 0;
                      if (usedQty > expected) {
                        discrepancies.push(
                          `${mat}: used ${usedQty}, expected max ${expected}`
                        );
                      }
                    }
                  );

                  // check if output is less than predicted
                  if (order.actualOutput < order.predictedOutput) {
                    discrepancies.push(
                      `Actual output ${order.actualOutput} is less than predicted ${order.predictedOutput}`
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
                      Output: {order.predictedOutput} battery
                      {order.predictedOutput !== 1 ? "ies" : ""}
                    </p>
                    <p>Started At: {order.timestamp}</p>
                    <div className="mt-2">
                      <p className="font-semibold">Materials Used:</p>
                      <ul className="list-disc list-inside ml-5 capitalize text-gray-700">
                        {Object.entries(order.materialsUsed).map(
                          ([mat, qty]) => (
                            <li key={mat}>
                              {mat}: {qty}
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    {/* ✅ Discrepancy Block */}
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
        {/* Activity Logs */}
        <h3 className="text-xl font-semibold mt-10 mb-4">📜 Logs</h3>
        <ul className="space-y-2">
          {inventory.logs.map((log, idx) => {
            const isDiscrepancy =
              log.action.includes("⚠️") &&
              log.action.toLowerCase().includes("discrepancy");

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
    </>
  );
};

export default Inventory;
