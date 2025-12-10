import React, { useState, useEffect } from "react";
import { fetchInventory, updateInventory } from "../firebaseService";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import { toast } from "react-toastify";
import { normalizeBOM } from "../utils/normalizeBOM";
import PlateBOM from "../components/PlateBOM";

const Production = () => {
  const [inventory, setInventory] = useState(null);
  const [materialsInput, setMaterialsInput] = useState({});
  const [predictedOutput, setPredictedOutput] = useState(0);
  const [requiredOutput, setRequiredOutput] = useState("");
  const [actualOutputs, setActualOutputs] = useState({});
  const [currentBOMTab, setCurrentBOMTab] = useState("positive"); // "positive" | "negative"
  // const [openDetails, setOpenDetails] = useState(null);
  const navigate = useNavigate();

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
  // const effectiveBOM = inventory?.plateBOM || [];

  const effectiveBOM =
    currentBOMTab === "positive"
      ? inventory?.plateBOM?.positivePlateBOM || []
      : inventory?.plateBOM?.negativePlateBOM || [];

  const positiveBOM = normalizeBOM(inventory?.plateBOM?.positivePlateBOM || []);
  const negativeBOM = normalizeBOM(inventory?.plateBOM?.negativePlateBOM || []);

  // Map BOM productId to inventory l1_component for easier access
  const l1Map = {};
  if (inventory?.l1_component) {
    inventory.l1_component.forEach((item) => {
      l1Map[item.productId] = item;
    });
  }

  useEffect(() => {
    if (!effectiveBOM) return;

    const initial = {};
    effectiveBOM.forEach((bom) => {
      initial[bom.productId] = 0;
    });
    setMaterialsInput(initial);
    setRequiredOutput("");
    setPredictedOutput(0);
  }, [currentBOMTab]);

  const handleChange = (e, productId) => {
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
      .map((bom) => bom.name);

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
            const bom = effectiveBOM.find((b) => b.name === name);
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
      bomType: currentBOMTab,
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

  const handleActualOutputChange = (orderId, value, predicted) => {
    // Allow only digits (no negative, no decimal)
    if (!/^\d*$/.test(value)) return;

    const num = parseInt(value, 10);

    // Block if number exceeds predicted
    if (!isNaN(num) && num > predicted) return;

    setActualOutputs({
      ...actualOutputs,
      [orderId]: value,
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
    const predicted = Number(completedOrder?.predictedOutput);
    const actualVal = Number(actual);

    if (!isNaN(predicted) && !isNaN(actualVal) && predicted !== actualVal) {
      discrepancyMessages.push(
        `Output mismatch: Predicted ${predicted}, Actual ${actualVal}`
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
      // Replace PD-XXX with actual name from effectiveBOM or l1_component
      const formattedDiscrepancies = discrepancyMessages.map((msg) => {
        return msg.replace(/(PD-\d{3})/g, (id) => {
          const bomItem =
            effectiveBOM.find((b) => b.productId === id) ||
            inventory.l1_component?.find((i) => i.productId === id);
          return bomItem?.name || bomItem?.productName || id;
        });
      });

      newLogs.push({
        timestamp,
        logType: "discrepancy",
        action: `⚠️ Discrepancy in Production #${orderId} - ${formattedDiscrepancies.join(
          "; "
        )}`,
      });

      completedOrder.discrepancyMessages = formattedDiscrepancies;
    } else {
      completedOrder.discrepancyMessages = [];
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
    // <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 pb-16 md:pb-4">
    <div className="w-full max-w-4xl mx-auto p-4 space-y-8 overflow-x-hidden">
      <h2 className="text-3xl font-bold text-center mb-6">Plate Production</h2>
      <div className="flex gap-4 mb-4 justify-center">
        <button
          className={`px-4 py-2 rounded  cursor-pointer hover:bg-blue-100 ${
            currentBOMTab === "positive"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setCurrentBOMTab("positive")}
        >
          Positive Plate
        </button>
        <button
          className={`px-4 py-2 rounded cursor-pointer hover:bg-blue-100 ${
            currentBOMTab === "negative"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setCurrentBOMTab("negative")}
        >
          Negative Plate
        </button>
      </div>
      {/* --- BOM Section --- */}
      {currentBOMTab === "positive" && (
        <PlateBOM
          title="Positive Plate"
          bomList={positiveBOM}
          stockMap={l1Map}
        />
      )}
      {currentBOMTab === "negative" && (
        <PlateBOM
          title="Negative Plate"
          bomList={negativeBOM}
          stockMap={l1Map}
        />
      )}
      ;{/* --- Form Section --- */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <label htmlFor="requiredOutput" className="font-medium">
            Required Output:
          </label>
          <div className="flex items-center gap-2">
            <input
              id="requiredOutput"
              type="text"
              min="1"
              value={requiredOutput}
              onChange={handleRequiredOutputChange}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 sm:w-32"
              placeholder="Plate count"
            />
            <span className="text-gray-500 text-sm">
              (Autofills material quantities)
            </span>
          </div>
        </div>

        {/* --- Material Inputs Grid --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {effectiveBOM.map((bom) => {
            const bomName = String(bom.productName || bom.name || "");

            const isIntegerOnly =
              bomName.toLowerCase().includes("bag") ||
              bomName.toLowerCase().includes("bottom");

            return (
              <div key={bom.productId} className="flex flex-col">
                <label
                  htmlFor={bom.productId}
                  className="mb-1 font-medium capitalize text-sm sm:text-base"
                >
                  {bomName} ({l1Map[bom.productId]?.unit || ""}):
                </label>
                <input
                  id={bom.productId}
                  name={bom.productId}
                  type="number"
                  min="0"
                  step={isIntegerOnly ? "1" : "any"}
                  value={
                    materialsInput[bom.productId] === 0
                      ? 0
                      : materialsInput[bom.productId] || ""
                  }
                  onChange={(e) => {
                    let value = e.target.value;

                    // ✅ Prevent decimals for integer-only items
                    if (isIntegerOnly && value.includes(".")) {
                      alert(
                        `${bomName} must be a whole number (no decimals allowed).`
                      );
                      return;
                    }

                    handleChange(e, bom.productId);
                  }}
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
            );
          })}
        </div>

        {/* --- Predicted Output --- */}
        <p className="text-lg font-semibold">
          🔍 Predicted Output: {predictedOutput} Plate
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
          <div className="min-w-full border-gray-900 text-sm">
            <table className="min-w-full bg-white border-gray-900  text-sm">
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
                  .filter((order) => order.bomType === currentBOMTab)
                  .slice()
                  .reverse()
                  .map((order) => {
                    const discrepancy = inventory.logs?.find(
                      (log) =>
                        log.action?.includes("⚠️") &&
                        log.action?.includes(`Order #${order.id}`)
                    );

                    const statusLabel =
                      order.status === "started" ? "In Progress" : "Completed";
                    const actualValRaw =
                      order.actualOutput ?? actualOutputs[order.id] ?? null;
                    const actualVal = actualValRaw === "" ? null : actualValRaw;
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
                              {order.status === "completed" && (
                                <div className="flex items-center justify-center gap-2 mt-2">
                                  {(() => {
                                    const outputMismatch =
                                      Number(order.actualOutput) !==
                                      Number(order.predictedOutput);
                                    const materialDiscrepancies =
                                      order.discrepancyMessages?.length || 0;

                                    const totalDiscrepancies =
                                      materialDiscrepancies +
                                      (outputMismatch ? 1 : 0);

                                    // const hasDiscrepancy =
                                    //   totalDiscrepancies > 0;

                                    const hasDiscrepancy =
                                      totalDiscrepancies > 0 ||
                                      Boolean(discrepancy);

                                    const iconColor = hasDiscrepancy
                                      ? "text-red-600"
                                      : "text-green-600";
                                    const textColor = hasDiscrepancy
                                      ? "text-red-600"
                                      : "text-green-600";
                                    const icon = hasDiscrepancy ? "⚠️" : "✅";
                                    const title = hasDiscrepancy
                                      ? "Discrepancy"
                                      : "Match";

                                    const tooltipTitle = !hasDiscrepancy
                                      ? "Order ready for assembly"
                                      : `Check ${totalDiscrepancies} ${
                                          totalDiscrepancies === 1
                                            ? "discrepancy"
                                            : "discrepancies"
                                        }`;

                                    let tooltipDetails = "";
                                    if (
                                      outputMismatch &&
                                      materialDiscrepancies === 0
                                    ) {
                                      tooltipDetails = "(1 output mismatch)";
                                    } else if (
                                      !outputMismatch &&
                                      materialDiscrepancies > 0
                                    ) {
                                      tooltipDetails = `(${materialDiscrepancies} material ${
                                        materialDiscrepancies === 1
                                          ? "issue"
                                          : "issues"
                                      })`;
                                    } else if (
                                      outputMismatch &&
                                      materialDiscrepancies > 0
                                    ) {
                                      tooltipDetails = `(1 output mismatch, ${materialDiscrepancies} material ${
                                        materialDiscrepancies === 1
                                          ? "issue"
                                          : "issues"
                                      })`;
                                    }

                                    return (
                                      <>
                                        <span
                                          title={title}
                                          className={`${iconColor} text-sm font-semibold cursor-default`}
                                        >
                                          {icon}
                                        </span>

                                        <div className="relative flex flex-col items-center">
                                          {/* View Details button (becomes the hover trigger) */}
                                          <button
                                            className={`${textColor} font-medium relative group`}
                                          >
                                            View Details
                                            {/* Tooltip — visible only when hovering the button */}
                                            <div
                                              onClick={() =>
                                                navigate(
                                                  `/production/history/${order.id}`
                                                )
                                              }
                                              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white text-center w-max max-w-[220px]
bg-black/90 backdrop-blur-md rounded-md
opacity-0 hover:opacity-100 transition-opacity duration-200
border border-gray-700 shadow-sm cursor-pointer hover:scale-[1.03]`}
                                            >
                                              {tooltipTitle}
                                              {tooltipDetails && (
                                                <div className="text-[10px] text-white-900 mt-0.5">
                                                  {tooltipDetails}
                                                </div>
                                              )}
                                            </div>
                                          </button>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                              {order.status === "started" && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={actualOutputs[order.id] ?? ""}
                                    onChange={(e) =>
                                      handleActualOutputChange(
                                        order.id,
                                        e.target.value,
                                        order.predicted
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
                                      actualOutputs[order.id] == "" || // empty input
                                      actualOutputs[order.id] == 0 || // zero value
                                      actualOutputs[order.id] >
                                        order.predictedOutput // exceeds predicted
                                    }
                                    className="bg-green-600 text-white px-1 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                                  >
                                    Mark Done
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
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
    // </main>
  );
};

export default Production;
