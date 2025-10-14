// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import Inventory from "./components/Inventory";
import Production from "./components/Production";
import Assembly from "./components/Assembly";
import BulkStockUpdateModal from "./components/BulkStockUpdateModal";
import BatteryBOMUpdateModal from "./components/BatteryBOMUpdateModal";
import UserManagementModal from "./components/UserManagementModal";
import LoginPage from "./components/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import inventoryJSON from "./data/inventoryData.json";
// import { fetchInventory, updateInventory, createInventory } from "./firebaseService";
import { fetchInventory, initInventory, updateInventory } from "./firebaseService";

function App() {
  const navigate = useNavigate();
  const location = useLocation(); // 👈 used to detect current route
  const [user, setUser] = useState(null);
  // const [inventory, setInventory] = useState(inventoryJSON);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [BOMModalOpen, setBOMModalOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [users, setUsers] = useState([]);

  // 🔐 Watch Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 🚪 Logout handler
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    navigate("/login");
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "";

  
  const hideNavbar = location.pathname === "/login";

  // firestore
  const [inventory, setInventory] = useState(null);
  const [docId, setDocId] = useState("");

  useEffect(() => {
    const loadInventory = async () => {
      let data = await fetchInventory();
      if (!data) {
        await initInventory({
          l1_component: { lead: 100, acid: 50, plastic: 75, copper: 200, lithium: 20 },
          l2_component: { battery: 20, casing: 120, transformer: 20 },
          logs: [],
          productionOrders: [],
          assemblyOrders: [],
          finalProducts: 0,
          batteryBOM: { lead: 2, acid: 1, plastic: 1, copper: 1, lithium: 1 }
        });
        data = await fetchInventory();
      }
      setInventory(data);
    };
    loadInventory();
  }, []);

  const handleUpdateInventory = async (updatedData, logText = null) => {
    if (logText) updatedData.logs = [...(inventory.logs || []), logText];
    setInventory({ ...inventory, ...updatedData });
    await updateInventory({ ...updatedData });
  };

  if (!inventory) return <p>Loading...</p>;
  // firrestore end

  return (
    //  <div className="p-4">
    //   <h1 className="text-2xl font-bold">Inventory</h1>
    //   <pre>{JSON.stringify(inventory, null, 2)}</pre>
    //   <button
    //     onClick={() =>
    //       handleUpdateInventory({
    //         l1_component: { ...inventory.l1_component, lead: inventory.l1_component.lead + 10 },
    //       })
    //     }
    //     className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
    //   >
    //     Add 10 Lead
    //   </button>
    // </div>
    <div className="min-h-screen bg-gray-50">
      {/* Navbar (hidden on /login) */}
      {!hideNavbar && (
        <nav className="sticky top-0 z-50 bg-white shadow p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Navigation Links */}
            <div className="flex space-x-6 text-sm sm:text-base font-medium text-gray-700">
              <NavLink to="/" label="Inventory" />
              <NavLink to="/production" label="Production" />
              <NavLink to="/assembly" label="Assembly" />
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4 relative">
              {user ? (
                <>
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {initials}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-gray-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
                        <button
                          onClick={() => {
                            setStockModalOpen(true);
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          Update Stock
                        </button>
                        <button
                          onClick={() => {
                            setBOMModalOpen(true);
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          Update Battery BOM
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Main Routes */}
      <main className="max-w-6xl mx-auto p-4">
        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={<LoginPage onLogin={() => navigate("/")} />}
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute user={user}>
                <Inventory inventory={inventory} setInventory={setInventory} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/production"
            element={
              <ProtectedRoute user={user}>
                <Production />
              </ProtectedRoute>
            }
          />

          {/* <Route
            path="/assembly"
            element={
              <ProtectedRoute user={user}>
                <Assembly inventory={inventory} setInventory={setInventory} />
              </ProtectedRoute>
            }
          /> */}
        </Routes>
      </main>

      {/* Modals */}
      <BulkStockUpdateModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        inventory={inventory}
        setInventory={setInventory}
      />

      <BatteryBOMUpdateModal
        isOpen={BOMModalOpen}
        onClose={() => setBOMModalOpen(false)}
        inventory={inventory}
        setInventory={setInventory}
      />

      <UserManagementModal
        isOpen={userManagementOpen}
        onClose={() => setUserManagementOpen(false)}
        users={users}
        setUsers={setUsers}
      />
    </div>
  );
}

// 🔗 NavLink component
function NavLink({ to, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md transition-colors duration-200 ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
      }`}
    >
      {label}
    </Link>
  );
}

export default App;
