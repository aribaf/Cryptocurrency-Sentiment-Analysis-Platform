// src/components/pages/Account.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import {
  updateProfile,
  changePassword,
  deleteAccount,
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
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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
    // Guest user view - show sign in/sign up options
    return (
      <div className="min-h-screen bg-cp-bg p-4 sm:p-6 text-white">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-cp-neon">
              Welcome to CryptoSent
            </h2>
            <p className="text-sm sm:text-base text-gray-400">
              Sign in to access your personalized dashboard and track crypto sentiment in real-time
            </p>
          </div>

          {/* Cards Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* Sign In Card */}
            <div className="bg-cp-panel border border-white/10 rounded-xl p-6 hover:border-cp-neon/40 transition-all">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-cp-neon/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-cp-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Already have an account?</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Sign in to access your dashboard and saved preferences
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-3 px-4 rounded-lg bg-cp-neon text-black font-semibold hover:bg-cp-neon/90 transition-colors shadow-[0_0_16px_rgba(217,255,47,0.4)]"
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* Sign Up Card */}
            <div className="bg-cp-panel border border-white/10 rounded-xl p-6 hover:border-cp-neon/40 transition-all">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-cp-purple/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-cp-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">New to CryptoSent?</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Create an account to unlock all features and insights
                </p>
                <button
                  onClick={() => navigate("/register")}
                  className="w-full py-3 px-4 rounded-lg bg-cp-purple text-white font-semibold hover:bg-cp-purple/90 transition-colors shadow-[0_0_16px_rgba(139,92,246,0.4)]"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-cp-panel border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-center text-white">
              What you'll get with an account:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cp-neon/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-cp-neon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm">Real-time Sentiment Analysis</h4>
                  <p className="text-xs text-gray-400">Track crypto sentiment across Twitter, Reddit, and news</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cp-neon/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-cp-neon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm">Custom Alerts & Notifications</h4>
                  <p className="text-xs text-gray-400">Get notified about significant market movements</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cp-neon/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-cp-neon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm">Advanced Analytics</h4>
                  <p className="text-xs text-gray-400">Deep dive into trends and predictions</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cp-neon/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-cp-neon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm">Personalized Dashboard</h4>
                  <p className="text-xs text-gray-400">Customize your crypto insights experience</p>
                </div>
              </div>
            </div>
          </div>

          {/* Continue as Guest Option */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-gray-400 hover:text-cp-neon transition-colors underline"
            >
              Continue browsing as guest
            </button>
          </div>
        </div>
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
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      setMessage("Please type DELETE to confirm account deletion");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await deleteAccount({ email: user.email });
      if (res.ok) {
        setMessage("Account deleted successfully. Redirecting...");
        setTimeout(() => {
          localStorage.removeItem("access_token");
          navigate("/login");
        }, 2000);
      } else {
        setMessage(res.message || res.detail || "Failed to delete account");
      }
    } catch (err) {
      setMessage("Error deleting account: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-cp-bg p-4 sm:p-6 text-white">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-cp-neon">
            Account Settings
          </h2>
          <p className="text-sm text-gray-400">
            Manage your account preferences and security settings
          </p>
        </div>

        {message && (
          <div className="mb-4 p-4 rounded-lg bg-cp-neon/10 border border-cp-neon/30 text-sm text-gray-200">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-cp-panel border border-white/10 rounded-xl p-6 sticky top-6">
              <div className="text-center mb-4">
                <div className="w-20 h-20 mx-auto mb-3 bg-cp-neon rounded-full flex items-center justify-center text-black text-2xl font-bold">
                  {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {user.username || "User"}
                </h3>
                <p className="text-sm text-gray-400 break-all mt-1">{user.email}</p>
              </div>

              <div className="border-t border-white/10 pt-4 mt-4 space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Account Type</span>
                  <span className="text-white font-medium px-2 py-1 bg-cp-bg rounded text-xs">
                    {authProvider === "google" ? "Google" : "Standard"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status</span>
                  <span className="text-cp-neon font-medium">● Active</span>
                </div>
              </div>

              <button
                className="mt-6 w-full py-2.5 px-4 rounded-lg bg-cp-bg border border-white/15 text-gray-200 text-sm hover:border-cp-neon/60 hover:text-white transition-colors"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Settings Card */}
            <div className="bg-cp-panel border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cp-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Current Email</label>
                  <input
                    value={user.email}
                    disabled
                    className="w-full p-3 bg-cp-bg border border-white/15 rounded-lg text-gray-300 cursor-not-allowed"
                  />
                </div>

                {authProvider === "google" ? (
                  <div className="p-4 rounded-lg bg-cp-purple/10 border border-cp-purple/30">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-cp-purple flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-white mb-1">Google Account</p>
                        <p className="text-xs text-gray-400">
                          Your email is managed by Google and cannot be changed here. Please update it in your Google account settings.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">New Email Address</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter new email address"
                        className="w-full p-3 bg-cp-bg border border-white/15 rounded-lg text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon"
                      />
                    </div>

                    <button
                      disabled={saving}
                      onClick={handleUpdateEmail}
                      className="w-full py-3 rounded-lg bg-cp-neon text-black font-semibold hover:bg-cp-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(217,255,47,0.4)]"
                    >
                      {saving ? "Updating..." : "Update Email"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Password Settings Card */}
            {authProvider !== "google" && (
              <div className="bg-cp-panel border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-cp-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Change Password
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full p-3 bg-cp-bg border border-white/15 rounded-lg text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Enter new password (min. 8 characters)"
                      className="w-full p-3 bg-cp-bg border border-white/15 rounded-lg text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use a strong password with letters, numbers, and symbols</p>
                  </div>

                  <button
                    disabled={saving}
                    onClick={handleUpdatePassword}
                    className="w-full py-3 rounded-lg bg-cp-neon text-black font-semibold hover:bg-cp-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(217,255,47,0.4)]"
                  >
                    {saving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            )}

            {/* Account Info Card */}
            <div className="bg-cp-panel border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cp-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Account Information
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-cp-bg rounded-lg">
                  <div>
                    <p className="text-sm text-gray-400">Username</p>
                    <p className="text-white font-medium">{user.username || "Not set"}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-cp-bg rounded-lg">
                  <div>
                    <p className="text-sm text-gray-400">Email Address</p>
                    <p className="text-white font-medium break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-cp-bg rounded-lg">
                  <div>
                    <p className="text-sm text-gray-400">Authentication Method</p>
                    <p className="text-white font-medium">{authProvider === "google" ? "Google OAuth" : "Email & Password"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-cp-panel border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cp-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="p-4 bg-cp-bg rounded-lg border border-white/10 hover:border-cp-neon/60 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cp-neon/10 rounded-lg flex items-center justify-center group-hover:bg-cp-neon/20 transition-colors">
                      <svg className="w-5 h-5 text-cp-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Dashboard</p>
                      <p className="text-xs text-gray-400">View analytics</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/analysis")}
                  className="p-4 bg-cp-bg rounded-lg border border-white/10 hover:border-cp-neon/60 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cp-neon/10 rounded-lg flex items-center justify-center group-hover:bg-cp-neon/20 transition-colors">
                      <svg className="w-5 h-5 text-cp-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Sentiment</p>
                      <p className="text-xs text-gray-400">Analyze trends</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Danger Zone - Delete Account */}
            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2 text-red-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Danger Zone
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Once you delete your account, there is no going back. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:border-red-500 transition-all text-sm font-medium"
                >
                  Delete My Account
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
                    <p className="text-sm text-red-300 mb-3 font-medium">
                      ⚠️ This will permanently delete your account and all associated data.
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                      Type <span className="font-mono font-bold text-white">DELETE</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full p-3 bg-cp-bg border border-red-500/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={saving || deleteConfirmText !== "DELETE"}
                      onClick={handleDeleteAccount}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {saving ? "Deleting..." : "Permanently Delete Account"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
