import React, { useState, useEffect } from "react";
import { fetchInventory, updateInventory } from "../firebaseService";
import Loader from "../components/Loader";
import { toast } from "react-toastify";

const Charging = () => {
  const [inventory, setInventory] = useState(null);
  const [circuits, setCircuits] = useState([]);
  const [editingCircuit, setEditingCircuit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editFormData, setEditFormData] = useState({
    circuitNo: null,
    circuitStatus: "chargeable", // circuit-level: idle | chargeable | breakdown
    status: "empty", // battery-level: running | empty | done
    batteryCount: "",
    putInDate: "",
    prevBatteryCount: 0,
    endTime: "",
  });

  const pad = (n) => (n < 10 ? "0" + n : n);

  const formatNowForDateTimeLocal = () => {
    const d = new Date();
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
  };

  const computeAvailableInventoryExcluding = (excludeCircuitNo) => {
    // Total assigned batteries (excluding the given circuit)
    const totalAssigned = circuits.reduce(
      (sum, c) =>
        sum +
        (c.circuitNo !== excludeCircuitNo ? Number(c.batteryCount || 0) : 0),
      0
    );
    // Available = inventory.finalProducts minus total assigned
    return Math.max((inventory?.finalProducts || 0) - totalAssigned, 0);
  };

  const computeFinalMaxForCircuit = (circuitNo) => {
    const circuit = circuits.find((c) => c.circuitNo === circuitNo);
    const capacity = circuit?.batteryCapacity || 0;
    const available = computeAvailableInventoryExcluding(circuitNo);
    return Math.min(capacity, available);
  };

  const generateOrderId = (orders = []) => {
    const next = (orders.length || 0) + 1;
    return `ORD-${String(next).padStart(3, "0")}`;
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchInventory();
        setInventory(data || {});
        if (
          data?.circuits &&
          Array.isArray(data.circuits) &&
          data.circuits.length === 6
        ) {
          setCircuits(
            data.circuits.map((c, i) => ({
              ...c,
              circuitStatus: c.circuitStatus || "chargeable",
              batteryCapacity: c.batteryCapacity || (i + 1 <= 4 ? 25 : 20),
              batteryCount: Number(c.batteryCount || 0),
            }))
          );
        } else {
          const defaultCircuits = Array.from({ length: 6 }, (_, i) => ({
            circuitNo: i + 1,
            status: "empty",
            circuitStatus: "chargeable",
            batteryCount: 0,
            putInDate: "",
            lastUpdated: new Date().toLocaleString(),
            batteryCapacity: i + 1 <= 4 ? 25 : 20,
          }));
          setCircuits(defaultCircuits);
        }
      } catch (err) {
        console.error("Error fetching inventory:", err);
        const fallbackCircuits = Array.from({ length: 6 }, (_, i) => ({
          circuitNo: i + 1,
          status: "empty",
          circuitStatus: "chargeable",
          batteryCount: 0,
          putInDate: "",
          lastUpdated: new Date().toLocaleString(),
          batteryCapacity: i + 1 <= 4 ? 25 : 20,
        }));
        setCircuits(fallbackCircuits);
        setInventory({});
      }
    })();
  }, []);

  const handleOpenEditModal = (circuitNo) => {
    const circuit = circuits.find((c) => c.circuitNo === circuitNo);
    if (!circuit) return;

    setEditingCircuit(circuitNo);
    setEditFormData({
      circuitNo,
      circuitStatus: circuit.circuitStatus || "chargeable",
      status: circuit.status || "empty",
      batteryCount: circuit.batteryCount,
      putInDate: circuit.putInDate || "",
      prevBatteryCount: Number(circuit.batteryCount || 0),
      endTime: "",
    });

    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingCircuit(null);
    setEditFormData({
      circuitNo: null,
      circuitStatus: "chargeable",
      status: "empty",
      batteryCount: "",
      putInDate: "",
      prevBatteryCount: 0,
      endTime: "",
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;

    // circuitStatus change only stored; applied on save
    if (name === "circuitStatus") {
      setEditFormData((prev) => ({ ...prev, circuitStatus: value }));
      return;
    }

    // battery-level status logic (auto-fill putInDate when running)
    if (name === "status") {
      const newStatus = value;
      setEditFormData((prev) => {
        let finalStatus = newStatus;
        if (newStatus === "empty" && Number(prev.batteryCount || 0) === 0) {
          finalStatus = "done";
        }
        const shouldAutoFill =
          finalStatus === "running" &&
          (!prev.putInDate || prev.putInDate === "");
        return {
          ...prev,
          status: finalStatus,
          putInDate: shouldAutoFill
            ? formatNowForDateTimeLocal()
            : prev.putInDate,
        };
      });
      return;
    }

    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBatteryCountChange = (rawValue) => {
    let val = parseInt(rawValue, 10);
    if (Number.isNaN(val)) val = 0;

    const circuitNo = editFormData.circuitNo;
    if (!circuitNo) {
      setEditFormData((prev) => ({ ...prev, batteryCount: val }));
      return;
    }

    const finalMax = computeFinalMaxForCircuit(circuitNo);
    if (val > finalMax) val = finalMax;
    if (val < 0) val = 0;

    setEditFormData((prev) => {
      let nextStatus = prev.status;
      if (val === 0 && prev.status === "empty") nextStatus = "done";
      return { ...prev, batteryCount: val, status: nextStatus };
    });
  };

  /**
   * handleSaveCircuit
   *
   * Rules implemented:
   * - If battery-level status === 'done':
   *    * create order, reduce inventory.finalProducts by prev assigned count
   *    * set circuit.circuitStatus => 'idle'
   *    * set circuit.status => 'empty' (battery-level), batteryCount => 0, putInDate => ""
   *
   * - Else if circuitStatus is set to 'idle' or 'breakdown' explicitly:
   *    * return previously assigned batteries back to inventory.finalProducts (so they are not lost)
   *    * set circuit.status => 'empty', batteryCount => 0, putInDate => ""
   *
   * - Else (chargeable + not done):
   *    * apply battery-level updates (status, batteryCount, putInDate) normally
   */
  const handleSaveCircuit = async () => {
    if (!editFormData.circuitNo) return;

    // parse batteryCount safely
    const batteryCount = parseInt(editFormData.batteryCount || 0, 10);
    if (isNaN(batteryCount) || batteryCount < 0) {
      toast.error("Please enter a valid battery count");
      return;
    }

    const finalMax = computeFinalMaxForCircuit(editFormData.circuitNo);
    const clampedBatteryCount = Math.min(batteryCount, finalMax);

    let putInDate = editFormData.putInDate;
    if (
      (!putInDate || putInDate === "") &&
      (clampedBatteryCount > 0 || editFormData.status === "running")
    ) {
      putInDate = formatNowForDateTimeLocal();
    }

    if (
      editFormData.status === "done" &&
      (!editFormData.endTime || editFormData.endTime === "")
    ) {
      toast.error("End Time is required when status is 'done'");
      return;
    }

    const newOrders = inventory?.orders ? [...inventory.orders] : [];
    let updatedInv = { ...inventory };
    let updatedCircuits = circuits.map((c) => {
      if (c.circuitNo !== editFormData.circuitNo) return c;

      const prevCount = Number(c.batteryCount || 0);

      // 1) If battery-level status is 'done' -> perform done flow
      if (editFormData.status === "done") {
        // reduce inventory by previously assigned count (prevCount)
        updatedInv.finalProducts = Math.max(
          (updatedInv.finalProducts || 0) - prevCount,
          0
        );

        // create order (same behavior as previous)
        const orderId = generateOrderId(newOrders);
        const startTime = c.putInDate || "";
        const endTime = editFormData.endTime;
        let durationHours = 0;
        try {
          const s = startTime ? new Date(startTime) : null;
          const e = new Date(endTime);
          if (s && !isNaN(s) && !isNaN(e)) {
            const diffMs = e.getTime() - s.getTime();
            durationHours = Math.max(0, Number((diffMs / 3600000).toFixed(2)));
          }
        } catch {}
        const order = {
          orderId,
          circuitNo: editFormData.circuitNo,
          startTime,
          endTime,
          quantity: prevCount,
          durationHours,
          status: "done",
        };
        newOrders.unshift(order);

        // set circuitStatus => idle (as requested), battery-level becomes empty, batteryCount cleared
        return {
          ...c,
          circuitStatus: "idle",
          status: "empty",
          batteryCount: 0,
          putInDate: "",
          lastUpdated: new Date().toLocaleString(),
        };
      }

      // 2) If user explicitly set circuitStatus to idle or breakdown -> wipe assignment and return batteries to inventory
      if (
        editFormData.circuitStatus === "idle" ||
        editFormData.circuitStatus === "breakdown"
      ) {
        // Return previously assigned batteries back to inventory.finalProducts
        updatedInv.finalProducts = Math.max(
          (updatedInv.finalProducts || 0) + prevCount,
          0
        );

        return {
          ...c,
          circuitStatus: editFormData.circuitStatus,
          status: "empty",
          batteryCount: 0,
          putInDate: "",
          lastUpdated: new Date().toLocaleString(),
        };
      }

      // 3) Otherwise (chargeable and not done) apply battery-level updates normally
      return {
        ...c,
        circuitStatus:
          editFormData.circuitStatus || c.circuitStatus || "chargeable",
        status: editFormData.status,
        batteryCount: clampedBatteryCount,
        putInDate:
          editFormData.status === "running" || clampedBatteryCount > 0
            ? putInDate
            : c.putInDate,
        lastUpdated: new Date().toLocaleString(),
      };
    });

    // Update inventory fields
    updatedInv.circuits = updatedCircuits;
    updatedInv.orders = newOrders;
    updatedInv.logs = [
      ...(inventory?.logs || []),
      {
        timestamp: new Date().toLocaleString(),
        action: `⚡ Circuit #${editFormData.circuitNo} updated: CircuitStatus=${editFormData.circuitStatus}, BatteryStatus=${editFormData.status}, Batteries=${clampedBatteryCount}`,
      },
    ];

    // Update local state first (optimistic)
    setCircuits(updatedCircuits);
    setInventory(updatedInv);

    try {
      await updateInventory(updatedInv);
      toast.success(`Circuit #${editFormData.circuitNo} updated`);
    } catch (err) {
      toast.error(`Failed to update circuit: ${err.message}`);
      console.error(err);
    }

    handleCloseEditModal();
  };

  const getCircuitBadgeClass = (circuitStatus) => {
    switch (circuitStatus) {
      case "idle":
        return "bg-gray-200 text-gray-700";
      case "chargeable":
        return "bg-blue-100 text-blue-800";
      case "breakdown":
        return "bg-red-200 text-red-900";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getBatteryBadgeClass = (status) => {
    switch (status) {
      case "running":
        return "bg-blue-100 text-blue-800";
      case "empty":
        return "bg-gray-100 text-gray-800";
      case "breakdown":
        return "bg-red-100 text-red-800";
      case "done":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!inventory || circuits.length === 0) return <Loader />;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <h2 className="text-3xl font-bold text-center mb-6">
        🔌 Battery Charging - Circuits Management
      </h2>

      {/* Summary */}
      <section>
        <h3 className="text-xl font-semibold mb-4">📊 Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Running */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center">
            <p className="text-gray-600 text-sm">Running</p>
            <p className="text-2xl font-bold text-blue-600">
              {circuits.filter((c) => c.status === "running").length}
            </p>
          </div>

          {/* Empty */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center">
            <p className="text-gray-600 text-sm">Empty</p>
            <p className="text-2xl font-bold text-gray-600">
              {circuits.filter((c) => c.status === "empty").length}
            </p>
          </div>

          {/* Breakdown */}
          <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
            <p className="text-gray-600 text-sm">Breakdown</p>
            <p className="text-2xl font-bold text-red-600">
              {circuits.filter((c) => c.circuitStatus === "breakdown").length}
            </p>
          </div>

          {/* Total Batteries in CURRENT circuits */}
          <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
            <p className="text-gray-600 text-sm">Total Batteries</p>
            <p className="text-2xl font-bold text-green-600">
              {circuits.reduce(
                (sum, c) =>
                  sum +
                  (c.status !== "empty" ? Number(c.batteryCount || 0) : 0),
                0
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Circuits Table */}
      <section>
        <h3 className="text-xl font-semibold mb-4">⚡ Circuits (1–6)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2 border-b">Circuit No</th>
                <th className="text-left px-4 py-2 border-b">
                  Battery Capacity
                </th>
                <th className="text-left px-4 py-2 border-b">Circuit Status</th>
                <th className="text-left px-4 py-2 border-b">Battery Count</th>
                <th className="text-left px-4 py-2 border-b">Put-in Date</th>
                <th className="text-left px-4 py-2 border-b">Last Updated</th>
                <th className="text-left px-4 py-2 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {circuits.map((circuit) => {
                const isChargeable = circuit.circuitStatus === "chargeable";
                const isBreakdown = circuit.circuitStatus === "breakdown";
                return (
                  <tr
                    key={circuit.circuitNo}
                    className={`border-t hover:bg-gray-50 ${
                      isBreakdown ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold">
                      #{circuit.circuitNo}
                    </td>

                    {/* Battery Capacity always visible */}
                    <td className="px-4 py-3 text-center">
                      {circuit.batteryCapacity}
                    </td>

                    {/* Circuit Status badge */}
                    <td className="px-4 py-2">
                      {circuit.circuitStatus === "chargeable"
                        ? `Chargeable (${circuit.status || "empty"})`
                        : circuit.circuitStatus.charAt(0).toUpperCase() +
                          circuit.circuitStatus.slice(1)}
                    </td>

                    {/* Battery Count: show dash unless chargeable */}
                    <td className="px-4 py-3 text-center">
                      {isChargeable ? circuit.batteryCount : "—"}
                    </td>

                    {/* Put-in Date */}
                    <td className="px-4 py-3">
                      {isChargeable ? circuit.putInDate || "-" : "—"}
                    </td>

                    {/* Last Updated */}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {isChargeable ? circuit.lastUpdated || "-" : "—"}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleOpenEditModal(circuit.circuitNo)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Charging Orders Table */}
      <section>
        <h3 className="text-xl font-semibold mt-8 mb-4">
          📦 Charging Orders (Completed)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2 border-b">Order ID</th>
                <th className="text-left px-4 py-2 border-b">Circuit No</th>
                <th className="text-left px-4 py-2 border-b">Start Time</th>
                <th className="text-left px-4 py-2 border-b">End Time</th>
                <th className="text-left px-4 py-2 border-b">Quantity</th>
                <th className="text-left px-4 py-2 border-b">Duration (hrs)</th>
                <th className="text-left px-4 py-2 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {(inventory?.orders || []).map((o) => (
                <tr key={o.orderId} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{o.orderId}</td>
                  <td className="px-4 py-3">#{o.circuitNo}</td>
                  <td className="px-4 py-3 text-sm">{o.startTime || "-"}</td>
                  <td className="px-4 py-3 text-sm">{o.endTime || "-"}</td>
                  <td className="px-4 py-3 text-center">{o.quantity}</td>
                  <td className="px-4 py-3 text-center">{o.durationHours}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-sm font-medium bg-green-50 text-green-800">
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!inventory?.orders || inventory.orders.length === 0) && (
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-500" colSpan={7}>
                    No completed orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <h4 className="text-lg font-semibold mb-2">
          🔋 Total Batteries Charged
        </h4>
        <p className="text-xl font-bold">
          {(inventory?.orders || []).reduce(
            (sum, o) => sum + (o.quantity || 0),
            0
          )}
        </p>
      </section>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              ⚡ Edit Circuit #{editFormData.circuitNo}
            </h3>
            <div className="space-y-4">
              {/* Circuit-level status */}
              <div>
                <label className="block font-medium mb-1">Circuit Status</label>
                <select
                  name="circuitStatus"
                  value={editFormData.circuitStatus}
                  onChange={handleEditFormChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                >
                  <option value="idle">Idle</option>
                  <option value="chargeable">Chargeable</option>
                  <option value="breakdown">Breakdown</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Idle / Breakdown will clear the assigned batteries
                  (batteryCount → 0).
                </p>
              </div>
              {!(
                editFormData.circuitStatus === "idle" ||
                editFormData.circuitStatus === "breakdown"
              ) && (
                <>
                  {/* Battery-level status */}
                  <div>
                    <label className="block font-medium mb-1">
                      Battery Status
                    </label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditFormChange}
                      className="border border-gray-300 rounded px-3 py-2 w-full"
                    >
                      <option value="running">Running</option>
                      <option value="empty">Empty</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  {/* Hide Battery Count when status = empty */}
                  {editFormData.status !== "empty" && (
                    <div>
                      <label className="block font-medium mb-1">
                        Battery Count (Available:{" "}
                        {computeAvailableInventoryExcluding(
                          editFormData.circuitNo
                        )}
                        )
                      </label>

                      <input
                        type="number"
                        name="batteryCount"
                        min="0"
                        max={computeFinalMaxForCircuit(editFormData.circuitNo)}
                        value={editFormData.batteryCount}
                        onChange={(e) =>
                          handleBatteryCountChange(e.target.value)
                        }
                        className="border border-gray-300 rounded px-3 py-2 w-full"
                      />

                      <p className="text-xs text-gray-500 mt-1">
                        Max allowed:{" "}
                        {computeFinalMaxForCircuit(editFormData.circuitNo)}
                        (capacity:{" "}
                        {circuits.find(
                          (c) => c.circuitNo === editFormData.circuitNo
                        )?.batteryCapacity || 0}
                        )
                      </p>
                    </div>
                  )}

                  {/* Hide Put-in Date when status = empty */}
                  {editFormData.status !== "empty" && (
                    <div>
                      <label className="block font-medium mb-1">
                        Put-in Date
                      </label>
                      <input
                        type="datetime-local"
                        name="putInDate"
                        value={editFormData.putInDate}
                        onChange={handleEditFormChange}
                        className="border border-gray-300 rounded px-3 py-2 w-full"
                      />
                    </div>
                  )}
                </>
              )}

              {/* End Time only when status = done */}
              {editFormData.status === "done" && (
                <div>
                  <label className="block font-medium mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={editFormData.endTime}
                    onChange={handleEditFormChange}
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCircuit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charging;
