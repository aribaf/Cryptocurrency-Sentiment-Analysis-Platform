// src/components/pages/Account.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import {
  updateProfile,
  changePassword,
} from "../../api/account";

export default function Account() {
  const navigate = useNavigate();

  // ✅ AuthContext (ONLY source of user data)
  const { user, loading } = useAuth();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [newEmail, setNewEmail] = useState("");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");

  // Detect auth provider safely
  const authProvider = user?.oauth_provider === "google" ? "google" : "password";

  /* ---------------- LOADING / AUTH STATES ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading profile…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Not logged in
      </div>
    );
  }

  /* ---------------- ACTIONS ---------------- */

  async function handleUpdateEmail() {
    if (authProvider === "google") return;

    setMessage(null);
    if (!newEmail) {
      setMessage("Enter a new email.");
      return;
    }

    setSaving(true);
    const resp = await updateProfile({
      email: user.email,
      new_email: newEmail,
    });

    if (!resp.ok) {
      setMessage(resp.message || "Email update failed.");
    } else {
      setMessage("Email updated successfully. Please re-login.");
      setNewEmail("");
    }

    setSaving(false);
  }

  async function handleUpdatePassword() {
    if (authProvider === "google") return;

    setMessage(null);
    if (!currentPass || !newPass) {
      setMessage("Fill both password fields.");
      return;
    }

    setSaving(true);
    const resp = await changePassword({
      email: user.email,
      current_password: currentPass,
      new_password: newPass,
    });

    if (!resp.ok) {
      setMessage(resp.message || "Password update failed.");
    } else {
      setCurrentPass("");
      setNewPass("");
      setMessage("Password updated successfully.");
    }

    setSaving(false);
  }

  function handleLogout() {
    // Session-based logout (frontend)
    navigate("/login");
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="max-w-lg mx-auto bg-gray-900/90 p-6 rounded-lg border border-gray-800">
        <h2 className="text-2xl font-bold mb-4 text-red-600">
          @CRYPTOSENT — Account
        </h2>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-300">
            {authProvider === "google" ? (
              <>
                Signed in with{" "}
                <strong className="text-white">Google</strong>
              </>
            ) : (
              <>
                Signed in as{" "}
                <strong className="text-white">
                  {user.username} ({user.email})
                </strong>
              </>
            )}
          </div>

          <button
            className="px-3 py-1 rounded-md bg-gray-800 text-sm hover:bg-gray-700"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded bg-red-900/30 text-sm">
            {message}
          </div>
        )}

        {/* ================= EMAIL ================= */}
        <div className="mb-6">
          <label className="block text-xs text-gray-400 mb-1">
            Email
          </label>
          <input
            value={user.email}
            disabled
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded mb-2"
          />

          {authProvider === "google" ? (
            <p className="text-xs text-gray-400">
              Email is managed by Google and cannot be changed.
            </p>
          ) : (
            <>
              <label className="block text-xs text-gray-400 mb-1 mt-3">
                New Email
              </label>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded"
              />

              <button
                disabled={saving}
                onClick={handleUpdateEmail}
                className="mt-3 w-full py-2 rounded bg-red-600 hover:bg-red-500"
              >
                {saving ? "Saving…" : "Update Email"}
              </button>
            </>
          )}
        </div>

        {/* ================= PASSWORD ================= */}
        {authProvider !== "google" && (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              Change Password
            </h3>

            <input
              type="password"
              placeholder="Current password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded mb-3"
            />

            <input
              type="password"
              placeholder="New password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded"
            />

            <button
              disabled={saving}
              onClick={handleUpdatePassword}
              className="mt-3 w-full py-2 rounded bg-red-600 hover:bg-red-500"
            >
              {saving ? "Saving…" : "Update Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
