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
import {
  fetchInventory,
  initInventory,
  updateInventory,
} from "./firebaseService";

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

  const handleUpdateInventory = async (updatedData, logText = null) => {
    if (logText) updatedData.logs = [...(inventory.logs || []), logText];
    setInventory({ ...inventory, ...updatedData });
    await updateInventory({ ...updatedData });
  };

  return (
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
                <Inventory />
              </ProtectedRoute>
            }
          />
          {/* inventory={inventory}  */}
          <Route
            path="/production"
            element={
              <ProtectedRoute user={user}>
                <Production />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assembly"
            element={
              <ProtectedRoute user={user}>
                <Assembly />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Modals */}
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
