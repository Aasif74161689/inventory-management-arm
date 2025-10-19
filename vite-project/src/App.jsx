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

import Inventory from "./pages/Inventory";
import Production from "./pages/Production";
import Assembly from "./pages/Assembly";
import History from "./pages/History";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const navigate = useNavigate();
  const location = useLocation(); // 👈 used to detect current route
  const [user, setUser] = useState(null);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar on md+ screens */}
      {!hideNavbar && (
        <>
          <aside className="hidden md:block w-64 bg-white shadow h-screen sticky top-0">
            <div className="h-full flex flex-col justify-between py-4">
              <div>
                <div className="px-3 mb-6">
                  <h2 className="text-lg font-bold">Inventory App</h2>
                </div>

                <nav className="flex flex-col items-start space-y-2 px-4">
                  <SidebarLink to="/" label="Inventory" icon={<HomeIcon />} />
                  <SidebarLink
                    to="/production"
                    label="Production"
                    icon={<FactoryIcon />}
                  />
                  <SidebarLink
                    to="/assembly"
                    label="Assembly"
                    icon={<AssemblyIcon />}
                  />
                  <SidebarLink
                    to="/history"
                    label="History"
                    icon={<HistoryIcon />}
                  />
                </nav>
              </div>

              <div className="px-4">
                {user ? (
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {user.displayName || user.email}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/login")}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Bottom navigation bar on mobile */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t">
            <div className="flex items-center justify-around py-2">
              <BottomNavLink to="/" icon={<HomeIcon />} label="Inventory" />
              <BottomNavLink
                to="/production"
                icon={<FactoryIcon />}
                label="Production"
              />
              <BottomNavLink
                to="/assembly"
                icon={<AssemblyIcon />}
                label="Assembly"
              />
              <BottomNavLink
                to="/history"
                icon={<HistoryIcon />}
                label="History"
              />
              {user ? (
                <button
                  onClick={handleLogout}
                  className="p-2 flex flex-col items-center"
                  aria-label="Logout"
                >
                  <LogoutIcon />
                  <span className="text-xs mt-1">Logout</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="p-2 flex flex-col items-center text-blue-600"
                  aria-label="Login"
                >
                  <LoginIcon />
                  <span className="text-xs mt-1">Login</span>
                </button>
              )}
            </div>
          </nav>
        </>
      )}

      {/* Main content area with 5% left/right padding and bottom padding for mobile nav */}
      <main className="flex-1 max-w-6xl mx-auto px-[5%] py-4 pb-16 md:pb-4">
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

          <Route
            path="/history"
            element={
              <ProtectedRoute user={user}>
                <History />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
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

function SidebarLink({ to, label, icon }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center w-full px-3 py-2 rounded-md transition-colors duration-200 ${
        isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-100"
      }`}
    >
      <div className="w-6 h-6 flex items-center justify-center">{icon}</div>
      <span className="ml-3">{label}</span>
    </Link>
  );
}

function BottomNavLink({ to, label, icon }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`p-2 flex flex-col items-center transition-colors duration-200 ${
        isActive ? "text-blue-600" : "text-gray-600 hover:text-blue-500"
      }`}
    >
      <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );
}

// Simple SVG icons (kept inline to avoid new dependencies)
function HomeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 10.5L12 4l9 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 10.5v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FactoryIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 21h18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 21V10l4-3v14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 21V13l-4-2v10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssemblyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M19 12c0-3.866-3.134-7-7-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 12a9 9 0 1 1-3-6.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7v6l4 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 17l5-5-5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12H9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 7l-5 5 5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12h11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 19v-2a4 4 0 0 0-4-4H11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getPageTitle(pathname) {
  switch (pathname) {
    case "/":
      return "Inventory";
    case "/production":
      return "Production";
    case "/assembly":
      return "Assembly";
    case "/history":
      return "History";
    default:
      return "";
  }
}

export default App;
