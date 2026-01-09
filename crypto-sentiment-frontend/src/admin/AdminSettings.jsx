// src/admin/AdminSettings.jsx
import React, { useState } from "react";
import { 
  CogIcon, 
  BellIcon, 
  KeyIcon, 
  ShieldCheckIcon,
  ServerIcon,
  EnvelopeIcon
} from "@heroicons/react/24/outline";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState({
    siteName: "Crypto Sentiment Platform",
    apiUrl: import.meta.env.VITE_API_BASE || "",
    maxExportSize: 100000,
    sessionTimeout: 30,
    enableNotifications: true,
    enableEmailAlerts: false,
    alertThreshold: 0.8,
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxLoginAttempts: 5,
    tokenExpiry: 24,
  });

  const handleSave = (section) => {
    console.log(`Saving ${section} settings:`, settings);
    // TODO: Add API call to save settings
    alert(`${section} settings saved!`);
  };

  const tabs = [
    { id: "general", label: "General", icon: CogIcon },
    { id: "notifications", label: "Notifications", icon: BellIcon },
    { id: "security", label: "Security", icon: ShieldCheckIcon },
    { id: "api", label: "API", icon: ServerIcon },
  ];

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-bold">Admin Settings</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
              activeTab === tab.id
                ? "border-cp-neon text-cp-neon"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="bg-cp-panel p-6 rounded-xl border border-white/10 space-y-6">
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Site Name
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Base URL
              </label>
              <input
                type="text"
                value={settings.apiUrl}
                onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Export Size (rows)
              </label>
              <input
                type="number"
                value={settings.maxExportSize}
                onChange={(e) => setSettings({ ...settings, maxExportSize: parseInt(e.target.value) })}
                className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="maintenance"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-4 h-4 rounded border-white/10 bg-cp-bg text-cp-neon focus:ring-cp-neon focus:ring-offset-0"
              />
              <label htmlFor="maintenance" className="text-sm text-gray-300">
                Enable Maintenance Mode
              </label>
            </div>
          </div>

          <button
            onClick={() => handleSave("general")}
            className="px-6 py-2 bg-cp-neon text-black font-semibold rounded-lg hover:bg-cp-neon/90 transition"
          >
            Save General Settings
          </button>
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === "notifications" && (
        <div className="bg-cp-panel p-6 rounded-xl border border-white/10 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notifications"
                checked={settings.enableNotifications}
                onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                className="w-4 h-4 rounded border-white/10 bg-cp-bg text-cp-neon focus:ring-cp-neon focus:ring-offset-0"
              />
              <label htmlFor="notifications" className="text-sm text-gray-300">
                Enable In-App Notifications
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="email-alerts"
                checked={settings.enableEmailAlerts}
                onChange={(e) => setSettings({ ...settings, enableEmailAlerts: e.target.checked })}
                className="w-4 h-4 rounded border-white/10 bg-cp-bg text-cp-neon focus:ring-cp-neon focus:ring-offset-0"
              />
              <label htmlFor="email-alerts" className="text-sm text-gray-300">
                Enable Email Alerts
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Alert Threshold (0-1)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={settings.alertThreshold}
                onChange={(e) => setSettings({ ...settings, alertThreshold: parseFloat(e.target.value) })}
                className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
              />
              <p className="text-xs text-gray-400 mt-1">
                Alert when sentiment score exceeds this threshold
              </p>
            </div>
          </div>

          <button
            onClick={() => handleSave("notifications")}
            className="px-6 py-2 bg-cp-neon text-black font-semibold rounded-lg hover:bg-cp-neon/90 transition"
          >
            Save Notification Settings
          </button>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === "security" && (
        <div className="bg-cp-panel p-6 rounded-xl border border-white/10 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Security Settings</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allow-registration"
                checked={settings.allowRegistration}
                onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                className="w-4 h-4 rounded border-white/10 bg-cp-bg text-cp-neon focus:ring-cp-neon focus:ring-offset-0"
              />
              <label htmlFor="allow-registration" className="text-sm text-gray-300">
                Allow New User Registration
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="email-verification"
                checked={settings.requireEmailVerification}
                onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                className="w-4 h-4 rounded border-white/10 bg-cp-bg text-cp-neon focus:ring-cp-neon focus:ring-offset-0"
              />
              <label htmlFor="email-verification" className="text-sm text-gray-300">
                Require Email Verification
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Expiry (hours)
              </label>
              <input
                type="number"
                value={settings.tokenExpiry}
                onChange={(e) => setSettings({ ...settings, tokenExpiry: parseInt(e.target.value) })}
                className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
              />
            </div>
          </div>

          <button
            onClick={() => handleSave("security")}
            className="px-6 py-2 bg-cp-neon text-black font-semibold rounded-lg hover:bg-cp-neon/90 transition"
          >
            Save Security Settings
          </button>
        </div>
      )}

      {/* API Settings */}
      {activeTab === "api" && (
        <div className="bg-cp-panel p-6 rounded-xl border border-white/10 space-y-6">
          <h2 className="text-xl font-semibold mb-4">API Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Rate Limit (requests/minute)
              </label>
              <input
                type="number"
                defaultValue={60}
                className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value="••••••••••••••••"
                  readOnly
                  className="flex-1 bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                />
                <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">
                  Regenerate
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/webhook"
                className="w-full bg-cp-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cp-neon"
              />
            </div>
          </div>

          <button
            onClick={() => handleSave("api")}
            className="px-6 py-2 bg-cp-neon text-black font-semibold rounded-lg hover:bg-cp-neon/90 transition"
          >
            Save API Settings
          </button>
        </div>
      )}
    </div>
  );
}
