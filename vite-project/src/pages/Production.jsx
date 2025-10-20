import React, { useState, useEffect } from "react";
import { fetchInventory, updateInventory } from "../firebaseService";
import Loader from "../components/Loader";

const Production = () => {
  const [inventory, setInventory] = useState(null);
  const [materialsInput, setMaterialsInput] = useState({});
  const [predictedOutput, setPredictedOutput] = useState(0);
  const [requiredOutput, setRequiredOutput] = useState("");
  const [actualOutputs, setActualOutputs] = useState({});
  const [openDetails, setOpenDetails] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchInventory();
        setInventory(data || {});
      } catch (err) {
        console.error("Error fetching inventory:", err);
        setInventory({});
      }
    })();
  }, []);

  // Use BOM from inventory if present, otherwise fallback to empty array
  const effectiveBOM = inventory?.batteryBOM || [];

  // Map BOM productId to inventory l1_component for easier access
  const l1Map = {};
  if (inventory?.l1_component) {
    inventory.l1_component.forEach((item) => {
      l1Map[item.productId] = item;
    });
  }

  // Initialize materialsInput keys based on BOM
  useEffect(() => {
    if (
      effectiveBOM &&
      effectiveBOM.length > 0 &&
      Object.keys(materialsInput).length === 0
    ) {
      const initial = {};
      effectiveBOM.forEach((bom) => {
        initial[bom.productId] = 0;
      });
      setMaterialsInput(initial);
    }
  }, [effectiveBOM, materialsInput]);

  const handleChange = (e, productId) => {
    setMaterialsInput({
      ...materialsInput,
      [productId]: parseFloat(e.target.value) || 0,
    });
  };

  // Calculate predicted output based on Required Output input
  useEffect(() => {
    if (!inventory?.l1_component) return;
    // Predicted output is what user wants (requiredOutput), but cannot exceed max possible
    const maxPossible = effectiveBOM.length
      ? Math.min(
          ...effectiveBOM.map((bom) => {
            const available = l1Map[bom.productId]?.quantity || 0;
            if (bom.qty === 0) return Infinity;
            return Math.floor(available / bom.qty);
          })
        )
      : 0;
    let output = parseFloat(requiredOutput) || 0;
    if (output > maxPossible) output = maxPossible;
    setPredictedOutput(output);
  }, [requiredOutput, inventory]);

  const handleRequiredOutputChange = (e) => {
    const value = parseFloat(e.target.value) || "";
    setRequiredOutput(value);

    if (value > 0) {
      const autofill = {};
      effectiveBOM.forEach((bom) => {
        autofill[bom.productId] = parseFloat((bom.qty * value).toFixed(4));
      });
      setMaterialsInput(autofill);
    } else {
      const reset = {};
      effectiveBOM.forEach((bom) => {
        reset[bom.productId] = 0;
      });
      setMaterialsInput(reset);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inventory) return;

    // Confirm start production with predicted count and material summary
    const materialSummary = effectiveBOM
      .map(
        (bom) =>
          `${bom.productName || bom.name}: ${
            materialsInput[bom.productId] || 0
          }`
      )
      .join("\n");

    const startConfirm = window.confirm(
      `Start production?\n\nPredicted output: ${predictedOutput} battery${
        predictedOutput !== 1 ? "s" : ""
      }\n\nMaterials to be consumed:\n${materialSummary}\n\nDo you want to continue?`
    );
    if (!startConfirm) return;

    const timestamp = new Date().toLocaleString();
    const updatedLogs = [...(inventory.logs || [])];
    const updatedOrders = [...(inventory.productionOrders || [])];

    // Find insufficient stock
    const insufficient = effectiveBOM
      .filter(
        (bom) =>
          (l1Map[bom.productId]?.quantity || 0) <
          (materialsInput[bom.productId] || 0)
      )
      .map((bom) => bom.productName);

    if (insufficient.length > 0) {
      updatedLogs.push({
        timestamp,
        action: `❌ Not enough stock for production: ${insufficient.join(
          ", "
        )}`,
      });

      const updatedInv = { ...inventory, logs: updatedLogs };
      setInventory(updatedInv);
      await updateInventory(updatedInv);

      alert(
        `Not enough stock for: ${insufficient
          .map((name) => {
            const bom = effectiveBOM.find((b) => b.productName === name);
            const prodId = bom.productId;
            return `${name} (needed: ${materialsInput[prodId]}, available: ${
              l1Map[prodId]?.quantity || 0
            })`;
          })
          .join(", ")}`
      );
      return;
    }

    // Deduct stock
    const updatedL1 = inventory.l1_component.map((item) => ({
      ...item,
      quantity: item.quantity - (materialsInput[item.productId] || 0),
    }));

    const newOrder = {
      id: updatedOrders.length + 1,
      materialsUsed: { ...materialsInput },
      status: "started",
      predictedOutput,
      timestamp,
    };

    updatedLogs.push({
      timestamp,
      action: `📦 Production started (Order #${newOrder.id}) - Predicted Output: ${predictedOutput}`,
    });

    const updatedInventory = {
      ...inventory,
      l1_component: updatedL1,
      productionOrders: [...updatedOrders, newOrder],
      logs: updatedLogs,
    };

    setInventory(updatedInventory);
    await updateInventory(updatedInventory);

    // Reset inputs
    const reset = {};
    effectiveBOM.forEach((bom) => {
      reset[bom.productId] = 0;
    });
    setMaterialsInput(reset);
    setPredictedOutput(0);
    setRequiredOutput("");
  };

  const handleActualOutputChange = (orderId, value) => {
    setActualOutputs({
      ...actualOutputs,
      [orderId]: parseFloat(value) || "",
    });
  };

  const handleCompleteProduction = async (orderId) => {
    if (!inventory) return;

    const actual = actualOutputs[orderId] || 0;

    // Confirm marking production complete
    const confirmDone = window.confirm(
      `Mark Order #${orderId} as completed?\n\nActual output: ${actual}\n\nProceed?`
    );
    if (!confirmDone) return;

    const timestamp = new Date().toLocaleString();

    const updatedOrders = inventory.productionOrders.map((order) =>
      order.id === orderId && order.status !== "completed"
        ? { ...order, status: "completed", actualOutput: actual }
        : order
    );

    const completedOrder = updatedOrders.find((o) => o.id === orderId);
    const newLogs = [
      { timestamp, action: `✅ Production completed for Order #${orderId}` },
    ];

    // Discrepancy detection for both output & material usage
    let discrepancyMessages = [];

    // Compare predicted vs actual output
    if (completedOrder && actual !== completedOrder.predictedOutput) {
      discrepancyMessages.push(
        `Output mismatch: Predicted ${completedOrder.predictedOutput}, Actual ${actual}`
      );
    }

    // Compare materials used vs expected (based on actual output)
    const expectedMaterials = {};
    effectiveBOM.forEach((bom) => {
      expectedMaterials[bom.productId] = parseFloat(
        (bom.qty * actual).toFixed(4)
      );
    });

    Object.entries(completedOrder.materialsUsed || {}).forEach(
      ([prodId, used]) => {
        const expected = expectedMaterials[prodId] ?? 0;
        if (used !== expected) {
          const bom = effectiveBOM.find((b) => b.productId === prodId);
          discrepancyMessages.push(
            `${bom?.productName || prodId}: used ${used}, expected ${expected}`
          );
        }
      }
    );

    if (discrepancyMessages.length > 0) {
      newLogs.push({
        timestamp,
        logType: "discrepency",
        action: `⚠️ Discrepancy in Order #${orderId} - ${discrepancyMessages.join(
          "; "
        )}`,
      });
    }

    const updatedInventory = {
      ...inventory,
      l2_component: inventory.l2_component, // No change here, but keep structure
      productionOrders: updatedOrders,
      logs: [...(inventory.logs || []), ...newLogs],
    };

    setInventory(updatedInventory);
    await updateInventory(updatedInventory);

    setActualOutputs((prev) => {
      const copy = { ...prev };
      delete copy[orderId];
      return copy;
    });
  };

  if (!inventory) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h2 className="text-3xl font-bold text-center mb-6">
        Battery Production
      </h2>

      <div className="border border-gray-300 rounded-md p-6 mb-8 bg-gray-50 w-full">
        <h3 className="text-xl font-semibold mb-6 text-center">
          🧾 BOM for 1 Battery
        </h3>

        <div className="flex gap-12">
          {/* Split array into two halves */}
          {[
            effectiveBOM.slice(0, Math.ceil(effectiveBOM.length / 2)),
            effectiveBOM.slice(Math.ceil(effectiveBOM.length / 2)),
          ].map((half, idx) => (
            <ul
              key={idx}
              className="list-none space-y-2 text-gray-700 capitalize flex-1"
            >
              {half.map((bom) => (
                <li key={bom.productId}>
                  <span className="font-medium">{bom.name}</span>: {bom.qty} (
                  Stock: {l1Map[bom.productId]?.quantity || 0}{" "}
                  {l1Map[bom.productId]?.unit || ""})
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mb-4">
          <label htmlFor="requiredOutput" className="font-medium mr-2">
            Required Output:
          </label>
          <input
            id="requiredOutput"
            type="text"
            min="1"
            value={requiredOutput}
            onChange={handleRequiredOutputChange}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            placeholder="Number of batteries"
          />
          <span className="ml-2 text-gray-500 text-sm">
            (Autofills material quantities)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {effectiveBOM.map((bom) => (
            <div key={bom.productId} className="flex flex-col">
              <label
                htmlFor={bom.productId}
                className="mb-1 font-medium capitalize"
              >
                {bom.name} ({l1Map[bom.productId]?.unit || ""}):
              </label>
              <input
                id={bom.productId}
                name={bom.productId}
                type="number"
                min="0"
                step="any"
                value={materialsInput[bom.productId]}
                onChange={(e) => handleChange(e, bom.productId)}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Stock: ${l1Map[bom.productId]?.quantity || 0}`}
              />
            </div>
          ))}
        </div>

        <p className="text-lg font-semibold">
          🔍 Predicted Output: {predictedOutput} battery
          {predictedOutput !== 1 ? "s" : ""}
          <span className="ml-2 text-gray-500 text-sm">
            (Max possible:{" "}
            {(() => {
              if (!inventory?.l1_component) return 0;
              return Math.min(
                ...effectiveBOM.map((bom) => {
                  const available = l1Map[bom.productId]?.quantity || 0;
                  if (bom.qty === 0) return Infinity;
                  return Math.floor(available / bom.qty);
                })
              );
            })()}
            )
          </span>
        </p>

        <button
          type="submit"
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          Start Production
        </button>
      </form>

      <section>
        <h3 className="text-xl font-semibold mt-10 mb-4">
          🛠️ Production Orders
        </h3>
        {inventory.productionOrders?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2">Order No</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">
                    Output (Predicted / Actual)
                  </th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.productionOrders
                  .slice()
                  .reverse()
                  .map((order) => {
                    const discrepancy = inventory.logs?.find(
                      (log) =>
                        log.action.includes("⚠️") &&
                        log.action.includes(`Order #${order.id}`)
                    );

                    const statusLabel =
                      order.status === "started" ? "In Progress" : "Completed";
                    // determine actual value to compare (completed orders have order.actualOutput,
                    // in-progress orders may have a pending value in actualOutputs)
                    const actualValRaw =
                      order.actualOutput ?? actualOutputs[order.id] ?? null;
                    const actualVal = actualValRaw === "" ? null : actualValRaw;
                    const predNum = Number(order.predictedOutput) || 0;
                    const actNum =
                      actualVal != null ? Number(actualVal) || 0 : null;

                    let outputClass = "text-gray-700";
                    if (actNum != null) {
                      if (predNum < actNum)
                        outputClass = "text-red-600 font-semibold";
                      // over-produced
                      else if (predNum === actNum)
                        outputClass = "text-green-600 font-semibold"; // matched
                      else outputClass = "text-gray-700"; // under-produced or neutral
                    }

                    return (
                      <React.Fragment key={order.id}>
                        <tr className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">#{order.id}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                order.status === "started"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3">{order.timestamp}</td>
                          <td className={`px-4 py-3 ${outputClass}`}>
                            {order.predictedOutput} /{" "}
                            {order.actualOutput ??
                              actualOutputs[order.id] ??
                              "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() =>
                                  setOpenDetails((prev) =>
                                    prev === order.id ? null : order.id
                                  )
                                }
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View Details
                              </button>

                              {order.status === "started" && (
                                <>
                                  <input
                                    type="text"
                                    min="0"
                                    step="any"
                                    value={actualOutputs[order.id] ?? ""}
                                    onChange={(e) =>
                                      handleActualOutputChange(
                                        order.id,
                                        e.target.value
                                      )
                                    }
                                    className="border border-gray-300 rounded px-2 py-1 w-20"
                                    placeholder="Actual"
                                  />
                                  <button
                                    onClick={() =>
                                      handleCompleteProduction(order.id)
                                    }
                                    disabled={
                                      actualOutputs[order.id] == null ||
                                      actualOutputs[order.id] < 0
                                    }
                                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                                  >
                                    Mark Done
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {openDetails === order.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="px-4 py-3">
                              <div className="space-y-2">
                                <p className="font-semibold">Materials Used:</p>
                                <ul className="list-disc list-inside ml-5 capitalize text-gray-700">
                                  {Object.entries(order.materialsUsed).map(
                                    ([prodId, qty]) => {
                                      const bom = effectiveBOM.find(
                                        (b) => b.productId === prodId
                                      );
                                      return (
                                        <li key={prodId}>
                                          {bom?.name || prodId}: {qty}
                                        </li>
                                      );
                                    }
                                  )}
                                </ul>

                                {/* {discrepancy && (
                                  <p className="mt-2 text-red-700 bg-red-100 p-2 rounded text-sm">
                                    ⚠️ {discrepancy.action}
                                  </p>
                                )} */}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic">No production orders.</p>
        )}
      </section>
    </div>
  );
};

export default Production;
