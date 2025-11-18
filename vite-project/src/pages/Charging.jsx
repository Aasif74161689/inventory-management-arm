import React, { useState, useEffect } from "react";
import { fetchInventory, updateInventory } from "../firebaseService";
import Loader from "../components/Loader";

const Charging = () => {
  const [inventory, setInventory] = useState(null);
  const [chargeInputs, setChargeInputs] = useState({});
  const [openDetails, setOpenDetails] = useState(null);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeFormData, setChargeFormData] = useState({
    quantity: "",
    startTime: "",
    duration: "",
    notes: "",
  });
  const [chargingFromBatch, setChargingFromBatch] = useState(null); // Track which batch to charge from

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

  // Get batteries from assembly orders that are completed
  const getAvailableBatteries = () => {
    return (inventory?.assemblyOrders || []).filter(
      (order) => order.status === "completed" && !order.chargeStatus
    );
  };

  // Get charged batteries (tracking)
  const getChargedBatteries = () => {
    return (inventory?.chargedBatteries || []).slice().reverse();
  };

  const handleStartCharging = (assemblyOrderId) => {
    const order = inventory.assemblyOrders.find(
      (o) => o.id === assemblyOrderId
    );
    if (!order) return;

    const confirmCharge = window.confirm(
      `Start charging battery batch from Assembly Order #${assemblyOrderId}?\n\nBatteries: ${
        order.actualOutput || order.predictedOutput
      }\n\nProceed?`
    );
    if (!confirmCharge) return;

    const timestamp = new Date().toLocaleString();
    const chargeRecord = {
      id: (inventory?.chargedBatteries?.length || 0) + 1,
      assemblyOrderId,
      predictedOutput: order.actualOutput || order.predictedOutput,
      status: "charging",
      timestamp,
      actualChargedCount: null,
    };

    const updatedBatteries = [
      ...(inventory?.chargedBatteries || []),
      chargeRecord,
    ];
    const updatedAssembly = inventory.assemblyOrders.map((o) =>
      o.id === assemblyOrderId ? { ...o, chargeStatus: "in-progress" } : o
    );

    const updatedInv = {
      ...inventory,
      chargedBatteries: updatedBatteries,
      assemblyOrders: updatedAssembly,
      logs: [
        ...(inventory.logs || []),
        {
          timestamp,
          action: `🔌 Charging started for Battery Batch #${chargeRecord.id} from Assembly #${assemblyOrderId}`,
        },
      ],
    };

    setInventory(updatedInv);
    updateInventory(updatedInv).catch((err) =>
      console.error("Firebase update failed:", err)
    );
  };

  const handleOpenChargeModal = (assemblyOrderId = null) => {
    setChargingFromBatch(assemblyOrderId);
    setChargeFormData({ quantity: "", startTime: "", duration: "", notes: "" });
    setShowChargeModal(true);
  };

  const handleCloseChargeModal = () => {
    setShowChargeModal(false);
    setChargingFromBatch(null);
    setChargeFormData({ quantity: "", startTime: "", duration: "", notes: "" });
  };

  const handleChargeFormChange = (e) => {
    const { name, value } = e.target;
    setChargeFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitCharge = async (e) => {
    e.preventDefault();

    const qty = parseFloat(chargeFormData.quantity);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    if (!chargeFormData.startTime || !chargeFormData.duration) {
      alert("Please fill in Start Time and Duration");
      return;
    }

    const confirmCharge = window.confirm(
      `Start charging?\n\nQuantity: ${qty} batteries\nStart Time: ${
        chargeFormData.startTime
      }\nDuration: ${chargeFormData.duration} hours\nNotes: ${
        chargeFormData.notes || "None"
      }\n\nProceed?`
    );
    if (!confirmCharge) return;

    const timestamp = new Date().toLocaleString();
    const endTime = calculateEndTime(
      chargeFormData.startTime,
      chargeFormData.duration
    );

    const chargeRecord = {
      id: (inventory?.chargedBatteries?.length || 0) + 1,
      assemblyOrderId: chargingFromBatch || null,
      quantity: qty,
      predictedOutput: qty,
      status: "charging",
      timestamp,
      startTime: chargeFormData.startTime,
      duration: chargeFormData.duration,
      endTime,
      notes: chargeFormData.notes,
      actualChargedCount: null,
    };

    const updatedBatteries = [
      ...(inventory?.chargedBatteries || []),
      chargeRecord,
    ];

    // If charging from a batch, mark that batch as in-progress
    let updatedAssembly = inventory.assemblyOrders || [];
    if (chargingFromBatch) {
      updatedAssembly = inventory.assemblyOrders.map((o) =>
        o.id === chargingFromBatch ? { ...o, chargeStatus: "in-progress" } : o
      );
    }

    const updatedInv = {
      ...inventory,
      chargedBatteries: updatedBatteries,
      assemblyOrders: updatedAssembly,
      logs: [
        ...(inventory.logs || []),
        {
          timestamp,
          action: `🔌 Charging started - Batch #${
            chargeRecord.id
          }: ${qty} batteries (${chargeFormData.startTime}, ${
            chargeFormData.duration
          }h)${
            chargingFromBatch ? ` from Assembly #${chargingFromBatch}` : ""
          }`,
        },
      ],
    };

    setInventory(updatedInv);
    await updateInventory(updatedInv);
    handleCloseChargeModal();
  };

  const calculateEndTime = (startTime, duration) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const durationHours = parseFloat(duration);
    const totalMinutes = hours * 60 + minutes + durationHours * 60;
    const endHours = Math.floor((totalMinutes / 60) % 24);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(
      2,
      "0"
    )}`;
  };

  const handleChargeInputChange = (chargeId, value) => {
    setChargeInputs({
      ...chargeInputs,
      [chargeId]: parseFloat(value) || "",
    });
  };

  const handleCompleteCharging = async (chargeId) => {
    if (!inventory) return;

    const chargeRecord = inventory.chargedBatteries.find(
      (c) => c.id === chargeId
    );
    if (!chargeRecord) return;

    const actual = chargeInputs[chargeId] || 0;

    const confirmDone = window.confirm(
      `Mark Charge Batch #${chargeId} as completed?\n\nPredicted: ${chargeRecord.predictedOutput}\nActual Charged: ${actual}\n\nProceed?`
    );
    if (!confirmDone) return;

    const timestamp = new Date().toLocaleString();
    const updatedBatteries = inventory.chargedBatteries.map((c) =>
      c.id === chargeId
        ? { ...c, status: "completed", actualChargedCount: actual }
        : c
    );

    const logs = [...(inventory.logs || [])];
    if (actual !== chargeRecord.predictedOutput) {
      logs.push({
        timestamp,
        logType: "discrepency",
        action: `⚠️ Charge discrepancy Batch #${chargeId}: Predicted ${chargeRecord.predictedOutput}, Actual ${actual}`,
      });
    }
    logs.push({
      timestamp,
      action: `✅ Charging completed for Batch #${chargeId}`,
    });

    const updatedInv = {
      ...inventory,
      chargedBatteries: updatedBatteries,
      logs,
    };

    setInventory(updatedInv);
    await updateInventory(updatedInv);

    setChargeInputs((prev) => {
      const copy = { ...prev };
      delete copy[chargeId];
      return copy;
    });
  };

  if (!inventory) return <Loader />;

  const availableBatteries = getAvailableBatteries();
  const chargedBatteries = getChargedBatteries();

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <h2 className="text-3xl font-bold text-center mb-6">
        🔌 Battery Charging
      </h2>

      {/* Start New Charging Session Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => handleOpenChargeModal()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          ⚡ Start New Charging Session
        </button>
      </div>

      {availableBatteries.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold mb-4">📦 Available Batteries</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2">Assembly Order #</th>
                  <th className="text-left px-4 py-2">Battery Count</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {availableBatteries.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">#{order.id}</td>
                    <td className="px-4 py-3">
                      {order.actualOutput || order.predictedOutput}
                    </td>
                    <td className="px-4 py-3">{order.timestamp}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleOpenChargeModal(order.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Start Charging
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xl font-semibold mt-10 mb-4">
          ⚡ Charging Batches
        </h3>
        {chargedBatteries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2">Batch #</th>
                  <th className="text-left px-4 py-2">From Assembly #</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">
                    Charged (Predicted / Actual)
                  </th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {chargedBatteries.map((charge) => {
                  const statusLabel =
                    charge.status === "charging" ? "In Progress" : "Completed";
                  const predNum = Number(charge.predictedOutput) || 0;
                  const actNum =
                    charge.actualChargedCount ??
                    chargeInputs[charge.id] ??
                    null;
                  const actNum_ = actNum != null ? Number(actNum) || 0 : null;

                  let outputClass = "text-gray-700";
                  if (actNum_ != null) {
                    if (predNum < actNum_)
                      outputClass = "text-red-600 font-semibold";
                    else if (predNum === actNum_)
                      outputClass = "text-green-600 font-semibold";
                  }

                  return (
                    <React.Fragment key={charge.id}>
                      <tr className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">#{charge.id}</td>
                        <td className="px-4 py-3">#{charge.assemblyOrderId}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              charge.status === "charging"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${outputClass}`}>
                          {charge.predictedOutput} /{" "}
                          {charge.actualChargedCount ??
                            chargeInputs[charge.id] ??
                            "-"}
                        </td>
                        <td className="px-4 py-3">{charge.timestamp}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                setOpenDetails((prev) =>
                                  prev === charge.id ? null : charge.id
                                )
                              }
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View Details
                            </button>

                            {charge.status === "charging" && (
                              <>
                                <input
                                  type="number"
                                  min="0"
                                  max={charge.predictedOutput}
                                  step="any"
                                  value={chargeInputs[charge.id] ?? ""}
                                  onChange={(e) =>
                                    handleChargeInputChange(
                                      charge.id,
                                      e.target.value
                                    )
                                  }
                                  className={`border rounded px-2 py-1 w-20 ${
                                    chargeInputs[charge.id] != null &&
                                    chargeInputs[charge.id] >
                                      charge.predictedOutput
                                      ? "border-red-500 bg-red-50"
                                      : "border-gray-300"
                                  }`}
                                  placeholder="Actual"
                                  title={`Cannot exceed ${charge.predictedOutput}`}
                                />
                                {chargeInputs[charge.id] != null &&
                                  chargeInputs[charge.id] >
                                    charge.predictedOutput && (
                                    <span className="text-xs text-red-600">
                                      ⚠️ Exceeds quantity
                                    </span>
                                  )}
                                <button
                                  onClick={() =>
                                    handleCompleteCharging(charge.id)
                                  }
                                  disabled={
                                    chargeInputs[charge.id] == null ||
                                    chargeInputs[charge.id] < 0 ||
                                    chargeInputs[charge.id] >
                                      charge.predictedOutput
                                  }
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                                  title={
                                    chargeInputs[charge.id] >
                                    charge.predictedOutput
                                      ? "Actual count cannot exceed predicted"
                                      : ""
                                  }
                                >
                                  Mark Done
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {openDetails === charge.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="space-y-2 grid grid-cols-2 gap-4">
                              <div>
                                <p>
                                  <span className="font-semibold">
                                    From Assembly Order #:
                                  </span>{" "}
                                  {charge.assemblyOrderId || "Manual"}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Batch Started:
                                  </span>{" "}
                                  {charge.timestamp}
                                </p>
                                <p>
                                  <span className="font-semibold">Status:</span>{" "}
                                  {statusLabel}
                                </p>
                              </div>
                              <div>
                                <p>
                                  <span className="font-semibold">
                                    Quantity:
                                  </span>{" "}
                                  {charge.quantity || charge.predictedOutput}
                                </p>
                                {charge.startTime && (
                                  <>
                                    <p>
                                      <span className="font-semibold">
                                        Start Time:
                                      </span>{" "}
                                      {charge.startTime}
                                    </p>
                                    <p>
                                      <span className="font-semibold">
                                        Duration:
                                      </span>{" "}
                                      {charge.duration}h
                                    </p>
                                    <p>
                                      <span className="font-semibold">
                                        End Time:
                                      </span>{" "}
                                      {charge.endTime}
                                    </p>
                                  </>
                                )}
                                {charge.notes && (
                                  <p>
                                    <span className="font-semibold">
                                      Notes:
                                    </span>{" "}
                                    {charge.notes}
                                  </p>
                                )}
                              </div>
                              {charge.status === "completed" && (
                                <div className="col-span-2 mt-2 p-2 bg-blue-50 rounded">
                                  <p>
                                    <span className="font-semibold">
                                      Predicted:
                                    </span>{" "}
                                    {charge.predictedOutput}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Actual Charged:
                                    </span>{" "}
                                    <span
                                      className={`font-semibold ${
                                        charge.actualChargedCount ===
                                        charge.predictedOutput
                                          ? "text-green-600"
                                          : "text-orange-600"
                                      }`}
                                    >
                                      {charge.actualChargedCount}
                                    </span>
                                  </p>
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
          <p className="text-gray-500 italic">No charging batches.</p>
        )}
      </section>

      {/* Charging Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              ⚡ Start Charging Session
            </h3>

            <form onSubmit={handleSubmitCharge} className="space-y-4">
              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block font-medium mb-1">
                  Number of Batteries to Charge
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  step="any"
                  value={chargeFormData.quantity}
                  onChange={handleChargeFormChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  placeholder="e.g., 50"
                  required
                />
              </div>

              {/* Start Time */}
              <div>
                <label htmlFor="startTime" className="block font-medium mb-1">
                  Start Time
                </label>
                <input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={chargeFormData.startTime}
                  onChange={handleChargeFormChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration" className="block font-medium mb-1">
                  Duration (hours)
                </label>
                <input
                  id="duration"
                  name="duration"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={chargeFormData.duration}
                  onChange={handleChargeFormChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  placeholder="e.g., 2"
                  required
                />
              </div>

              {/* Estimated End Time (Read-only) */}
              {chargeFormData.startTime && chargeFormData.duration && (
                <div>
                  <label className="block font-medium mb-1">
                    Estimated End Time
                  </label>
                  <input
                    type="time"
                    value={calculateEndTime(
                      chargeFormData.startTime,
                      chargeFormData.duration
                    )}
                    disabled
                    className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block font-medium mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={chargeFormData.notes}
                  onChange={handleChargeFormChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  rows="3"
                  placeholder="e.g., temperature, charger status, etc."
                />
              </div>

              {chargingFromBatch && (
                <p className="text-sm text-blue-600">
                  ℹ️ Charging from Assembly Order #{chargingFromBatch}
                </p>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseChargeModal}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Start Charging
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charging;
