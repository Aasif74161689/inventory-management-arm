import React from "react";

const InventorySettingsSection = ({
  title,
  items,
  bomSource,
  updateThreshold,
  updateBOM,
  lowStock,
}) => {
  return (
    <div>
      <h4 className="text-lg font-semibold mb-3">{title}</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {(items || []).map((item) => (
          <div
            key={item.productId}
            className={`border rounded p-4 shadow ${
              item.quantity <= lowStock ? "bg-red-50" : "bg-white"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-gray-500">{item.productId}</div>
                <div className="text-lg font-semibold">{item.productName}</div>
                <div className="text-sm text-gray-600">{item.category}</div>

                <div className="mt-2">
                  <span className="font-medium">Qty:</span> {item.quantity}{" "}
                  {item.unit}
                </div>

                <div>
                  <span className="font-medium">Min Threshold:</span>{" "}
                  {item.minThreshold} {item.unit}
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                {/* Update BOM */}
                <button
                  className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                  onClick={() => updateBOM(item, bomSource)}
                >
                  Update BOM
                </button>

                {/* Update Threshold */}

                <button
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  onClick={() => {
                    const newVal = window.prompt(
                      `Enter new minimum threshold for ${item.productName}`,
                      item.minThreshold
                    );
                    if (!newVal) return;

                    updateThreshold(item.productId, "minThreshold", newVal);
                  }}
                >
                  Update Threshold
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventorySettingsSection;
