import React, { useState, useEffect } from "react";
import assemblyBOM from "../data/assemblyBOM";

const Assembly = ({ inventory, setInventory }) => {
  const [materialsInput, setMaterialsInput] = useState({
    battery: "",
    transformer: "",
    casing: "",
  });
  const [predictedOutput, setPredictedOutput] = useState(0);
  const [actualOutputs, setActualOutputs] = useState({});

  const handleChange = (e) => {
    const updatedInput = {
      ...materialsInput,
      [e.target.name]: parseInt(e.target.value, 10) || 0,
    };
    setMaterialsInput(updatedInput);
  };

  useEffect(() => {
    const times = Object.entries(assemblyBOM).map(([material, required]) => {
      const entered = materialsInput[material] || 0;
      return Math.floor(entered / required);
    });
    setPredictedOutput(Math.min(...times));
  }, [materialsInput]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const timestamp = new Date().toLocaleString();
    const updatedLogs = [...inventory.logs];
    const updatedOrders = [...(inventory.assemblyOrders || [])];

    // Current stock
    const stockCheck = {
      battery: inventory.batteries,
      transformer: inventory.components.transformer,
      casing: inventory.components.casing,
    };

    let hasEnoughStock = true;
    for (let key in materialsInput) {
      if ((stockCheck[key] || 0) < materialsInput[key]) {
        hasEnoughStock = false;
        break;
      }
    }

    if (!hasEnoughStock) {
      updatedLogs.push({
        timestamp,
        action: "❌ Not enough inventory to start assembly order",
      });
      setInventory({
        ...inventory,
        logs: updatedLogs,
      });
      return;
    }

    // Deduct materials from inventory
    const updatedBatteries =
      inventory.batteries - (materialsInput.battery || 0);
    const updatedComponents = {
      ...inventory.components,
      transformer:
        inventory.components.transformer - (materialsInput.transformer || 0),
      casing: inventory.components.casing - (materialsInput.casing || 0),
    };

    const newOrder = {
      id: updatedOrders.length + 1,
      materialsUsed: { ...materialsInput },
      status: "started",
      predictedOutput,
      timestamp,
    };

    updatedLogs.push({
      timestamp,
      action: `🔧 Assembly started (Order #${newOrder.id}) - Predicted Output: ${predictedOutput}`,
    });

    const updatedInventory = {
      ...inventory,
      batteries: updatedBatteries,
      components: updatedComponents,
      assemblyOrders: [...updatedOrders, newOrder],
      logs: updatedLogs,
    };

    setInventory(updatedInventory);

    setMaterialsInput({
      battery: "",
      transformer: "",
      casing: "",
    });
    setPredictedOutput(0);
  };

  const handleActualOutputChange = (orderId, value) => {
    setActualOutputs({
      ...actualOutputs,
      [orderId]: parseInt(value, 10) || 0,
    });
  };

  const handleCompleteAssembly = (orderId) => {
    const timestamp = new Date().toLocaleString();
    const actual = actualOutputs[orderId] || 0;

    const updatedOrders = inventory.assemblyOrders.map((order) => {
      if (order.id === orderId && order.status !== "completed") {
        return {
          ...order,
          status: "completed",
          actualOutput: actual,
        };
      }
      return order;
    });

    const completedOrder = inventory.assemblyOrders.find(
      (o) => o.id === orderId
    );

    const newLogs = [
      {
        timestamp,
        action: `✅ Assembly completed for Order #${orderId}`,
      },
    ];

    if (actual !== completedOrder.predictedOutput) {
      newLogs.push({
        timestamp,
        action: `⚠️ Assembly discrepancy in Order #${orderId}: Predicted ${completedOrder.predictedOutput}, Actual ${actual}`,
      });
    }

    const updatedInventory = {
      ...inventory,
      inverters: inventory.inverters + actual,
      assemblyOrders: updatedOrders,
      logs: [...inventory.logs, ...newLogs],
    };

    setInventory(updatedInventory);

    setActualOutputs((prev) => {
      const copy = { ...prev };
      delete copy[orderId];
      return copy;
    });
  };

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
              <span className="font-medium">{material}</span>: {qty}
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
    </div>
  );
};

export default Assembly;
