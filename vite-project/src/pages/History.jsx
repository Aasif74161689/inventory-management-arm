import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import batteryBOM from "../data/batteryBOM";
import { fetchInventory } from "../firebaseService";
import Loader from "../components/Loader";

const safeNumber = (val) => (isNaN(val) || val == null ? 0 : Number(val));

export default function History() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("logs"); // default to logs
  const [productionFilter, setProductionFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchInventory();
      setInventory(
        data || { productionOrders: [], assemblyOrders: [], logs: [] }
      );
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <Loader />;

  const computeDiscrepancies = (order) => {
    const discrepancies = [];

    if (order.status === "completed") {
      const actualOutput = safeNumber(order.actualOutput);
      const predictedOutput = safeNumber(order.predictedOutput);

      // Check output discrepancy
      if (actualOutput !== predictedOutput) {
        discrepancies.push(
          `Output mismatch: Predicted ${predictedOutput}, Actual ${actualOutput}`
        );
      }

      // Check material usage against actual output
      const expectedMaterials = {};
      batteryBOM.forEach((bom) => {
        expectedMaterials[bom.productId] = parseFloat(
          (bom.qty * actualOutput).toFixed(4)
        );
      });

      Object.entries(order.materialsUsed || {}).forEach(([prodId, usedQty]) => {
        const expected = expectedMaterials[prodId] ?? 0;
        const used = safeNumber(usedQty);

        if (used !== expected) {
          const bom = batteryBOM.find((b) => b.productId === prodId);
          const name = bom?.name || bom?.productName || prodId;
          discrepancies.push(
            `${name}: used ${used}, expected ${expected} (for ${actualOutput} units)`
          );
        }
      });
    }

    return discrepancies;
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Sticky header */}
      <div className="sticky top-4 z-20 bg-white/80 backdrop-blur-sm rounded-md px-4 py-3 mb-6 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📜 History</h1>
          <p className="text-sm text-gray-600">
            Choose section: Production orders · Assembly orders · Logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        <button
          onClick={() => setSelected("production")}
          className={`px-4 py-2 -mb-px font-medium text-sm border-b-2 ${
            selected === "production"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Production Orders
        </button>

        <button
          onClick={() => setSelected("assembly")}
          className={`px-4 py-2 -mb-px font-medium text-sm border-b-2 ${
            selected === "assembly"
              ? "border-green-500 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Assembly Orders
        </button>

        <button
          onClick={() => setSelected("logs")}
          className={`px-4 py-2 -mb-px font-medium text-sm border-b-2 ${
            selected === "logs"
              ? "border-gray-500 text-gray-800"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Logs
        </button>
      </div>
      {/* Production dropdown */}
      {selected === "production" && (
        <div className="mb-4">
          <select
            value={productionFilter}
            onChange={(e) => setProductionFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Production Orders</option>
            <option value="started">Started</option>
            <option value="completed">Completed</option>
            <option value="discrepancy">Completed (Discrepancy)</option>
          </select>
        </div>
      )}

      {/* Render production orders with filter applied */}
      {selected === "production" && (
        <section>
          {inventory.productionOrders?.length > 0 ? (
            <ul className="space-y-4">
              {inventory.productionOrders
                .filter((order) => {
                  const discrepancies = computeDiscrepancies(order);
                  const status = order.status.toLowerCase();

                  if (productionFilter === "all") return true;

                  if (productionFilter === "discrepancy")
                    return status === "completed" && discrepancies.length > 0;

                  // Map dropdown value "started" to actual status
                  const filterStatus =
                    productionFilter === "started"
                      ? "started"
                      : productionFilter;
                  return status === filterStatus;
                })
                .map((order) => {
                  const discrepancies = computeDiscrepancies(order);
                  const cardClass = discrepancies.length
                    ? "bg-red-50 border-red-300"
                    : order.status.toLowerCase() === "completed"
                    ? "bg-green-50 border-green-300"
                    : "bg-white border-gray-200";

                  return (
                    <li
                      key={order.id}
                      className={`shadow-sm rounded p-4 border ${cardClass}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div>
                          <p className="font-medium text-gray-800">
                            Order #{order.id} —{" "}
                            <span className="capitalize">{order.status}</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {order.timestamp}
                          </p>
                        </div>

                        <div className="mt-3 sm:mt-0 text-sm text-gray-700">
                          <div>
                            Predicted:{" "}
                            <strong>{safeNumber(order.predictedOutput)}</strong>
                          </div>
                          <div>
                            Actual: <strong>{order.actualOutput ?? "-"}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-700">
                        <p className="font-semibold mb-1">Materials Used</p>
                        <ul className="list-disc ml-5">
                          {Object.entries(order.materialsUsed || {}).map(
                            ([prodId, qty]) => {
                              const bom = batteryBOM.find(
                                (b) => b.productId === prodId
                              );
                              const name =
                                bom?.name || bom?.productName || prodId;
                              return (
                                <li key={prodId} className="capitalize">
                                  {name}: {safeNumber(qty)}
                                </li>
                              );
                            }
                          )}
                        </ul>
                      </div>

                      {discrepancies.length > 0 && (
                        <div className="mt-3 border border-red-300 bg-red-50 text-red-800 p-3 rounded">
                          <strong className="block mb-1">
                            ⚠️ Discrepancy Report
                          </strong>
                          <ul className="list-disc ml-5 text-sm">
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

      {selected === "assembly" && (
        <section>
          {inventory.assemblyOrders?.length > 0 ? (
            <ul className="space-y-4">
              {inventory.assemblyOrders.map((a) => {
                const discrepancies = [];

                // Only check discrepancies if status is completed
                if (a.status === "completed") {
                  const actualOutput = safeNumber(a.actualOutput);
                  const expectedOutput = safeNumber(
                    a.predictedOutput ?? a.units ?? 0
                  );

                  // Check output discrepancy
                  if (actualOutput !== expectedOutput) {
                    discrepancies.push(
                      `Output mismatch: Expected ${expectedOutput}, Actual ${actualOutput}`
                    );
                  }

                  // Check for missing/0 materials
                  Object.entries(a.materialsUsed || {}).forEach(
                    ([mat, qty]) => {
                      if (!qty || qty === 0)
                        discrepancies.push(`${mat} is missing or 0`);
                    }
                  );
                }

                // Card background logic
                const cardClass =
                  a.status === "completed" && discrepancies.length === 0
                    ? "bg-green-50 border-green-300"
                    : discrepancies.length > 0
                    ? "bg-red-50 border-red-300"
                    : "bg-white border-gray-200";

                return (
                  <li
                    key={a.id}
                    className={`shadow-sm rounded p-4 border ${cardClass}`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          Assembly #{a.id} —{" "}
                          <span className="capitalize">{a.status}</span>
                        </p>
                        <p className="text-sm text-gray-600">{a.timestamp}</p>
                      </div>
                      <div className="text-sm text-gray-700">
                        Predicted:{" "}
                        <strong>{a.predictedOutput ?? a.units ?? "-"}</strong>
                        <br />
                        Actual: <strong>{a.actualOutput ?? "-"}</strong>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <p className="font-semibold mb-1">Materials Used</p>
                      <ul className="list-disc ml-5">
                        {Object.entries(a.materialsUsed || {}).map(
                          ([mat, qty]) => (
                            <li key={mat} className="capitalize">
                              {mat}: {qty ?? "-"}
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    {discrepancies.length > 0 && (
                      <div className="mt-3 border border-red-300 bg-red-50 text-red-800 p-3 rounded">
                        <strong className="block mb-1">
                          ⚠️ Discrepancy Report
                        </strong>
                        <ul className="list-disc ml-5 text-sm">
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
            <p>No assembly orders yet.</p>
          )}
        </section>
      )}
      {selected === "logs" && (
        <section>
          {(inventory.logs || []).length > 0 ? (
            <ul className="space-y-3">
              {inventory.logs.map((log, i) => {
                const isDiscrepancy =
                  (log.action && log.action.includes("⚠️")) ||
                  log.logType === "discrepency" ||
                  log.logType === "discrepancy";

                return (
                  <li
                    key={i}
                    className={`border rounded p-3 ${
                      isDiscrepancy
                        ? "bg-red-50 border-red-300 text-red-800"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">{log.timestamp}</p>
                        <div className="mt-1 text-base whitespace-pre-wrap">
                          {isDiscrepancy ? (
                            <>
                              <strong className="block mb-1">
                                ⚠️ Discrepancy
                              </strong>
                              {log.action?.replace("⚠️ ", "")}
                            </>
                          ) : (
                            log.action
                          )}
                        </div>
                        {log.remarks && (
                          <div className="text-sm text-gray-600 mt-2">
                            {log.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No logs available.</p>
          )}
        </section>
      )}
    </div>
  );
}
