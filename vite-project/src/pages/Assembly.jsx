import React, { useState, useEffect } from "react";
import { fetchInventory, updateInventory } from "../firebaseService";
import Loader from "../components/Loader";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import PlateBOM from "../components/PlateBOM";
import { normalizeBOM } from "../utils/normalizeBOM";

const Assembly = () => {
  const [inventory, setInventory] = useState(null);
  const [materialsInput, setMaterialsInput] = useState({});
  const [predictedOutput, setPredictedOutput] = useState(0);
  const [requiredOutput, setRequiredOutput] = useState("");
  const [actualOutputs, setActualOutputs] = useState({});
  // const [openDetails, setOpenDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadInventory = async () => {
      setLoading(true);
      const data = await fetchInventory();
      setInventory(data);
      setLoading(false);
    };
    loadInventory();
  }, []);

  // --- Build effective BOM and mapping ---
  const effectiveBOM = inventory?.inverterBOM || [];
  const assemblyBOM = normalizeBOM(effectiveBOM);
  const l2Map = {};
  if (inventory?.l2_component) {
    inventory.l2_component.forEach((item) => {
      l2Map[item.productId] = item;
    });
  }

  // --- Required Output Change ---
  const handleRequiredOutputChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    setRequiredOutput(value);
    if (!value) {
      setPredictedOutput(0);
      setMaterialsInput({});
      return;
    }

    const newInput = {};
    effectiveBOM.forEach((bom) => {
      newInput[bom.productId] = bom.qty * parseFloat(value);
    });
    setMaterialsInput(newInput);
  };

  useEffect(() => {
    // ✅ Only calculate when user enters a Required Output
    if (!requiredOutput || Number(requiredOutput) <= 0) {
      setPredictedOutput(0);
      return;
    }

    // ✅ Ensure BOM & inventory are ready
    if (effectiveBOM.length && inventory?.l2_component?.length) {
      const ratios = effectiveBOM.map((bom) => {
        const available = l2Map[bom.productId]?.quantity || 0;
        if (bom.qty === 0) return Infinity;
        return Math.floor(available / bom.qty);
      });
      setPredictedOutput(Math.min(...ratios));
    }
  }, [requiredOutput]); // ✅ depends only on requiredOutput

  // --- Material Input Change ---
  const handleChange = (e, productId) => {
    const value = e.target.value;
    setMaterialsInput({
      ...materialsInput,
      [productId]: parseFloat(value) || "",
    });
  };

  // --- Start Assembly ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!requiredOutput || requiredOutput <= 0) {
      toast.error("Enter valid required output!");
      return;
    }

    // 🔍 Check if any material input field is empty
    const hasEmpty = effectiveBOM.some(
      (bom) =>
        !materialsInput[bom.productId] && materialsInput[bom.productId] !== 0
    );

    if (hasEmpty) {
      toast.error(
        "Please fill all material input fields before starting assembly!"
      );
      return;
    }

    // ✅ Find the next sequential ID (ignoring big timestamp IDs)
    const existingIds = (inventory.assemblyOrders || [])
      .map((o) => Number(o.id))
      .filter((n) => !isNaN(n) && n < 10000); // ignore timestamp-like IDs

    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    // ⚠️ Check for insufficient stock before deducting
    const insufficient = effectiveBOM
      .filter(
        (bom) =>
          (l2Map[bom.productId]?.quantity || 0) <
          (materialsInput[bom.productId] || 0)
      )
      .map((bom) => bom.name);

    if (insufficient.length > 0) {
      const timestamp = new Date().toLocaleString();
      const updatedLogs = [
        ...(inventory.logs || []),
        {
          timestamp,
          action: `❌ Not enough stock for assembly: ${insufficient.join(
            ", "
          )}`,
        },
      ];

      const updatedInv = { ...inventory, logs: updatedLogs };
      setInventory(updatedInv);
      await updateInventory(updatedInv);

      alert(
        `Not enough stock for: ${insufficient
          .map((name) => {
            const bom = effectiveBOM.find((b) => b.name === name);
            const prodId = bom.productId;
            return `${name} (needed: ${materialsInput[prodId]}, available: ${
              l2Map[prodId]?.quantity || 0
            })`;
          })
          .join(", ")}`
      );
      return;
    }

    const updatedL2 = inventory.l2_component.map((item) => {
      const used = materialsInput[item.productId] || 0;
      return { ...item, quantity: item.quantity - used };
    });

    const newOrder = {
      id: nextId, // ✅ Sequential small ID
      timestamp: new Date().toLocaleString(),
      status: "started",
      materialsUsed: { ...materialsInput },
      predictedOutput: requiredOutput,
    };

    const updatedOrders = [...(inventory.assemblyOrders || []), newOrder];
    const updatedInventory = {
      ...inventory,
      l2_component: updatedL2,
      assemblyOrders: updatedOrders,
    };

    updateInventory(updatedInventory);
    setInventory(updatedInventory);

    toast.success(`Assembly Order #${nextId} started successfully!`);
    setRequiredOutput("");
    setMaterialsInput({});
    setPredictedOutput(0);
  };

  // --- Complete Assembly ---
  const handleCompleteAssembly = (orderId) => {
    const order = inventory.assemblyOrders.find((o) => o.id === orderId);
    const actual = actualOutputs[orderId];

    if (!actual || actual <= 0) {
      toast.error("Enter valid actual output!");
      return;
    }

    const discrepancyMessages = [];

    if (Number(order.predictedOutput) !== Number(actual)) {
      discrepancyMessages.push(
        `Output mismatch: Predicted ${order.predictedOutput}, Actual ${actual}`
      );
    }

    Object.entries(order.materialsUsed).forEach(([id, used]) => {
      const bom = effectiveBOM.find((b) => b.productId === id);
      const expected = bom.qty * actual;
      if (used > expected)
        discrepancyMessages.push(
          `${bom.name}: used more (${used} > ${expected})`
        );
      else if (used < expected)
        discrepancyMessages.push(
          `${bom.name}: used less (${used} < ${expected})`
        );
    });

    const updatedOrders = inventory.assemblyOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: "completed",
            actualOutput: actual,
            discrepancyMessages,
          }
        : o
    );

    const updatedLogs = [
      ...(inventory.logs || []),
      {
        id: Date.now(),
        action:
          discrepancyMessages.length > 0
            ? `⚠️ Discrepancy in Assembly #${orderId}:\n${discrepancyMessages.join(
                "\n"
              )}`
            : `✅ Assembly #${orderId} completed with no discrepancies.`,
        timestamp: new Date().toLocaleString(),
      },
    ];

    const updatedInventory = {
      ...inventory,
      assemblyOrders: updatedOrders,
      logs: updatedLogs,
      finalProducts: (inventory.finalProducts || 0) + Number(actual),
    };

    updateInventory(updatedInventory);
    setInventory(updatedInventory);
    toast.success("Assembly marked as completed!");
  };

  // --- Actual Output Input ---
  const handleActualOutputChange = (orderId, value, predicted) => {
    const num = parseFloat(value);
    if (num > predicted) return;
    setActualOutputs({ ...actualOutputs, [orderId]: num || "" });
  };

  if (loading) return <Loader />;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-8">
      <h2 className="text-3xl font-bold text-center mb-6">
        ⚙️ Battery Assembly
      </h2>
      {/* --- BOM --- */}

      <PlateBOM title="Battery" bomList={assemblyBOM} stockMap={l2Map} />
      {/* --- Form --- */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <label className="font-medium">Required Output:</label>
          <input
            type="text"
            value={requiredOutput}
            onChange={handleRequiredOutputChange}
            placeholder="battery count"
            className="border rounded px-3 py-2 w-32 text-center"
          />
          <span className="text-gray-500 text-sm">
            (Auto-fills material usage)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {effectiveBOM.map((bom) => (
            <div key={bom.productId} className="flex flex-col">
              <label className="font-medium capitalize text-sm mb-1">
                {bom.name} ({l2Map[bom.productId]?.unit || ""})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={materialsInput[bom.productId] || ""}
                onChange={(e) => handleChange(e, bom.productId)}
                className="border rounded px-3 py-2"
              />
            </div>
          ))}
        </div>

        <p className="text-lg font-semibold">
          🔍 Predicted Output:{" "}
          {predictedOutput
            ? (() => {
                if (!inventory?.l2_component) return "--";

                // Calculate the maximum number of batteries that can be made from available stock
                const maxPossible = Math.min(
                  ...effectiveBOM.map((bom) => {
                    const available = l2Map[bom.productId]?.quantity || 0;
                    if (bom.qty === 0) return Infinity;
                    return Math.floor(available / bom.qty);
                  })
                );

                // Final predicted count = smaller of requiredOutput or maxPossible
                const predictedCount = Math.min(requiredOutput, maxPossible);

                return (
                  <>
                    {predictedCount}{" "}
                    {predictedCount === 1 ? "battery" : "batteries"}
                    <span className="ml-2 text-gray-500 text-sm">
                      (Max possible: {maxPossible})
                    </span>
                  </>
                );
              })()
            : "--"}
        </p>

        <button
          type="submit"
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Start Assembly
        </button>
      </form>
      {/* --- Orders --- */}
      <section>
        <h3 className="text-xl font-semibold mt-10 mb-4">🛠️ Assembly Orders</h3>
        {inventory?.assemblyOrders && inventory.assemblyOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Order No</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Output (Pred / Act)</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(inventory?.assemblyOrders || [])
                  .slice()
                  .reverse()
                  .map((order) => {
                    const discrepancy = inventory?.logs?.find(
                      (log) =>
                        log.action?.includes(`Assembly #${order.id}`) &&
                        log.action?.includes("⚠️")
                    );

                    const outputClass =
                      order.actualOutput == null
                        ? "text-gray-700"
                        : Number(order.actualOutput) <
                          Number(order.predictedOutput)
                        ? "text-red-600 font-semibold"
                        : "text-green-600 font-semibold";

                    return (
                      <React.Fragment key={order.id}>
                        <tr className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">#{order.id}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                order.status === "started"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {order.status === "started"
                                ? "In Progress"
                                : "Completed"}
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
                            {order.status === "completed" ? (
                              <div className="flex gap-2 items-center">
                                {(() => {
                                  const outputMismatch =
                                    Number(order.actualOutput) !==
                                    Number(order.predictedOutput);
                                  const materialDiscrepancies =
                                    order.discrepancyMessages?.length || 0;

                                  const totalDiscrepancies =
                                    materialDiscrepancies +
                                    (outputMismatch ? 1 : 0);

                                  // const hasDiscrepancy = totalDiscrepancies > 0;
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

                                  const tooltipTitle = !hasDiscrepancy
                                    ? "Order ready for dispatch"
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
                                      <span className={`${iconColor}`}>
                                        {icon}
                                      </span>
                                      <div className="relative group flex flex-col items-center">
                                        <button className={`${textColor} `}>
                                          View Details
                                        </button>

                                        <div
                                          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white text-center w-max max-w-[220px]
bg-black/90 backdrop-blur-md rounded-md
opacity-0 group-hover:opacity-100 transition-opacity duration-200
border border-gray-700 shadow-sm cursor-pointer hover:scale-[1.03]`}
                                          onClick={() =>
                                            navigate(
                                              `/assembly/history/${order.id}`
                                            )
                                          }
                                        >
                                          {tooltipTitle}
                                          {tooltipDetails && (
                                            <div className="text-[10px] text-white-900 mt-0.5">
                                              {tooltipDetails}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Actual"
                                  value={actualOutputs[order.id] ?? ""}
                                  onChange={(e) =>
                                    handleActualOutputChange(
                                      order.id,
                                      e.target.value,
                                      order.predictedOutput
                                    )
                                  }
                                  className="border rounded px-2 py-1 w-20"
                                />
                                <button
                                  onClick={() =>
                                    handleCompleteAssembly(order.id)
                                  }
                                  disabled={
                                    !actualOutputs[order.id] ||
                                    actualOutputs[order.id] <= 0 ||
                                    actualOutputs[order.id] >
                                      order.predictedOutput
                                  }
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  Mark Done
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic">No assembly orders.</p>
        )}
      </section>
    </div>
  );
};

export default Assembly;
