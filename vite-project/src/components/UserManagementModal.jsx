// src/components/UserManagementModal.js
import React, { useState } from "react";

const UserManagementModal = ({ isOpen, onClose, users, setUsers }) => {
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "user" });

  if (!isOpen) return null;

  // Approve user
  const handleApprove = (id) => {
    const updated = users.map((u) =>
      u.id === id ? { ...u, status: "approved" } : u
    );
    setUsers(updated);
  };

  // Delete (reject) user
  const handleDelete = (id) => {
    setUsers(users.filter((u) => u.id !== id));
  };

  // Add new user (pending by default)
  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;

    const id = Date.now().toString();
    const newEntry = { id, ...newUser, status: "pending" };
    setUsers([...users, newEntry]);
    setNewUser({ name: "", email: "", role: "user" });
  };

  const approvedUsers = users.filter((u) => u.status === "approved");
  const pendingUsers = users.filter((u) => u.status === "pending");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[550px] max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">👤 User Management</h2>

        {/* Pending Users */}
        <h3 className="font-semibold mb-2 text-yellow-700">⏳ Pending Users</h3>
        {pendingUsers.length > 0 ? (
          <div className="space-y-2 mb-4">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex justify-between items-center border-b py-1"
              >
                <span>
                  {u.name} — {u.email}
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => handleApprove(u.id)}
                    className="text-green-600 hover:underline"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 mb-4">No pending users.</p>
        )}

        {/* Approved Users */}
        <h3 className="font-semibold mb-2 text-green-700">✅ Approved Users</h3>
        {approvedUsers.length > 0 ? (
          <div className="space-y-2 mb-4">
            {approvedUsers.map((u) => (
              <div
                key={u.id}
                className="flex justify-between items-center border-b py-1"
              >
                <span>
                  {u.name} — {u.email} ({u.role})
                </span>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 mb-4">No approved users yet.</p>
        )}

        {/* Add New User */}
        <h3 className="font-semibold mb-2">➕ Add New User</h3>
        <input
          type="text"
          placeholder="Full Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          className="border px-2 py-1 rounded w-full mb-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          className="border px-2 py-1 rounded w-full mb-2"
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          className="border px-2 py-1 rounded w-full mb-4"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="border px-4 py-2 rounded hover:bg-gray-100"
          >
            Close
          </button>
          <button
            onClick={handleAddUser}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add User
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagementModal;
