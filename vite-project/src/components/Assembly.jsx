// src/components/Assembly.jsx
import React, { useState, useEffect } from "react";
import assemblyBOM from "../data/assemblyBOM";
import { fetchInventory, updateInventory } from "../firebaseService";

const Assembly = () => {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  const [materialsInput, setMaterialsInput] = useState({
    battery: "",
    transformer: "",
    casing: "",
  });
  const [predictedOutput, setPredictedOutput] = useState(0);
  const [actualOutputs, setActualOutputs] = useState({});

  // ✅ Fetch inventory on mount
  useEffect(() => {
    (async () => {
      const data = await fetchInventory();
      setInventory(data);
      setLoading(false);
    })();
  }, []);

  // ✅ Handle material input changes
  const handleChange = (e) => {
    const updatedInput = {
      ...materialsInput,
      [e.target.name]: parseInt(e.target.value, 10) || 0,
    };
    setMaterialsInput(updatedInput);
  };

  // ✅ Calculate predicted output
  useEffect(() => {
    if (!inventory) return;
    const times = Object.entries(assemblyBOM).map(([material, required]) => {
      const entered = materialsInput[material] || 0;
      return Math.floor(entered / required);
    });
    setPredictedOutput(Math.min(...times));
  }, [materialsInput, inventory]);

  // ✅ Start assembly order
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inventory) return;

    const timestamp = new Date().toLocaleString();
    const updatedLogs = [...(inventory.logs || [])];
    const updatedOrders = [...(inventory.assemblyOrders || [])];

    // 🔹 Read all stock from l2_component only
    const stockCheck = {
      battery: inventory.l2_component?.battery ?? 0,
      transformer: inventory.l2_component?.transformer ?? 0,
      casing: inventory.l2_component?.casing ?? 0,
    };

    // 🔹 Check for insufficient stock
    const insufficient = Object.keys(materialsInput).filter(
      (mat) => (stockCheck[mat] || 0) < materialsInput[mat]
    );

    if (insufficient.length > 0) {
      updatedLogs.push({
        timestamp,
        action: `❌ Not enough inventory to start assembly`,
      });

      const updatedInventory = { ...inventory, logs: updatedLogs };
      setInventory(updatedInventory);
      await updateInventory(updatedInventory);

      alert(
        `Not enough stock for: ${insufficient
          .map(
            (mat) =>
              `${mat} (needed: ${materialsInput[mat]}, available: ${stockCheck[mat]})`
          )
          .join(", ")}`
      );
      return;
    }

    // 🔹 Deduct used materials from l2_component
    const updatedInventory = {
      ...inventory,
      l2_component: {
        ...inventory.l2_component,
        battery: stockCheck.battery - (materialsInput.battery || 0),
        transformer: stockCheck.transformer - (materialsInput.transformer || 0),
        casing: stockCheck.casing - (materialsInput.casing || 0),
      },
      assemblyOrders: [
        ...updatedOrders,
        {
          id: updatedOrders.length + 1,
          materialsUsed: { ...materialsInput },
          predictedOutput,
          status: "started",
          timestamp,
        },
      ],
      logs: [
        ...updatedLogs,
        {
          timestamp,
          action: `🔧 Assembly started (Order #${
            updatedOrders.length + 1
          }) - Predicted Output: ${predictedOutput}`,
        },
      ],
    };

    setInventory(updatedInventory);
    await updateInventory(updatedInventory);
    setMaterialsInput({ battery: "", transformer: "", casing: "" });
    setPredictedOutput(0);
  };

  // ✅ Actual output input handler
  const handleActualOutputChange = (orderId, value) => {
    setActualOutputs({
      ...actualOutputs,
      [orderId]: parseInt(value, 10) || 0,
    });
  };

  // ✅ Complete assembly order → add to finalProducts
  const handleCompleteAssembly = async (orderId) => {
    if (!inventory) return;

    const actual = actualOutputs[orderId] || 0;
    const timestamp = new Date().toLocaleString();

    const updatedOrders = inventory.assemblyOrders.map((order) =>
      order.id === orderId && order.status !== "completed"
        ? { ...order, status: "completed", actualOutput: actual }
        : order
    );

    const completedOrder = inventory.assemblyOrders.find(
      (o) => o.id === orderId
    );

    const newLogs = [
      { timestamp, action: `✅ Assembly completed for Order #${orderId}` },
    ];

    if (actual !== completedOrder.predictedOutput) {
      newLogs.push({
        timestamp,
        action: `⚠️ Assembly discrepancy in Order #${orderId}: Predicted ${completedOrder.predictedOutput}, Actual ${actual}`,
      });
    }

    const updatedInventory = {
      ...inventory,
      finalProducts: (inventory.finalProducts || 0) + actual,
      assemblyOrders: updatedOrders,
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

  if (loading) return <p>Loading Inventory...</p>;
  if (!inventory) return <p>No inventory data found.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h2 className="text-3xl font-bold text-center mb-6">Inverter Assembly</h2>

      {/* BOM */}
      <div className="border border-gray-300 rounded-md p-4 mb-8 bg-gray-50">
        <h3 className="text-xl font-semibold mb-3">
          🧾 Assembly BOM for 1 Inverter
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 capitalize">
          {Object.entries(assemblyBOM).map(([material, qty]) => (
            <li key={material}>
              <span className="font-medium">{material}</span>: {qty} (Stock:{" "}
              {inventory.l2_component?.[material] ?? 0})
            </li>
          ))}
        </ul>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-xl font-semibold mb-3">
          Enter Assembly Material Quantities
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Object.keys(assemblyBOM).map((material) => (
            <div key={material} className="flex flex-col">
              <label htmlFor={material} className="mb-1 font-medium capitalize">
                {material}:
              </label>
              <input
                id={material}
                type="number"
                name={material}
                value={materialsInput[material]}
                onChange={handleChange}
                min="0"
                required
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <p className="text-lg font-semibold">
          🔍 Predicted Output: {predictedOutput} inverter
          {predictedOutput !== 1 ? "s" : ""}
        </p>

        <button
          type="submit"
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          Start Assembly
        </button>
      </form>

      {/* Active Orders */}
      <section>
        <h3 className="text-xl font-semibold mt-10 mb-4">
          🛠️ Active Assembly Orders
        </h3>
        {inventory.assemblyOrders?.filter((o) => o.status === "started")
          .length > 0 ? (
          <ul className="space-y-6">
            {inventory.assemblyOrders
              .filter((order) => order.status === "started")
              .map((order) => (
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
                      onClick={() => handleCompleteAssembly(order.id)}
                      disabled={
                        actualOutputs[order.id] == null ||
                        actualOutputs[order.id] < 0
                      }
                      className="mt-2 sm:mt-0 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      ✅ Mark Assembly Done
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No active assembly orders.</p>
        )}
      </section>

      {/* Final Products */}
      {/* <section>
        <h3 className="text-xl font-semibold mt-10 mb-2">
          📦 Total Final Products:
        </h3>
        <p className="text-2xl font-bold text-green-600">
          {inventory.finalProducts || 0}
        </p>
      </section> */}
    </div>
  );
};

export default Assembly;
