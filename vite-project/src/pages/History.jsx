import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchInventory } from "../firebaseService";
import Loader from "../components/Loader";

const safeNumber = (val) => (isNaN(val) || val == null ? 0 : Number(val));

export default function History() {
  const navigate = useNavigate();
  const { id } = useParams(); // ✅ define before using it

  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(id ? "production" : "logs");
  const [productionFilter, setProductionFilter] = useState("all");
  const [assemblyFilter, setAssemblyFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchInventory();
        setInventory(
          data || { productionOrders: [], assemblyOrders: [], logs: [] }
        );
      } catch (err) {
        console.error("Error fetching inventory:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ✅ Highlight / scroll to the specific order when opened via tooltip
  useEffect(() => {
    if (id) {
      const path = window.location.pathname;

      // ✅ Detect which history type we came from
      if (path.includes("/assembly/")) {
        setSelected("assembly");
      } else {
        setSelected("production");
      }

      setTimeout(() => {
        const el = document.getElementById(`order-${id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, [id, inventory]);

  if (loading) return <Loader />;

  // const computeDiscrepancies = (order) => {
  //   const discrepancies = [];
  //   if (order.status === "completed") {
  //     const actualOutput = safeNumber(order.actualOutput);
  //     const predictedOutput = safeNumber(order.predictedOutput);

  //     if (actualOutput !== predictedOutput) {
  //       discrepancies.push(
  //         `Output mismatch: Predicted ${predictedOutput}, Actual ${actualOutput}`
  //       );
  //     }

  //     const expectedMaterials = {};
  //     const bomSource = inventory?.plateBOM || [];
  //     bomSource.forEach((bom) => {
  //       expectedMaterials[bom.productId] = parseFloat(
  //         (bom.qty * actualOutput).toFixed(4)
  //       );
  //     });

  //     Object.entries(order.materialsUsed || {}).forEach(([prodId, usedQty]) => {
  //       const expected = expectedMaterials[prodId] ?? 0;
  //       const used = safeNumber(usedQty);
  //       if (used !== expected) {
  //         const bom = (inventory?.plateBOM || []).find(
  //           (b) => b.productId === prodId
  //         );
  //         const name = bom?.name || bom?.productName || prodId;
  //         discrepancies.push(
  //           `${name}: used ${used}, expected ${expected} (for ${actualOutput} units)`
  //         );
  //       }
  //     });
  //   }
  //   return discrepancies;
  // };

  const computeDiscrepancies = (order) => {
    let issues = [];

    const actual = safeNumber(order.actualOutput);
    const predicted = safeNumber(order.predictedOutput);

    // Output mismatch
    if (actual !== predicted) {
      issues.push(`Output mismatch: Expected ${predicted}, Actual ${actual}`);
    }

    // Materials mismatch
    const bomList = [
      ...(inventory?.plateBOM?.positivePlateBOM || []),
      ...(inventory?.plateBOM?.negativePlateBOM || []),
    ];

    Object.entries(order.materialsUsed || {}).forEach(([prodId, usedQty]) => {
      const bom = bomList.find(
        (b) =>
          b.productId.toLowerCase() === prodId.toLowerCase() ||
          b.name?.toLowerCase() === prodId.toLowerCase()
      );

      const expectedQty = bom ? bom.qty * predicted : null;
      const displayName = bom?.name || bom?.productName || prodId;

      if (!usedQty || usedQty === 0) {
        issues.push(`${displayName} is missing or 0`);
      } else if (
        expectedQty !== null &&
        Number(usedQty) !== Number(expectedQty)
      ) {
        issues.push(
          `${displayName}: used ${usedQty}, expected ${expectedQty} (for ${predicted} units)`
        );
      }
    });

    return issues;
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

        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          Back
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        {["production", "assembly", "logs"].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelected(tab)}
            className={`px-4 py-2 -mb-px font-medium text-sm border-b-2 ${
              selected === tab
                ? tab === "production"
                  ? "border-blue-500 text-blue-600"
                  : tab === "assembly"
                  ? "border-green-500 text-green-600"
                  : "border-gray-500 text-gray-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Orders
          </button>
        ))}
      </div>

      {/* Production filter */}
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

      {/* Production Section */}
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
                  return status === productionFilter;
                })
                .map((order) => {
                  const discrepancies = computeDiscrepancies(order);

                  const cardClass =
                    order.status.toLowerCase() === "completed" &&
                    discrepancies.length === 0
                      ? "bg-green-50 border-green-300"
                      : discrepancies.length > 0
                      ? "bg-red-50 border-red-300"
                      : "bg-white border-gray-200";

                  return (
                    <li
                      key={order.id}
                      id={`order-${order.id}`}
                      className={`shadow-sm rounded p-4 border ${cardClass}`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-gray-800">
                            Order #{order.id} —{" "}
                            <span className="capitalize">{order.status}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.timestamp}
                          </p>
                        </div>
                        <div className="text-sm text-gray-700">
                          Predicted:{" "}
                          <strong>{safeNumber(order.predictedOutput)}</strong>
                          <br />
                          Actual: <strong>{order.actualOutput ?? "-"}</strong>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-700">
                        <p className="font-semibold mb-1">Materials Used</p>
                        <ul className="list-disc ml-5">
                          {Object.entries(order.materialsUsed || {}).map(
                            ([prodId, qty]) => {
                              const bomList = [
                                ...(inventory?.plateBOM?.positivePlateBOM ||
                                  []),
                                ...(inventory?.plateBOM?.negativePlateBOM ||
                                  []),
                              ];
                              const bom = bomList.find(
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

                      {/* Discrepancy Card */}
                      {discrepancies.length > 0 && (
                        <div className="mt-3 border border-red-300 bg-red-50 text-red-800 p-3 rounded shadow-sm">
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

      {/* Assembly Filter */}
      {selected === "assembly" && (
        <div className="mb-4">
          <select
            value={assemblyFilter}
            onChange={(e) => setAssemblyFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Assembly Orders</option>
            <option value="started">Started</option>
            <option value="completed">Completed</option>
            <option value="discrepancy">Completed (Discrepancy)</option>
          </select>
        </div>
      )}

      {/* Assembly Section */}
      {selected === "assembly" && (
        <section>
          {inventory.assemblyOrders?.length > 0 ? (
            <ul className="space-y-4">
              {inventory.assemblyOrders
                .filter((a) => {
                  const discrepancies = [];

                  if (a.status === "completed") {
                    const actualOutput = safeNumber(a.actualOutput);
                    const expectedOutput = safeNumber(
                      a.predictedOutput ?? a.units ?? 0
                    );

                    if (actualOutput !== expectedOutput) {
                      discrepancies.push(`Output mismatch`);
                    }

                    Object.entries(a.materialsUsed || {}).forEach(
                      ([mat, usedQty]) => {
                        const bomItem = inventory.inverterBOM?.find(
                          (item) =>
                            item.productId.toLowerCase() ===
                              mat.toLowerCase() ||
                            item.name.toLowerCase() === mat.toLowerCase()
                        );
                        const expectedQty = bomItem
                          ? bomItem.qty * (a.predictedOutput ?? a.units ?? 0)
                          : null;

                        if (!usedQty || usedQty === 0) {
                          discrepancies.push(`${mat} is missing or 0`);
                        } else if (
                          expectedQty !== null &&
                          Number(usedQty) !== Number(expectedQty)
                        ) {
                          discrepancies.push(
                            `${mat}: used ${usedQty}, expected ${expectedQty} (for ${
                              a.predictedOutput ?? a.units ?? 0
                            } units)`
                          );
                        }
                      }
                    );
                  }

                  const status = a.status.toLowerCase();
                  if (assemblyFilter === "all") return true;
                  if (assemblyFilter === "discrepancy")
                    return status === "completed" && discrepancies.length > 0;
                  return status === assemblyFilter;
                })
                .map((a) => {
                  const discrepancies = [];

                  if (a.status === "completed") {
                    const actualOutput = safeNumber(a.actualOutput);
                    const expectedOutput = safeNumber(
                      a.predictedOutput ?? a.units ?? 0
                    );

                    if (actualOutput !== expectedOutput) {
                      discrepancies.push(
                        `Output mismatch: Expected ${expectedOutput}, Actual ${actualOutput}`
                      );
                    }

                    Object.entries(a.materialsUsed || {}).forEach(
                      ([mat, usedQty]) => {
                        const bomItem = inventory.inverterBOM?.find(
                          (item) =>
                            item.productId.toLowerCase() ===
                              mat.toLowerCase() ||
                            item.name.toLowerCase() === mat.toLowerCase()
                        );

                        const displayName =
                          bomItem?.name || bomItem?.productName || mat;
                        const expectedQty = bomItem
                          ? bomItem.qty * (a.predictedOutput ?? a.units ?? 0)
                          : null;

                        if (!usedQty || usedQty === 0) {
                          discrepancies.push(`${displayName} is missing or 0`);
                        } else if (
                          expectedQty !== null &&
                          Number(usedQty) !== Number(expectedQty)
                        ) {
                          discrepancies.push(
                            `${displayName}: used ${usedQty}, expected ${expectedQty} (for ${
                              a.predictedOutput ?? a.units ?? 0
                            } units)`
                          );
                        }
                      }
                    );
                  }

                  const cardClass =
                    a.status === "completed" && discrepancies.length === 0
                      ? "bg-green-50 border-green-300"
                      : discrepancies.length > 0
                      ? "bg-red-50 border-red-300"
                      : "bg-white border-gray-200";

                  return (
                    <li
                      key={a.id}
                      id={`order-${a.id}`}
                      className={`shadow-sm rounded p-4 border ${cardClass}`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-gray-800">
                            Order #{a.id} —{" "}
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

                      <div className="mt-3 text-sm text-gray-700">
                        <p className="font-semibold mb-1">Materials Used</p>
                        <ul className="list-disc ml-5">
                          {Object.entries(a.materialsUsed || {}).map(
                            ([mat, qty]) => {
                              const bomItem = inventory.inverterBOM?.find(
                                (item) =>
                                  item.productId.toLowerCase() ===
                                    mat.toLowerCase() ||
                                  item.name.toLowerCase() === mat.toLowerCase()
                              );

                              const displayName =
                                bomItem?.name || bomItem?.productName || mat;

                              return (
                                <li key={mat} className="capitalize">
                                  {displayName}: {safeNumber(qty)}
                                </li>
                              );
                            }
                          )}
                        </ul>
                      </div>

                      {discrepancies.length > 0 && (
                        <div className="mt-3 border border-red-300 bg-red-50 text-red-800 p-3 rounded shadow-sm">
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
            <p className="text-gray-500 italic">No assembly orders yet.</p>
          )}
        </section>
      )}

      {/* Logs Section */}
      {selected === "logs" && (
        <section>
          {(inventory.logs || []).length > 0 ? (
            <ul className="space-y-3">
              {inventory.logs
                .slice()
                .reverse()
                .map((log, i) => {
                  const isDiscrepancy =
                    (log.action && log.action.includes("⚠️")) ||
                    log.logType === "discrepancy";
                  return (
                    <li
                      key={log.id ?? i}
                      className={` p-3 ${
                        isDiscrepancy ? "bg-red-50 text-red-800" : "bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-500">
                            {log.timestamp}
                          </p>
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
