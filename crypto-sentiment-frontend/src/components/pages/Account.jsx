import React, { useEffect, useState } from "react";
import {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  reactivateAccount,
  deleteAccount,
} from "../../api/account";

export default function Account() {
  const [activeTab, setActiveTab] = useState("profile");

  // Load user info from localStorage (after login)
  const [userId] = useState(localStorage.getItem("userId") || null);
  const [email] = useState(localStorage.getItem("userEmail") || null);

  // Identifier for API calls (user_id preferred, else email)
  const identifier = userId ? { user_id: userId } : { email };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-6 border border-gray-200">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Account</h2>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 space-x-6">
          {["profile", "password", "deactivate"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 capitalize text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && <ProfileTab identifier={identifier} />}
        {activeTab === "password" && <PasswordTab identifier={identifier} />}
        {activeTab === "deactivate" && <DeactivateTab identifier={identifier} />}
      </div>
    </div>
  );
}

// =======================================================
// PROFILE TAB (MODIFIED)
// =======================================================
function ProfileTab({ identifier }) {
  const [loading, setLoading] = useState(true);
  // 1. REMOVED 'name' from state initialization
  const [form, setForm] = useState({ username: "", email: "" });
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await getProfile(identifier);
      if (res?.data) {
        setForm({
          // 2. REMOVED 'name' from state update after fetch
          username: res.data.username || "",
          email: res.data.email || "",
        });
      }
      setLoading(false);
    })();
  }, [identifier]); // Added identifier to dependencies

  const handleUpdate = async () => {
    setMessage("");
    // 3. REMOVED 'name' from the body payload
    const body = { ...identifier, username: form.username }; 
    if (newEmail && newEmail !== form.email) body.new_email = newEmail;

    const res = await updateProfile(body);
    if (res?.data) {
      setForm({
        // 4. REMOVED 'name' from state update after successful PUT
        username: res.data.username,
        email: res.data.email,
      });
      if (res.data.email) localStorage.setItem("userEmail", res.data.email);
      setMessage("✅ Profile updated successfully!");
    } else if (res?.detail?.message) {
      setMessage("⚠️ " + res.detail.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="space-y-4">
        {/* 5. REMOVED the InputField for Name */}
        {/*
        <InputField
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        */}
        <InputField
          label="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <InputField label="Current Email" value={form.email} disabled />
        <InputField
          label="New Email (optional)"
          value={newEmail}
          placeholder="Enter new email"
          onChange={(e) => setNewEmail(e.target.value)}
        />
      </div>

      <button
        onClick={handleUpdate}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Update Profile
      </button>
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
    </div>
  );
}

// =======================================================
// PASSWORD TAB
// ... (Remains Unchanged) ...
// =======================================================
function PasswordTab({ identifier }) {
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [message, setMessage] = useState("");

  const handleUpdate = async () => {
    setMessage("");
    if (form.newPass !== form.confirm) return alert("Passwords don't match!");

    const res = await changePassword({
      ...identifier,
      current_password: form.current,
      new_password: form.newPass,
    });

    if (res?.message) {
      setForm({ current: "", newPass: "", confirm: "" });
      setMessage("✅ Password updated successfully!");
    } else if (res?.detail?.message) {
      setMessage("⚠️ " + res.detail.message);
    }
  };

  return (
    <div className="space-y-4">
      <InputField
        label="Current Password"
        type="password"
        value={form.current}
        onChange={(e) => setForm({ ...form, current: e.target.value })}
      />
      <InputField
        label="New Password"
        type="password"
        value={form.newPass}
        onChange={(e) => setForm({ ...form, newPass: e.target.value })}
      />
      <InputField
        label="Confirm New Password"
        type="password"
        value={form.confirm}
        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
      />

      <button
        onClick={handleUpdate}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Update Password
      </button>
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
    </div>
  );
}

// =======================================================
// DEACTIVATE TAB
// ... (Remains Unchanged) ...
// =======================================================
function DeactivateTab({ identifier }) {
  const [message, setMessage] = useState("");

  const handleDeactivate = async () => {
    const res = await deactivateAccount(identifier);
    setMessage(res?.message || "Account deactivated.");
  };

  const handleReactivate = async () => {
    const res = await reactivateAccount(identifier);
    setMessage(res?.message || "Account reactivated.");
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    const res = await deleteAccount({ ...identifier, confirm: true });
    setMessage(res?.message || "Account deleted.");
    // Optionally log out or redirect user here
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 p-3 rounded-md">
        ⚠️ <strong>Warning:</strong> Deactivation is temporary. Deletion is permanent.
      </div>

      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
        <ActionButton label="Deactivate Account" onClick={handleDeactivate} color="gray" />
        <ActionButton label="Reactivate" onClick={handleReactivate} color="blue" />
        <ActionButton label="Delete Account" onClick={handleDelete} color="red" />
      </div>
      {message && <p className="text-sm text-green-700">{message}</p>}
    </div>
  );
}

// =======================================================
// HELPER COMPONENTS
// ... (Remains Unchanged) ...
// =======================================================
function InputField({ label, value, onChange, type = "text", disabled, placeholder }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={onChange}
        className={`w-full border ${
          disabled ? "bg-gray-100 border-gray-200" : "border-gray-300"
        } rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500`}
      />
    </div>
  );
}

function ActionButton({ label, onClick, color }) {
  const colors = {
    gray: "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200",
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    red: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      onClick={onClick}
      className={`${colors[color]} px-4 py-2 rounded-lg transition`}
    >
      {label}
    </button>
  );
}