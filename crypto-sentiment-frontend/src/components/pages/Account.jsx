// /mnt/data/Account.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  reactivateAccount,
  deleteAccount,
} from "../../api/account";
// <-- helper you saved earlier

export default function Account() {
  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : ""
  );
  const [newEmail, setNewEmail] = useState("");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");

  // Helper to safely read env & fallbacks (Vite-compatible)
  function getDisplayEmail(fallback = "") {
    return email || (typeof window !== "undefined" && localStorage.getItem("userEmail")) || fallback;
  }

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      setMessage(null);
      setLoading(true);

      // if no token, redirect to login after showing message
      if (!token) {
        setMessage("Not signed in. Redirecting to login...");
        setLoading(false);
        setTimeout(() => navigate("/login"), 800);
        return;
      }

      const resp = await getProfile();
      if (!mounted) return;

      if (!resp.ok) {
        // show a helpful message but allow fallback to localStorage email
        console.warn("/api/me failed", resp);
        setMessage(`Could not verify token: ${resp.status} ${resp.message || ""}`);
        setLoading(false);
        return;
      }

      // prefer resp.data.email if present
      const remote = resp.data || {};
      const remoteEmail = remote.email || remote.sub || null;
      if (remoteEmail && typeof remoteEmail === "string" && remoteEmail.includes("@")) {
        setEmail(remoteEmail);
        localStorage.setItem("userEmail", remoteEmail);
      }

      setLoading(false);
    }

    loadProfile();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update email using helper (expects { email, new_email })
  async function handleUpdateEmail() {
    setMessage(null);
    if (!newEmail) {
      setMessage("Enter a new email to update.");
      return;
    }
    if (!email) {
      setMessage("Current email unknown. You must be signed in.");
      return;
    }
    setSaving(true);
    const resp = await updateProfile({ email, new_email: newEmail });
    if (!resp.ok) {
      setMessage(`❌ ${resp.detail || resp.message || "Update failed"}`);
    } else {
      const updatedEmail = (resp.data && resp.data.email) || newEmail;
      setEmail(updatedEmail);
      localStorage.setItem("userEmail", updatedEmail);
      setNewEmail("");
      setMessage(resp.message || "Email updated successfully.");
    }
    setSaving(false);
  }

  // Update password using helper (expects { email, current_password, new_password })
  async function handleUpdatePassword() {
    setMessage(null);
    if (!currentPass || !newPass) {
      setMessage("Fill both current and new password fields.");
      return;
    }
    if (!email) {
      setMessage("Current email unknown. Cannot update password.");
      return;
    }
    setSaving(true);
    const resp = await changePassword({ email, current_password: currentPass, new_password: newPass });
    if (!resp.ok) {
      setMessage(`❌ ${resp.detail || resp.message || "Password update failed"}`);
    } else {
      setCurrentPass("");
      setNewPass("");
      setMessage(resp.message || "Password updated successfully.");
    }
    setSaving(false);
  }

  const displayEmail = getDisplayEmail("unknown");

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="max-w-lg mx-auto bg-gray-900/90 p-6 rounded-lg border border-gray-800">
        <h2 className="text-2xl font-bold mb-4 text-red-600">@CRYPTOSENT — Account</h2>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-300">
            Signed in as <strong className="text-white">{displayEmail}</strong>
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 rounded-md bg-gray-800 text-sm"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("token");
                }
                navigate("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-300">Loading profile…</div>
        ) : (
          <>
            {message && (
              <div className="mb-4 p-3 rounded bg-red-900/30 text-sm" role="alert">
                {message}
              </div>
            )}

            {/* Email */}
            <div className="mb-6">
              <label className="block text-xs text-gray-400 mb-1">Current Email</label>
              <input
                value={displayEmail}
                disabled
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded mb-3"
              />

              <label className="block text-xs text-gray-400 mb-1">New Email</label>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new-email@example.com"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded"
              />

              <button
                disabled={saving}
                onClick={handleUpdateEmail}
                className="mt-3 w-full py-2 rounded bg-red-600 hover:bg-red-500"
              >
                {saving ? "Saving…" : "Update Email"}
              </button>
            </div>

            {/* Password */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Change Password</h3>

              <label className="block text-xs text-gray-400 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded mb-3"
              />

              <label className="block text-xs text-gray-400 mb-1">New Password</label>
              <input
                type="password"
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
          </>
        )}
      </div>
    </div>
  );
}
