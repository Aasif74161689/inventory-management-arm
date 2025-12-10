import React from "react";

const PlateBOM = ({ title = "Item", bomList = [], stockMap = {} }) => {
  if (!bomList || bomList.length === 0) return null;

  const half = Math.ceil(bomList.length / 2);
  const col1 = bomList.slice(0, half);
  const col2 = bomList.slice(half);

  return (
    <div className="border border-gray-300 rounded-md p-4 sm:p-6 bg-gray-50 w-full mb-8">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-center">
        🧾 BOM for 1 {title}
      </h3>

      <div className="flex flex-col sm:flex-row flex-wrap gap-6">
        {[col1, col2].map((col, idx) => (
          <ul
            key={idx}
            className="flex-1 list-none ml-4 space-y-2 text-gray-700"
          >
            {col.map((item) => {
              const stock = stockMap[item.productId]?.quantity || 0;
              const unit = stockMap[item.productId]?.unit || "";
              return (
                <li key={item.productId} className="text-sm sm:text-base">
                  <span className="font-medium capitalize">{item.name}</span>:{" "}
                  {item.qty} (Stock: {stock} {unit})
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </div>
  );
};

export default PlateBOM;
