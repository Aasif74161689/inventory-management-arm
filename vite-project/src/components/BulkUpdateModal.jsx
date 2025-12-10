import React, { useState, useEffect } from "react";
import { updateInventory } from "../firebaseService";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BulkUpdateModal = ({
  isOpen,
  onClose,
  materials,
  type = "L1",
  setInventory,
}) => {
  const [stockData, setStockData] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remarks, setRemarks] = useState("");

  const config = {
    L1: {
      unit: "KG",
      inventoryKey: "l1_component",
      title: "Update Production Stock",
      logTitle: "Production stock update",
      absoluteItems: ["bag", "bottom"],
      prefix: "PD-",
    },
    L2: {
      unit: "PCS",
      inventoryKey: "l2_component",
      title: "Update L2 Stock",
      logTitle: "Assembly stock update",
      absoluteItems: [
        "positive plate",
        "negative plate",
        "separator",
        "container set",
        "thermocol",
        "indicator",
        "nutt bolt",
        "gelly pouch",
        "terminal cover",
        "polythene",
        "sticker",
        "box",
        "warranty card",
      ],
      prefix: "AS-",
    },
  }[type];

  //   const generateNewProductId = () => {
  //     const prefix = config.prefix;
  //     let maxId = 0;

  //     if (Array.isArray(materials)) {
  //       materials.forEach((m) => {
  //         const match = m.productId.match(new RegExp(`^${prefix}(\\d+)$`));
  //         if (match) maxId = Math.max(maxId, Number(match[1]));
  //       });
  //     }

  //     stockData.forEach((m) => {
  //       const match = m.productId.match(new RegExp(`^${prefix}(\\d+)$`));
  //       if (match) maxId = Math.max(maxId, Number(match[1]));
  //     });

  //     return `${prefix}${String(maxId + 1).padStart(3, "0")}`;
  //   };

  useEffect(() => {
    if (isOpen && materials) {
      let items = [];

      if (Array.isArray(materials)) {
        items = materials.map((m) => ({
          productId: m.productId,
          productName: m.productName || m.name || m.productId,
          qty: 0,
          available: m.quantity ?? m.qty ?? 0,
          unit: m.unit || config.unit,
          isNew: false, // mark existing products
        }));
      } else if (typeof materials === "object") {
        items = Object.entries(materials).map(([name, qty]) => ({
          productId: name,
          productName: name,
          qty: 0,
          available: qty,
          unit: config.unit,
          isNew: false,
        }));
      }

      setStockData(items);
      setShowConfirm(false);
      setRemarks("");
    }
  }, [isOpen, materials]);

  if (!isOpen) return null;

  const handleChange = (index, field, value) => {
    const updated = [...stockData];

    if (field === "qty") updated[index].qty = value === "" ? 0 : Number(value);

    if (field === "name") updated[index].productName = value;

    if (field === "unit") updated[index].unit = value;

    setStockData(updated);
  };

  const handleConfirmSave = async () => {
    const baseArray = Array.isArray(materials)
      ? materials.map((m) => ({ ...m }))
      : [];

    const changes = [];
    let hasReduction = false;

    stockData.forEach(({ productId, productName, qty, available, unit }) => {
      if (!productName.trim() || qty === 0) return;

      const newQty = available + qty;
      const diff = newQty - available;
      if (diff < 0) hasReduction = true;

      changes.push(
        `${
          diff < 0 ? "⚠️ " : ""
        }${productName}: ${available} → ${newQty} ${unit} ${
          diff > 0 ? "+" + diff : diff
        }`
      );

      const idx = baseArray.findIndex((item) => item.productId === productId);
      if (idx !== -1) baseArray[idx].quantity = newQty;
      else baseArray.push({ productId, productName, unit, quantity: newQty });
    });

    if (changes.length > 0) {
      const timestamp = new Date().toLocaleString();
      const newLog = {
        timestamp,
        action: hasReduction
          ? `⚠️ Discrepancy in ${config.logTitle}:\n${changes.join("\n")}`
          : `🔧 ${config.logTitle}:\n${changes.join("\n")}`,
        ...(hasReduction && { logType: "discrepancy" }),
        ...(remarks && { remarks }),
      };

      setInventory((prev) => {
        const updated = {
          ...prev,
          [config.inventoryKey]: baseArray,
          logs: [...(prev?.logs || []), newLog],
        };
        updateInventory(updated);
        return updated;
      });

      toast.success(`${type} stock updated successfully`);
    }

    setShowConfirm(false);
    onClose();
  };

  const previewChanges = stockData
    .filter((s) => s.qty !== 0 && s.productName.trim() !== "")
    .map((s) => ({ ...s, newQty: s.available + s.qty }));

  const hasChanges = stockData.some(
    (item) => item.qty !== 0 && item.productName.trim() !== ""
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-[700px] max-h-[85vh] overflow-y-auto">
        {/* <h2 className="text-xl font-bold mb-4 text-center">
          🔧 {config.title}
        </h2> */}

        <div className="relative mb-4">
          <h2 className="text-xl font-bold text-center">🔧 {config.title}</h2>

          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 text-black-900 hover:text-red-600 text-2xl leading-none"
            onClick={onClose}
          >
            X
          </button>
        </div>

        {showConfirm ? (
          <>
            <h3 className="font-semibold mb-3">Confirm Changes</h3>
            {previewChanges.length > 0 ? (
              <table className="min-w-full border rounded text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-left">Old</th>
                    <th className="px-3 py-2 text-left">Change</th>
                    <th className="px-3 py-2 text-left">New</th>
                  </tr>
                </thead>
                <tbody>
                  {previewChanges.map((p) => (
                    <tr key={p.productId}>
                      <td className="px-3 py-2">{p.productName}</td>
                      <td className="px-3 py-2">
                        {p.available} {p.unit}
                      </td>
                      <td className="px-3 py-2">{p.qty}</td>
                      <td className="px-3 py-2">
                        {p.qty > 0 ? (
                          <span>
                            {p.newQty} {p.unit}{" "}
                            <span className="text-green-600">(+{p.qty})</span>
                          </span>
                        ) : (
                          <span>
                            {p.newQty} {p.unit}{" "}
                            {p.qty < 0 && (
                              <span className="text-red-600">({p.qty})</span>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No changes detected.</p>
            )}

            <textarea
              className="border rounded w-full p-2 mt-3"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks..."
            />

            <div className="flex justify-end gap-4 mt-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setShowConfirm(false)}
              >
                Back
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={handleConfirmSave}
              >
                Confirm & Save
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ADD PRODUCT BUTTON */}
            {/* <div className="flex justify-end mb-4">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={() =>
                  setStockData((prev) => [
                    ...prev,
                    {
                      productId: generateNewProductId(),
                      productName: "",
                      qty: 0,
                      available: 0,
                      unit: config.unit,
                      isNew: true,
                    },
                  ])
                }
              >
                + Add Product
              </button>
            </div> */}

            {/* INPUT AREA */}
            <div className="grid grid-cols-2 gap-4">
              {stockData.map((item, index) => {
                const isAbsolute = config.absoluteItems.some((w) =>
                  item.productName.toLowerCase().includes(w)
                );

                return (
                  <div
                    key={item.productId}
                    className="flex justify-between items-center gap-2"
                  >
                    {item.isNew ? (
                      <input
                        type="text"
                        className="border rounded px-3 py-1 flex-1"
                        placeholder="Product name"
                        value={item.productName}
                        onChange={(e) =>
                          handleChange(index, "name", e.target.value)
                        }
                      />
                    ) : (
                      <span className="flex-1">
                        {item.productName} ({item.unit})
                      </span>
                    )}

                    {/* UNIT DROPDOWN FOR NEW PRODUCTS */}
                    {/* {item.isNew && (
                      <select
                        className="border rounded px-2 py-1"
                        value={item.unit}
                        onChange={(e) =>
                          handleChange(index, "unit", e.target.value)
                        }
                      >
                        <option value="KG">KG</option>
                        <option value="PCS">PCS</option>
                        <option value="LITER">LTR</option>
                        <option value="SET">SET</option>
                      </select>
                    )} */}

                    <input
                      type="number"
                      className="border rounded px-3 py-1 w-24 text-right"
                      value={item.qty || ""}
                      placeholder={item.available}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") return handleChange(index, "qty", "");
                        if (isAbsolute && !/^-?\d+$/.test(val)) return;
                        const num = Number(val);
                        if (num < -item.available) return;
                        handleChange(index, "qty", num);
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded text-white ${
                  hasChanges ? "bg-blue-600" : "bg-gray-400 cursor-not-allowed"
                }`}
                onClick={() => setShowConfirm(true)}
                disabled={!hasChanges}
              >
                Preview & Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BulkUpdateModal;
