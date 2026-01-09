// src/admin/AdminUsers.jsx
import React, { useState, useEffect } from "react";
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { getUsers, createUser, updateUser, deleteUser } from "../api/adminUsers";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await getUsers();
    if (res.ok) {
      setUsers(res.data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username || "",
        email: user.email || "",
        password: "",
        role: user.role || "user",
      });
    } else {
      setEditingUser(null);
      setFormData({ username: "", email: "", password: "", role: "user" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ username: "", email: "", password: "", role: "user" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingUser) {
      // Update
      const payload = { ...formData };
      if (!payload.password) delete payload.password; // Don't update password if empty
      const res = await updateUser(editingUser._id || editingUser.id, payload);
      if (res.ok) {
        fetchUsers();
        handleCloseModal();
      } else {
        alert(res.message || "Failed to update user");
      }
    } else {
      // Create
      const res = await createUser(formData);
      if (res.ok) {
        fetchUsers();
        handleCloseModal();
      } else {
        alert(res.message || "Failed to create user");
      }
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const res = await deleteUser(userId);
    if (res.ok) {
      fetchUsers();
    } else {
      alert(res.message || "Failed to delete user");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserGroupIcon className="w-7 h-7" />
          User Management
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-cp-neon text-black font-semibold rounded-lg hover:bg-cp-neon/90 transition"
        >
          <PlusIcon className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="bg-cp-panel p-4 rounded-xl border border-white/10">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by username or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-cp-bg border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cp-neon"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-cp-panel p-4 md:p-6 rounded-xl border border-white/10">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-200">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3 text-left text-gray-400 font-semibold">Username</th>
                  <th className="px-3 py-3 text-left text-gray-400 font-semibold">Email</th>
                  <th className="px-3 py-3 text-left text-gray-400 font-semibold">Role</th>
                  <th className="px-3 py-3 text-left text-gray-400 font-semibold">Created</th>
                  <th className="px-3 py-3 text-center text-gray-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id || user.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-3 py-3 text-gray-300">{user.username || "—"}</td>
                    <td className="px-3 py-3 text-gray-300">{user.email || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.role === "admin"
                            ? "bg-purple-900/40 text-purple-300"
                            : "bg-blue-900/40 text-blue-300"
                        }`}
                      >
                        {user.role || "user"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-400 text-xs">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-1 text-blue-400 hover:bg-white/10 rounded transition"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id || user.id)}
                          className="p-1 text-red-500 hover:bg-white/10 rounded transition"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-cp-panel border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-white/10 rounded transition"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password {editingUser && "(leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cp-neon text-black font-semibold rounded-lg hover:bg-cp-neon/90 transition"
                >
                  {editingUser ? "Update User" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
