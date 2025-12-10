import React, { useState, useEffect } from "react";
import { fetchInventory, updateInventory } from "../firebaseService";
import Loader from "../components/Loader";
import { toast } from "react-toastify";

const Shipment = () => {
  const [inventory, setInventory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    destination: "",
    quantity: "",
    status: "packed",
    shipmentTime: "",
  });

  // Input datetime-local format (no seconds)
  const nowForInput = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  // Fetch inventory
  useEffect(() => {
    (async () => {
      const data = await fetchInventory();
      setInventory(data || {});
    })();
  }, []);

  // Totals
  const totalProduced = (inventory?.orders || [])
    .filter((o) => o.status === "done")
    .reduce((sum, o) => sum + Number(o.quantity), 0);

  const totalShipped = (inventory?.shipments || []).reduce(
    (sum, s) => sum + Number(s.quantity),
    0
  );

  const totalAvailable = Math.max(totalProduced - totalShipped, 0);
  const shipments = (inventory?.shipments || []).slice().reverse();

  // ⭐ CORRECTED: Logs formatted for History Page
  const addLog = (action) => {
    const formattedTime = new Date().toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    });

    const newLog = {
      action, // History page expects "action"
      timestamp: formattedTime, // Human-readable timestamp
    };

    const logs = inventory.logs || [];
    return [...logs, newLog];
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      destination: "",
      quantity: "",
      status: "packed",
      shipmentTime: nowForInput(),
    });
    setEditId(null);
  };

  const handleOpenModal = (shipment = null) => {
    if (shipment) {
      setFormData({
        destination: shipment.destination,
        quantity: shipment.quantity,
        status: shipment.status,
        shipmentTime: shipment.timestamp || nowForInput(),
      });
      setEditId(shipment.id);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Save shipment
  const handleSubmitShipment = async (e) => {
    e.preventDefault();

    if (!formData.destination || !formData.quantity) {
      toast.error("Please fill all fields");
      return;
    }

    const qty = Number(formData.quantity);
    if (qty <= 0) return toast.error("Quantity must be positive");
    if (qty > totalAvailable && !editId)
      return toast.error(`Cannot ship more than available (${totalAvailable})`);

    const rawTime = formData.shipmentTime || nowForInput();
    const time = rawTime.length === 16 ? rawTime + ":00" : rawTime;

    let updatedShipments = inventory.shipments || [];
    let logText = "";

    if (editId) {
      const oldData = inventory.shipments.find((s) => s.id === editId);

      updatedShipments = updatedShipments.map((s) =>
        s.id === editId
          ? {
              ...s,
              destination: formData.destination,
              quantity: qty,
              status: formData.status,
              timestamp: time,
            }
          : s
      );

      // Detect what changed
      if (formData.status !== oldData.status) {
        if (formData.status === "shipped") {
          logText = `🚚 Shipment #${editId} shipped (Qty=${qty})`;
        } else if (formData.status === "in-transit") {
          logText = `📦➡️ Shipment #${editId} is in transit (Qty=${qty})`;
        } else if (formData.status === "delivered") {
          logText = `📬 Shipment #${editId} delivered (Qty=${qty})`;
        } else {
          logText = `✏️ Shipment #${editId} updated (status changed)`;
        }
      } else if (
        formData.destination !== oldData.destination ||
        qty !== oldData.quantity
      ) {
        logText = `✏️ Shipment #${editId} updated: Destination=${formData.destination}, Qty=${qty}`;
      } else {
        logText = `✏️ Shipment #${editId} updated`;
      }

      toast.success("Shipment updated successfully");
    } else {
      const newShipment = {
        id: updatedShipments.length + 1,
        destination: formData.destination,
        quantity: qty,
        status: formData.status,
        timestamp: time,
      };
      updatedShipments.push(newShipment);

      logText = `📦 Shipment #${newShipment.id} created: Destination=${newShipment.destination}, Qty=${newShipment.quantity}`;
      toast.success("Shipment created successfully");
    }

    const updatedLogs = addLog(logText);

    const updatedInv = {
      ...inventory,
      shipments: updatedShipments,
      logs: updatedLogs,
    };

    await updateInventory(updatedInv);
    const fresh = await fetchInventory();
    setInventory(fresh);

    handleCloseModal();
  };

  // Delete shipment
  const handleDeleteShipment = async (id) => {
    if (!window.confirm("Delete shipment?")) return;

    const updatedShipments = inventory.shipments.filter((s) => s.id !== id);

    const logText = `🗑 Shipment #${id} deleted`;
    const updatedLogs = addLog(logText);

    const updatedInv = {
      ...inventory,
      shipments: updatedShipments,
      logs: updatedLogs,
    };

    await updateInventory(updatedInv);
    const fresh = await fetchInventory();
    setInventory(fresh);

    toast.success("Shipment deleted successfully");
  };

  const formatDisplayTime = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    });
  };

  if (!inventory) return <Loader />;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">
        📦 Dishpatch Management
      </h2>

      {/* Available Batteries */}
      <section className="p-4 bg-gray-100 border rounded">
        <h3 className="text-lg sm:text-xl font-semibold">
          🔋 Total Batteries Available
        </h3>
        <p className="text-3xl sm:text-4xl font-bold">{totalAvailable}</p>
      </section>

      {/* Shipment List */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-xl sm:text-2xl font-semibold">📮 Shipments</h3>

          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full sm:w-auto"
          >
            + New Shipment
          </button>
        </div>

        {shipments.length === 0 ? (
          <p>No shipments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full border text-sm sm:text-base">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Order #</th>
                  <th className="p-2 text-left">Destination</th>
                  <th className="p-2 text-left">Qty</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">#{s.id}</td>
                    <td className="p-2">{s.destination}</td>
                    <td className="p-2">{s.quantity}</td>
                    <td className="p-2 capitalize">{s.status}</td>
                    <td className="p-2">{formatDisplayTime(s.timestamp)}</td>

                    <td className="p-2 whitespace-nowrap">
                      {s.status !== "delivered" && (
                        <button
                          onClick={() => handleOpenModal(s)}
                          className="text-blue-600 mr-3"
                        >
                          Edit
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteShipment(s.id)}
                        className="text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded shadow w-full max-w-sm sm:max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editId ? "Edit Shipment" : "New Shipment"}
            </h3>

            <form onSubmit={handleSubmitShipment} className="space-y-4">
              <div>
                <label>Destination</label>
                <input
                  name="destination"
                  value={formData.destination}
                  onChange={handleFormChange}
                  className="border p-2 rounded w-full"
                />
              </div>

              <div>
                <label>Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleFormChange}
                  className="border p-2 rounded w-full"
                />
              </div>

              <div>
                <label>Shipment Time</label>
                <input
                  type="datetime-local"
                  name="shipmentTime"
                  value={formData.shipmentTime}
                  onChange={handleFormChange}
                  className="border p-2 rounded w-full"
                />
              </div>

              <div>
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  className="border p-2 rounded w-full"
                >
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="in-transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>

                <button className="px-4 py-2 bg-blue-600 text-white rounded">
                  {editId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipment;
