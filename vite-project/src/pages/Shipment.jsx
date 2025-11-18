import React, { useState, useEffect } from "react";
import { fetchInventory, updateInventory } from "../firebaseService";
import Loader from "../components/Loader";

const Shipment = () => {
  const [inventory, setInventory] = useState(null);
  const [openDetails, setOpenDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    chargeId: "",
    destination: "",
    quantity: "",
    status: "packed",
  });
  const [editId, setEditId] = useState(null);

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

  // Get available charged batteries not yet shipped
  const getAvailableChargedBatteries = () => {
    return (inventory?.chargedBatteries || []).filter(
      (c) => c.status === "completed"
    );
  };

  // Get shipments
  const getShipments = () => {
    return (inventory?.shipments || []).slice().reverse();
  };

  const resetForm = () => {
    setFormData({
      chargeId: "",
      destination: "",
      quantity: "",
      status: "packed",
    });
    setEditId(null);
  };

  const handleOpenModal = (shipment = null) => {
    if (shipment) {
      setFormData({
        chargeId: shipment.chargeId,
        destination: shipment.destination,
        quantity: shipment.quantity,
        status: shipment.status,
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

  // Get the charged count for a batch ID
  const getChargedCount = (chargeId) => {
    const charge = inventory?.chargedBatteries?.find(
      (c) => c.id === parseInt(chargeId)
    );
    return charge ? charge.actualChargedCount || charge.predictedOutput : 0;
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "packed":
        return "bg-yellow-100 text-yellow-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "in-transit":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status label
  const getStatusLabel = (status) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleSubmitShipment = async (e) => {
    e.preventDefault();

    if (!formData.chargeId || !formData.destination || !formData.quantity) {
      alert("Please fill all fields");
      return;
    }

    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      alert("Quantity must be a positive number");
      return;
    }

    const chargedCount = getChargedCount(formData.chargeId);
    if (qty > chargedCount) {
      alert(
        `Shipment quantity cannot exceed available charged count (${chargedCount})`
      );
      return;
    }

    const confirmShip = window.confirm(
      `Create shipment?\n\nCharge Batch: #${formData.chargeId}\nAvailable: ${chargedCount}\nShip Quantity: ${qty}\nDestination: ${formData.destination}\n\nProceed?`
    );
    if (!confirmShip) return;

    const timestamp = new Date().toLocaleString();

    if (editId) {
      // Update existing shipment
      const updatedShipments = inventory.shipments.map((s) =>
        s.id === editId
          ? {
              ...s,
              chargeId: formData.chargeId,
              destination: formData.destination,
              quantity: qty,
              status: formData.status,
              updatedAt: timestamp,
            }
          : s
      );

      const updatedInv = {
        ...inventory,
        shipments: updatedShipments,
        logs: [
          ...(inventory.logs || []),
          {
            timestamp,
            action: `📋 Shipment #${editId} updated - Status: ${getStatusLabel(
              formData.status
            )}, Destination: ${formData.destination}, Qty: ${qty}`,
          },
        ],
      };

      setInventory(updatedInv);
      await updateInventory(updatedInv);
    } else {
      // Create new shipment
      const newShipment = {
        id: (inventory?.shipments?.length || 0) + 1,
        chargeId: formData.chargeId,
        destination: formData.destination,
        quantity: qty,
        status: formData.status,
        timestamp,
      };

      const updatedShipments = [...(inventory?.shipments || []), newShipment];
      const updatedInv = {
        ...inventory,
        shipments: updatedShipments,
        logs: [
          ...(inventory.logs || []),
          {
            timestamp,
            action: `📦 New shipment created - Status: ${getStatusLabel(
              formData.status
            )}, Destination: ${formData.destination}, Qty: ${qty}`,
          },
        ],
      };

      setInventory(updatedInv);
      await updateInventory(updatedInv);
    }

    handleCloseModal();
  };

  const handleShipNow = async (shipmentId) => {
    if (!inventory) return;

    const shipment = inventory.shipments.find((s) => s.id === shipmentId);
    if (!shipment) return;

    const confirmShipNow = window.confirm(
      `Update Shipment #${shipmentId}?\n\nDestination: ${
        shipment.destination
      }\nQuantity: ${shipment.quantity}\nCurrent Status: ${getStatusLabel(
        shipment.status
      )}\n\nProceed?`
    );
    if (!confirmShipNow) return;

    const timestamp = new Date().toLocaleString();
    const updatedShipments = inventory.shipments.map((s) =>
      s.id === shipmentId
        ? { ...s, status: "shipped", shippedAt: timestamp }
        : s
    );

    const updatedInv = {
      ...inventory,
      shipments: updatedShipments,
      logs: [
        ...(inventory.logs || []),
        {
          timestamp,
          action: `✈️ Shipment #${shipmentId} status updated to Shipped - Destination: ${shipment.destination} with ${shipment.quantity} units`,
        },
      ],
    };

    setInventory(updatedInv);
    await updateInventory(updatedInv);
  };

  const handleDeleteShipment = async (shipmentId) => {
    const confirmDelete = window.confirm(`Delete Shipment #${shipmentId}?`);
    if (!confirmDelete) return;

    const timestamp = new Date().toLocaleString();
    const updatedShipments = inventory.shipments.filter(
      (s) => s.id !== shipmentId
    );

    const updatedInv = {
      ...inventory,
      shipments: updatedShipments,
      logs: [
        ...(inventory.logs || []),
        {
          timestamp,
          action: `🗑️ Shipment #${shipmentId} deleted`,
        },
      ],
    };

    setInventory(updatedInv);
    await updateInventory(updatedInv);
  };

  if (!inventory) return <Loader />;

  const availableChargedBatteries = getAvailableChargedBatteries();
  const shipments = getShipments();

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <h2 className="text-3xl font-bold text-center mb-6">
        📦 Shipment Management
      </h2>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">📮 Shipments</h3>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + New Shipment
          </button>
        </div>

        {shipments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2">Order #</th>
                  <th className="text-left px-4 py-2">Charge Batch</th>
                  <th className="text-left px-4 py-2">Destination</th>
                  <th className="text-left px-4 py-2">Quantity</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <React.Fragment key={shipment.id}>
                    <tr className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">#{shipment.id}</td>
                      <td className="px-4 py-3">#{shipment.chargeId}</td>
                      <td className="px-4 py-3">{shipment.destination}</td>
                      <td className="px-4 py-3">{shipment.quantity}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${getStatusBadgeClass(
                            shipment.status
                          )}`}
                        >
                          {getStatusLabel(shipment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{shipment.timestamp}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              setOpenDetails((prev) =>
                                prev === shipment.id ? null : shipment.id
                              )
                            }
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Details
                          </button>

                          {shipment.status !== "delivered" && (
                            <>
                              <button
                                onClick={() => handleOpenModal(shipment)}
                                className="text-sm text-purple-600 hover:underline"
                              >
                                Edit
                              </button>
                              {shipment.status === "packed" && (
                                <button
                                  onClick={() => handleShipNow(shipment.id)}
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                                >
                                  → Shipped
                                </button>
                              )}
                              {shipment.status === "shipped" && (
                                <button
                                  onClick={() => {
                                    const timestamp =
                                      new Date().toLocaleString();
                                    const updatedShipments =
                                      inventory.shipments.map((s) =>
                                        s.id === shipment.id
                                          ? { ...s, status: "in-transit" }
                                          : s
                                      );
                                    const updatedInv = {
                                      ...inventory,
                                      shipments: updatedShipments,
                                      logs: [
                                        ...(inventory.logs || []),
                                        {
                                          timestamp,
                                          action: `🚚 Shipment #${shipment.id} status updated to In Transit`,
                                        },
                                      ],
                                    };
                                    setInventory(updatedInv);
                                    updateInventory(updatedInv);
                                  }}
                                  className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm"
                                >
                                  → In Transit
                                </button>
                              )}
                              {shipment.status === "in-transit" && (
                                <button
                                  onClick={() => {
                                    const timestamp =
                                      new Date().toLocaleString();
                                    const updatedShipments =
                                      inventory.shipments.map((s) =>
                                        s.id === shipment.id
                                          ? {
                                              ...s,
                                              status: "delivered",
                                              deliveredAt: timestamp,
                                            }
                                          : s
                                      );
                                    const updatedInv = {
                                      ...inventory,
                                      shipments: updatedShipments,
                                      logs: [
                                        ...(inventory.logs || []),
                                        {
                                          timestamp,
                                          action: `✅ Shipment #${shipment.id} delivered to ${shipment.destination}`,
                                        },
                                      ],
                                    };
                                    setInventory(updatedInv);
                                    updateInventory(updatedInv);
                                  }}
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                                >
                                  ✓ Delivered
                                </button>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => handleDeleteShipment(shipment.id)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {openDetails === shipment.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="space-y-2 grid grid-cols-2 gap-4">
                            <div>
                              <p>
                                <span className="font-semibold">
                                  Shipment #:
                                </span>{" "}
                                {shipment.id}
                              </p>
                              <p>
                                <span className="font-semibold">
                                  Charge Batch #:
                                </span>{" "}
                                {shipment.chargeId}
                              </p>
                              <p>
                                <span className="font-semibold">
                                  Destination:
                                </span>{" "}
                                {shipment.destination}
                              </p>
                              <p>
                                <span className="font-semibold">Status:</span>{" "}
                                <span
                                  className={`px-2 py-1 rounded text-sm font-medium inline-block ${getStatusBadgeClass(
                                    shipment.status
                                  )}`}
                                >
                                  {getStatusLabel(shipment.status)}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p>
                                <span className="font-semibold">
                                  Shipment Quantity:
                                </span>{" "}
                                {shipment.quantity}
                              </p>
                              <p>
                                <span className="font-semibold">
                                  Available Charged:
                                </span>{" "}
                                <span className="text-blue-600 font-semibold">
                                  {getChargedCount(shipment.chargeId)}
                                </span>
                              </p>
                              <p>
                                <span className="font-semibold">Created:</span>{" "}
                                {shipment.timestamp}
                              </p>
                              {shipment.shippedAt && (
                                <p>
                                  <span className="font-semibold">
                                    Shipped:
                                  </span>{" "}
                                  {shipment.shippedAt}
                                </p>
                              )}
                              {shipment.deliveredAt && (
                                <p>
                                  <span className="font-semibold">
                                    Delivered:
                                  </span>{" "}
                                  {shipment.deliveredAt}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic">No shipments.</p>
        )}
      </section>

      {/* Modal for add/edit shipment */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-xl font-bold mb-4">
              {editId ? "Edit" : "New"} Shipment
            </h3>

            <form onSubmit={handleSubmitShipment} className="space-y-4">
              <div>
                <label htmlFor="chargeId" className="block font-medium mb-1">
                  Charge Batch #
                </label>
                <select
                  id="chargeId"
                  name="chargeId"
                  value={formData.chargeId}
                  onChange={handleFormChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                >
                  <option value="">-- Select --</option>
                  {availableChargedBatteries.map((charge) => {
                    const count =
                      charge.actualChargedCount || charge.predictedOutput;
                    return (
                      <option key={charge.id} value={charge.id}>
                        Batch #{charge.id} ({count} units available)
                      </option>
                    );
                  })}
                </select>
              </div>

              {formData.chargeId && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm">
                    <span className="font-semibold">Available Batteries:</span>
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {getChargedCount(formData.chargeId)} units
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="destination" className="block font-medium mb-1">
                  Destination
                </label>
                <input
                  id="destination"
                  name="destination"
                  type="text"
                  value={formData.destination}
                  onChange={handleFormChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  placeholder="e.g., Warehouse A, City, etc."
                />
              </div>

              <div>
                <label htmlFor="quantity" className="block font-medium mb-1">
                  Quantity to Ship
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  max={
                    formData.chargeId
                      ? getChargedCount(formData.chargeId)
                      : undefined
                  }
                  value={formData.quantity}
                  onChange={handleFormChange}
                  className={`border rounded px-3 py-2 w-full ${
                    formData.quantity &&
                    getChargedCount(formData.chargeId) &&
                    parseFloat(formData.quantity) >
                      getChargedCount(formData.chargeId)
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  placeholder="Number of units"
                  disabled={!formData.chargeId}
                />
                {formData.quantity &&
                  getChargedCount(formData.chargeId) &&
                  parseFloat(formData.quantity) >
                    getChargedCount(formData.chargeId) && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Cannot exceed {getChargedCount(formData.chargeId)}{" "}
                      available units
                    </p>
                  )}
              </div>

              <div>
                <label htmlFor="status" className="block font-medium mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                >
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="in-transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !formData.chargeId ||
                    !formData.destination ||
                    !formData.quantity ||
                    parseFloat(formData.quantity) <= 0 ||
                    (formData.chargeId &&
                      parseFloat(formData.quantity) >
                        getChargedCount(formData.chargeId))
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
