import React, { useState, useEffect } from "react";
import { fetchInventory, updateInventory } from "../firebaseService";
import Loader from "../components/Loader";
import { toast } from "react-toastify";

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
  const effectiveBOM = inventory?.plateBOM || [];

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

  const handleChange = (e, productId, productName) => {
    const value = e.target.value;

    // allow clearing the field
    if (value === "") {
      setMaterialsInput((prev) => ({ ...prev, [productId]: "" }));
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) return; // optional: block invalid chars

    let num = Number(value);
    if (isNaN(num) || num < 0) return; // no negatives

    setMaterialsInput((prev) => ({ ...prev, [productId]: num }));
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

    // ✅ Validation check
    if (!requiredOutput || requiredOutput <= 0) {
      alert("Please enter a valid required output before starting production.");
      return;
    }

    // ✅ Check if any material input is 0
    const hasZeroInput = Object.values(materialsInput).some(
      (val) => val === 0 || val === "" || val == null
    );

    if (hasZeroInput) {
      alert(
        "All material quantities must be greater than 0 before starting production."
      );
      return;
    }

    if (!inventory) return;

    // ✅ check if any material input is empty
    const hasEmpty = Object.values(materialsInput).some(
      (val) => val === "" || val === null || val === undefined
    );

    if (hasEmpty) {
      alert("Please fill all input fields before starting production.");
      return;
    }

    // ✅ continue your logic here (if all inputs filled)
    console.log("✅ All inputs filled. Starting production...");

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
    try {
      await updateInventory(updatedInventory);
      toast.success("✅ Production done successfully");
      console.log("✅ Firebase inventory updated");
    } catch (err) {
      console.error("❌ Firebase update failed:", err);
      toast.error("❌ Production not done");
    }

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
    <main className="flex-1 max-w-6x1 mx-auto px-[5%] py-4 pb-16 md:pb-4">
      <div className="w-full max-w-4xl mx-auto p-4 space-y-8 overflow-x-hidden">
        <h2 className="text-3xl font-bold text-center mb-6">
          Plate Production
        </h2>

        {/* --- BOM Section --- */}
        <div className="border border-gray-300 rounded-md p-6 mb-8 bg-gray-50 w-full">
          <h3 className="text-xl font-semibold mb-6 text-center">
            🧾 BOM for 1 Plate
          </h3>

          <div className="flex flex-col sm:flex-row gap-6 w-full">
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
                  <li key={bom.productId} className="text-sm sm:text-base">
                    <span className="font-medium">{bom.name}</span>: {bom.qty} (
                    Stock: {l1Map[bom.productId]?.quantity || 0}{" "}
                    {l1Map[bom.productId]?.unit || ""})
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        {/* --- Form Section --- */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="requiredOutput" className="font-medium">
              Required Output:
            </label>
            <div className="flex items-center gap-2">
              <input
                id="requiredOutput"
                type="number"
                min="1"
                value={requiredOutput}
                onChange={handleRequiredOutputChange}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 sm:w-32"
                placeholder="Number"
              />
              <span className="text-gray-500 text-sm">
                (Autofills material quantities)
              </span>
            </div>
          </div>

          {/* --- Material Inputs Grid --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {effectiveBOM.map((bom) => {
              // ✅ Check if the item should allow only integers
              const isIntegerOnly =
                bom.name.toLowerCase().includes("bag") ||
                bom.name.toLowerCase().includes("bottom");

              return (
                <div key={bom.productId} className="flex flex-col">
                  <label
                    htmlFor={bom.productId}
                    className="mb-1 font-medium capitalize text-sm sm:text-base"
                  >
                    {bom.name} ({l1Map[bom.productId]?.unit || ""}):
                  </label>
                  <input
                    id={bom.productId}
                    name={bom.productId}
                    type="number"
                    min="0"
                    step={isIntegerOnly ? "1" : "any"} // ✅ integer-only restriction
                    value={
                      materialsInput[bom.productId] === 0
                        ? 0
                        : materialsInput[bom.productId] || ""
                    }
                    onChange={(e) => {
                      let value = e.target.value;

                      // ✅ Prevent decimals for bags and bottom
                      if (isIntegerOnly && value.includes(".")) {
                        alert(
                          `${bom.name} must be a whole number (no decimals allowed).`
                        );
                        return;
                      }

                      handleChange(e, bom.productId, bom.productName);
                    }}
                    className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
              );
            })}
          </div>

          {/* --- Predicted Output --- */}
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
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 w-full sm:w-auto"
          >
            Start Production
          </button>
        </form>

        {/* --- Production Orders Section --- */}
        <section>
          <h3 className="text-xl font-semibold mt-10 mb-4">
            🛠️ Production Orders
          </h3>
          {inventory.productionOrders?.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="min-w-full bg-white border border-gray-200 rounded text-sm sm:text-base">
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
                        order.status === "started"
                          ? "In Progress"
                          : "Completed";
                      const actualValRaw =
                        order.actualOutput ?? actualOutputs[order.id] ?? null;
                      const actualVal =
                        actualValRaw === "" ? null : actualValRaw;
                      const predNum = Number(order.predictedOutput) || 0;
                      const actNum =
                        actualVal != null ? Number(actualVal) || 0 : null;

                      let outputClass = "text-gray-700";
                      if (actNum != null) {
                        if (predNum > actNum)
                          outputClass = "text-red-600 font-semibold";
                        else if (predNum === actNum)
                          outputClass = "text-green-600 font-semibold";
                      }

                      return (
                        <React.Fragment key={order.id}>
                          <tr className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3">#{order.id}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded text-xs sm:text-sm font-medium ${
                                  order.status === "started"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {order.timestamp}
                            </td>
                            <td className={`px-4 py-3 ${outputClass}`}>
                              {order.predictedOutput} /{" "}
                              {order.actualOutput ??
                                actualOutputs[order.id] ??
                                "-"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
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
                                  <div className="flex items-center gap-2">
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
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>

                          {openDetails === order.id && (
                            <tr className="bg-gray-50">
                              <td colSpan={5} className="px-4 py-3">
                                <div className="space-y-2">
                                  <p className="font-semibold">
                                    Materials Used:
                                  </p>
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

                                  {discrepancy && (
                                    <div className="mt-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm p-4 text-sm text-red-800">
                                      {discrepancy.predicted !== undefined &&
                                        discrepancy.actual !== undefined && (
                                          <p className="font-semibold">
                                            ⚠️ Predicted:{" "}
                                            {discrepancy.predicted} | Actual:{" "}
                                            {discrepancy.actual}
                                          </p>
                                        )}
                                      {discrepancy.action && (
                                        <>
                                          {discrepancy.action
                                            .split("\n")
                                            .map((line, i) => (
                                              <p
                                                key={i}
                                                className="mt-1 text-xs bg-red-100 rounded p-1"
                                              >
                                                {line}
                                              </p>
                                            ))}
                                        </>
                                      )}
                                    </div>
                                  )}
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
    </main>
  );
};

export default Production;
