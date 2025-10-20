import React, { useState, useEffect } from "react";
import batteryBOM from "../data/batteryBOM";
import { fetchInventory, updateInventory } from "../firebaseService";
import Loader from "../components/Loader";

const Production = () => {
  const [inventory, setInventory] = useState(null);
  const [materialsInput, setMaterialsInput] = useState({});
  const [predictedOutput, setPredictedOutput] = useState(0);
  const [requiredOutput, setRequiredOutput] = useState("");
  const [actualOutputs, setActualOutputs] = useState({});

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

  // Map BOM productId to inventory l1_component for easier access
  const l1Map = {};
  if (inventory?.l1_component) {
    inventory.l1_component.forEach((item) => {
      l1Map[item.productId] = item;
    });
  }

  // Initialize materialsInput keys based on BOM
  useEffect(() => {
    if (batteryBOM && Object.keys(materialsInput).length === 0) {
      const initial = {};
      batteryBOM.forEach((bom) => {
        initial[bom.productId] = 0;
      });
      setMaterialsInput(initial);
    }
  }, [batteryBOM, materialsInput]);

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
    const maxPossible = Math.min(
      ...batteryBOM.map((bom) => {
        const available = l1Map[bom.productId]?.quantity || 0;
        if (bom.qty === 0) return Infinity;
        return Math.floor(available / bom.qty);
      })
    );
    let output = parseFloat(requiredOutput) || 0;
    if (output > maxPossible) output = maxPossible;
    setPredictedOutput(output);
  }, [requiredOutput, inventory]);

  const handleRequiredOutputChange = (e) => {
    const value = parseFloat(e.target.value) || "";
    setRequiredOutput(value);

    if (value > 0) {
      const autofill = {};
      batteryBOM.forEach((bom) => {
        autofill[bom.productId] = parseFloat((bom.qty * value).toFixed(4));
      });
      setMaterialsInput(autofill);
    } else {
      const reset = {};
      batteryBOM.forEach((bom) => {
        reset[bom.productId] = 0;
      });
      setMaterialsInput(reset);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inventory) return;

    const timestamp = new Date().toLocaleString();
    const updatedLogs = [...(inventory.logs || [])];
    const updatedOrders = [...(inventory.productionOrders || [])];

    // Find insufficient stock
    const insufficient = batteryBOM
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
            const bom = batteryBOM.find((b) => b.productName === name);
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
    batteryBOM.forEach((bom) => {
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

    const timestamp = new Date().toLocaleString();
    const actual = actualOutputs[orderId] || 0;

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
    batteryBOM.forEach((bom) => {
      expectedMaterials[bom.productId] = parseFloat(
        (bom.qty * actual).toFixed(4)
      );
    });

    Object.entries(completedOrder.materialsUsed || {}).forEach(
      ([prodId, used]) => {
        const expected = expectedMaterials[prodId] ?? 0;
        if (used !== expected) {
          const bom = batteryBOM.find((b) => b.productId === prodId);
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

      <div className="border border-gray-300 rounded-md p-4 mb-8 bg-gray-50">
        <h3 className="text-xl font-semibold mb-3">🧾 BOM for 1 Battery</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 capitalize">
          {batteryBOM.map((bom) => (
            <li key={bom.productId}>
              <span className="font-medium">{bom.name}</span>: {bom.qty} (
              Stock: {l1Map[bom.productId]?.quantity || 0}{" "}
              {l1Map[bom.productId]?.unit || ""})
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mb-4">
          <label htmlFor="requiredOutput" className="font-medium mr-2">
            Required Output:
          </label>
          <input
            id="requiredOutput"
            type="number"
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
          {batteryBOM.map((bom) => (
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
                ...batteryBOM.map((bom) => {
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
          <ul className="space-y-6">
            {inventory.productionOrders.map((order) => {
              const discrepancy = inventory.logs?.find(
                (log) =>
                  log.action.includes("⚠️") &&
                  log.action.includes(`Order #${order.id}`)
              );

              return (
                <li
                  key={order.id}
                  className="bg-white shadow rounded p-4 border border-gray-200"
                >
                  <p className="font-semibold text-lg mb-2">
                    Order #{order.id}
                  </p>
                  <p>
                    Predicted Output:{" "}
                    <span className="font-medium">{order.predictedOutput}</span>
                  </p>
                  <p>Started At: {order.timestamp}</p>

                  <div className="mt-2">
                    <p className="font-semibold mb-1">Materials:</p>
                    <ul className="list-disc list-inside ml-5 capitalize text-gray-700">
                      {Object.entries(order.materialsUsed).map(
                        ([prodId, qty]) => {
                          const bom = batteryBOM.find(
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
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                    <label
                      htmlFor={`actual-${order.id}`}
                      className="mr-2 font-medium"
                    >
                      🔢 Actual Output:
                    </label>
                    <input
                      id={`actual-${order.id}`}
                      type="number"
                      min="0"
                      step="any"
                      value={
                        order.status === "completed"
                          ? order.actualOutput ?? ""
                          : actualOutputs[order.id] ?? ""
                      }
                      onChange={
                        order.status === "completed"
                          ? undefined
                          : (e) =>
                              handleActualOutputChange(order.id, e.target.value)
                      }
                      className="border border-gray-300 rounded px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={order.status === "completed"}
                    />
                    {order.status === "started" && (
                      <button
                        onClick={() => handleCompleteProduction(order.id)}
                        disabled={
                          actualOutputs[order.id] == null ||
                          actualOutputs[order.id] < 0
                        }
                        className="mt-2 sm:mt-0 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        ✅ Mark as Production Done
                      </button>
                    )}
                  </div>

                  {discrepancy && (
                    <p className="mt-3 text-red-700 bg-red-100 p-2 rounded text-sm">
                      ⚠️ {discrepancy.action}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No production orders.</p>
        )}
      </section>
    </div>
  );
};

export default Production;
