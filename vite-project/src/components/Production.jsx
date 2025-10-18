import React, { useState, useEffect } from "react";
import batteryBOM from "../data/batteryBOM";
import { fetchInventory, updateInventory } from "../firebaseService";

const Production = () => {
  const [inventory, setInventory] = useState(null);
  const [materialsInput, setMaterialsInput] = useState({
    lead: 0,
    acid: 0,
    plastic: 0,
    copper: 0,
    lithium: 0,
  });
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

  const handleChange = (e) => {
    const updated = {
      ...materialsInput,
      [e.target.name]: parseInt(e.target.value, 10) || 0,
    };
    setMaterialsInput(updated);
  };

  useEffect(() => {
    const times = Object.entries(batteryBOM).map(([mat, req]) => {
      const entered = materialsInput[mat] || 0;
      return Math.floor(entered / req);
    });
    setPredictedOutput(Math.min(...times));
  }, [materialsInput]);

  const handleRequiredOutputChange = (e) => {
    const value = parseInt(e.target.value, 10) || "";
    setRequiredOutput(value);

    if (value > 0) {
      const autofill = {};
      Object.entries(batteryBOM).forEach(([mat, qty]) => {
        autofill[mat] = qty * value;
      });
      setMaterialsInput(autofill);
    } else {
      setMaterialsInput({
        lead: 0,
        acid: 0,
        plastic: 0,
        copper: 0,
        lithium: 0,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inventory) return;

    const timestamp = new Date().toLocaleString();
    const updatedLogs = [...(inventory.logs || [])];
    const updatedOrders = [...(inventory.productionOrders || [])];

    const insufficient = Object.keys(materialsInput).filter(
      (mat) => (inventory.l1_component?.[mat] || 0) < materialsInput[mat]
    );

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
          .map(
            (mat) =>
              `${mat} (needed: ${materialsInput[mat]}, available: ${
                inventory.l1_component?.[mat] || 0
              })`
          )
          .join(", ")}`
      );
      return;
    }

    // Deduct stock
    const updatedMaterials = { ...inventory.l1_component };
    Object.keys(materialsInput).forEach((mat) => {
      updatedMaterials[mat] -= materialsInput[mat];
    });

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
      l1_component: updatedMaterials,
      productionOrders: [...updatedOrders, newOrder],
      logs: updatedLogs,
    };

    setInventory(updatedInventory);
    await updateInventory(updatedInventory);

    // Reset inputs
    setMaterialsInput({
      lead: 0,
      acid: 0,
      plastic: 0,
      copper: 0,
      lithium: 0,
    });
    setPredictedOutput(0);
    setRequiredOutput("");
  };

  const handleActualOutputChange = (orderId, value) => {
    setActualOutputs({ ...actualOutputs, [orderId]: parseInt(value, 10) || 0 });
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

    // 🔍 Discrepancy detection for both output & material usage
    let discrepancyMessages = [];

    // 1️⃣ Compare predicted vs actual output
    if (completedOrder && actual !== completedOrder.predictedOutput) {
      discrepancyMessages.push(
        `Output mismatch: Predicted ${completedOrder.predictedOutput}, Actual ${actual}`
      );
    }

    // 2️⃣ Compare materials used vs expected (based on actual output)
    const expectedMaterials = {};
    Object.entries(batteryBOM).forEach(([mat, qty]) => {
      expectedMaterials[mat] = qty * actual;
    });

    Object.entries(completedOrder.materialsUsed || {}).forEach(
      ([mat, used]) => {
        const expected = expectedMaterials[mat] ?? 0;
        if (used !== expected) {
          discrepancyMessages.push(
            `${mat}: used ${used}, expected ${expected}`
          );
        }
      }
    );

    if (discrepancyMessages.length > 0) {
      newLogs.push({
        timestamp,
        action: `⚠️ Discrepancy in Order #${orderId} - ${discrepancyMessages.join(
          "; "
        )}`,
      });
    }

    const updatedInventory = {
      ...inventory,
      l2_component: {
        ...inventory.l2_component,
        battery: (inventory.l2_component?.battery || 0) + actual,
      },
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

  if (!inventory) return <p>Loading Inventory...</p>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h2 className="text-3xl font-bold text-center mb-6">
        Battery Production
      </h2>

      <div className="border border-gray-300 rounded-md p-4 mb-8 bg-gray-50">
        <h3 className="text-xl font-semibold mb-3">🧾 BOM for 1 Battery</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 capitalize">
          {Object.entries(batteryBOM).map(([mat, qty]) => (
            <li key={mat}>
              <span className="font-medium">{mat}</span>: {qty} (Stock:{" "}
              {inventory.l1_component?.[mat] || 0})
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
          {Object.keys(batteryBOM).map((mat) => (
            <div key={mat} className="flex flex-col">
              <label htmlFor={mat} className="mb-1 font-medium capitalize">
                {mat}:
              </label>
              <input
                id={mat}
                name={mat}
                type="number"
                min="0"
                value={materialsInput[mat]}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <p className="text-lg font-semibold">
          🔍 Predicted Output: {predictedOutput} battery
          {predictedOutput !== 1 ? "s" : ""}
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
                      {Object.entries(order.materialsUsed).map(([mat, qty]) => (
                        <li key={mat}>
                          {mat}: {qty}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {order.status === "started" && (
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
                        value={actualOutputs[order.id] || ""}
                        onChange={(e) =>
                          handleActualOutputChange(order.id, e.target.value)
                        }
                        className="border border-gray-300 rounded px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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
                    </div>
                  )}

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
