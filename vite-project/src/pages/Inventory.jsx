import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // add this at the top
import batteryBOM from "../data/batteryBOM";
import BulkStockUpdateModal from "../components/BulkStockUpdateModal";
import { fetchInventory, initInventory } from "../firebaseService";
import Loader from "../components/Loader";

const LOW_STOCK_THRESHOLD = 10;

const Inventory = () => {
  const navigate = useNavigate(); // inside your component

  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("l1"); // l1 | l2 | orders | logs

  const safeNumber = (val) => (isNaN(val) || val == null ? 0 : val);

  useEffect(() => {
    const loadInventory = async () => {
      let data = await fetchInventory();
      if (!data) {
        await initInventory({
          l1_component: [
            {
              productId: "PD-001",
              productName: "Positive Jali",
              category: "Lead Alloy",
              unit: "KG",
              quantity: 250,
              minThreshold: 10,
            },
            {
              productId: "PD-002",
              productName: "Negative Jali",
              category: "Lead Alloy",
              unit: "KG",
              quantity: 150,
              minThreshold: 10,
            },
            {
              productId: "PD-003",
              productName: "Part Die",
              category: "Lead Alloy",
              unit: "KG",
              quantity: 500,
              minThreshold: 5,
            },
            {
              productId: "PD-004",
              productName: "Positive Filling",
              category: "Oxide",
              unit: "KG",
              quantity: 300,
              minThreshold: 10,
            },
            {
              productId: "PD-005",
              productName: "Negative Pasting",
              category: "Oxide",
              unit: "KG",
              quantity: 320,
              minThreshold: 10,
            },
            {
              productId: "PD-006",
              productName: "Positive Filling",
              category: "Red Oxide",
              unit: "KG",
              quantity: 100,
              minThreshold: 10,
            },
            {
              productId: "PD-007",
              productName: "Berium",
              category: "Chemical",
              unit: "KG",
              quantity: 50,
              minThreshold: 10,
            },
            {
              productId: "PD-008",
              productName: "Carbon",
              category: "Chemical",
              unit: "KG",
              quantity: 40,
              minThreshold: 10,
            },
            {
              productId: "PD-009",
              productName: "Lignin",
              category: "Chemical",
              unit: "KG",
              quantity: 60,
              minThreshold: 10,
            },
            {
              productId: "PD-010",
              productName: "Fibre",
              category: "Chemical",
              unit: "KG",
              quantity: 80,
              minThreshold: 10,
            },
            {
              productId: "PD-011",
              productName: "DM Water",
              category: "Chemical",
              unit: "LTR",
              quantity: 200,
              minThreshold: 10,
            },
            {
              productId: "PD-012",
              productName: "Acid",
              category: "Chemical",
              unit: "LTR",
              quantity: 150,
              minThreshold: 10,
            },
            {
              productId: "PD-013",
              productName: "Bag",
              category: "Chemical",
              unit: "PCS",
              quantity: 100,
              minThreshold: 5,
            },
            {
              productId: "PD-014",
              productName: "Bottom",
              category: "Chemical",
              unit: "PCS",
              quantity: 100,
              minThreshold: 5,
            },
          ],
          l2_component: [
            {
              productId: "AS-001",
              productName: "Positive Plate",
              unit: "PCS",
              quantity: 12,
              minThreshold: 10,
            },
            {
              productId: "AS-002",
              productName: "Negative Plate",
              unit: "PCS",
              quantity: 18,
              minThreshold: 10,
            },
            {
              productId: "AS-003",
              productName: "Separator",
              unit: "PCS",
              quantity: 3,
              minThreshold: 10,
            },
            {
              productId: "AS-004",
              productName: "Container Set",
              unit: "PCS",
              quantity: 1,
              minThreshold: 5,
            },
            {
              productId: "AS-005",
              productName: "Stool",
              unit: "KG",
              quantity: 0.88,
              minThreshold: 5,
            },
            {
              productId: "AS-006",
              productName: "Side Packing Jali",
              unit: "KG",
              quantity: 0.88,
              minThreshold: 5,
            },
            {
              productId: "AS-007",
              productName: "Thermocol",
              unit: "PCS",
              quantity: 1,
              minThreshold: 10,
            },
            {
              productId: "AS-008",
              productName: "Indicator",
              unit: "PCS",
              quantity: 6,
              minThreshold: 10,
            },
            {
              productId: "AS-009",
              productName: "Nutt Bolt",
              unit: "PCS",
              quantity: 2,
              minThreshold: 10,
            },
            {
              productId: "AS-010",
              productName: "Gelly Pouch",
              unit: "PCS",
              quantity: 1,
              minThreshold: 10,
            },
            {
              productId: "AS-011",
              productName: "Terminal Cover",
              unit: "PCS",
              quantity: 2,
              minThreshold: 10,
            },
            {
              productId: "AS-012",
              productName: "Polythene",
              unit: "PCS",
              quantity: 2,
              minThreshold: 10,
            },
            {
              productId: "AS-013",
              productName: "Sticker",
              unit: "PCS",
              quantity: 2,
              minThreshold: 10,
            },
            {
              productId: "AS-014",
              productName: "Box",
              unit: "PCS",
              quantity: 1,
              minThreshold: 10,
            },
            {
              productId: "AS-015",
              productName: "Warranty Card",
              unit: "PCS",
              quantity: 1,
              minThreshold: 10,
            },
            {
              productId: "AS-016",
              productName: "Acid",
              unit: "LTR",
              quantity: 30,
              minThreshold: 10,
            },
          ],
          logs: [],
          productionOrders: [],
          assemblyOrders: [],
          finalProducts: 0,
          batteryBOM: { lead: 2, acid: 1, plastic: 1, copper: 1, lithium: 1 },
        });
        data = await fetchInventory();
      }
      setInventory(data);
      setLoading(false);
    };
    loadInventory();
  }, []);

  if (loading) return <Loader />;

  if (!inventory)
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        <div className="text-center">
          <p className="text-2xl font-semibold mb-2">⚠️ No inventory data</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-3xl font-bold text-center mb-6">
        📦 Inventory Dashboard
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-white mb-8">
        <div className="bg-blue-500 p-4 rounded shadow text-center">
          <h4 className="text-lg font-semibold">In Production</h4>
          <p className="text-2xl">
            {safeNumber(
              inventory.productionOrders?.filter(
                (order) => order.status === "started"
              ).length
            )}
          </p>
        </div>

        <div className="bg-yellow-500 p-4 rounded shadow text-center">
          <h4 className="text-lg font-semibold">In Assembly</h4>
          <p className="text-2xl">
            {safeNumber(
              inventory.assemblyOrders?.filter(
                (order) => order.status === "started"
              ).length
            )}
          </p>
        </div>

        <div className="bg-red-500 p-4 rounded shadow text-center">
          <h4 className="text-lg font-semibold">Discrepancies</h4>
          <p className="text-2xl">
            {safeNumber(
              inventory.logs?.filter(
                (log) =>
                  log.action?.includes("⚠️") &&
                  log.action?.toLowerCase().includes("discrepancy")
              ).length
            )}
          </p>
        </div>

        <div className="bg-green-600 p-4 rounded shadow text-center">
          <h4 className="text-lg font-semibold">Products</h4>
          <p className="text-2xl">{safeNumber(inventory.finalProducts)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-300 mb-6">
        <button
          onClick={() => setActiveTab("l1")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "l1"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600"
          }`}
        >
          L1 Production / Inventory
        </button>
        <button
          onClick={() => setActiveTab("l2")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "l2"
              ? "border-b-2 border-green-600 text-green-600"
              : "text-gray-600"
          }`}
        >
          L2 Assembly / Inventory
        </button>

        <button className="px-4 py-2 font-semibold text-gray-600 hover:text-blue-600">
          setting
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "l1" && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex justify-between">
            🔹 L1 | Battery Raw Materials
            <button
              className="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setModalOpen(true)}
            >
              Update
            </button>
          </h3>

          <table className="min-w-full border border-gray-300 rounded-md mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-b">Product ID</th>
                <th className="px-4 py-2 border-b">Product Name</th>
                <th className="px-4 py-2 border-b">Qty / Unit</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const grouped = {};
                (inventory.l1_component || []).forEach((item) => {
                  if (!grouped[item.category]) grouped[item.category] = [];
                  grouped[item.category].push(item);
                });

                return Object.entries(grouped).map(([category, items]) => (
                  <React.Fragment key={category}>
                    <tr className="bg-blue-100 text-left">
                      <td colSpan={3} className="px-4 py-2 font-bold">
                        {category}
                      </td>
                    </tr>
                    {items.map((item) => (
                      <tr
                        key={item.productId}
                        className={
                          safeNumber(item.quantity) <= LOW_STOCK_THRESHOLD
                            ? "bg-red-100 text-red-800 font-semibold"
                            : "bg-white"
                        }
                      >
                        <td className="px-4 py-2 border-b">{item.productId}</td>
                        <td className="px-4 py-2 border-b">
                          {item.productName}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {safeNumber(item.quantity)} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "l2" && (
        <div>
          <h3 className="text-xl font-semibold mb-4">
            🔸 L2 | Assembly Components
          </h3>
          <table className="min-w-full border border-gray-300 rounded-md mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-b">Product ID</th>
                <th className="px-4 py-2 border-b">Product Name</th>
                <th className="px-4 py-2 border-b">Qty / Unit</th>
              </tr>
            </thead>
            <tbody>
              {(inventory.l2_component || []).map((item) => (
                <tr
                  key={item.productId}
                  className={
                    safeNumber(item.quantity) <= LOW_STOCK_THRESHOLD
                      ? "bg-red-100 text-red-800 font-semibold"
                      : "bg-white"
                  }
                >
                  <td className="px-4 py-2 border-b">{item.productId}</td>
                  <td className="px-4 py-2 border-b">{item.productName}</td>
                  <td className="px-4 py-2 border-b">
                    {safeNumber(item.quantity)} {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Stock Update Modal */}
      <BulkStockUpdateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        materials={inventory.l1_component}
        setInventory={setInventory}
      />
    </div>
  );
};

export default Inventory;
