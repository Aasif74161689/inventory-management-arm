export const normalizeBOM = (bomList = []) => {
  return bomList.map((item) => ({
    productId: item.productId || "",
    name: item.name || item.productName || "Unknown Item",
    qty: Number(item.qty) || 0,
  }));
};
