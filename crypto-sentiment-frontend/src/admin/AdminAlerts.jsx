// src/admin/AdminAlerts.jsx
import React from "react";

/**
 * lastScrape example:
 * {
 *   twitter: "2026-01-06T17:56:41Z",
 *   reddit: "2026-01-07T12:06:25Z",
 *   news: "2026-01-07T10:27:40Z"
 * }
 */

export default function AdminAlerts({ lastScrape }) {
  const now = Date.now();

  // minutes after which data is considered stale
  const STALE_THRESHOLD_MINUTES = 60;

  function minutesSince(date) {
    if (!date) return Infinity;
    return (now - new Date(date).getTime()) / 60000;
  }

  const alerts = [];

  if (minutesSince(lastScrape?.twitter) > STALE_THRESHOLD_MINUTES) {
    alerts.push("Twitter scraper has not run in the last hour.");
  }

  if (minutesSince(lastScrape?.reddit) > STALE_THRESHOLD_MINUTES) {
    alerts.push("Reddit scraper has not run in the last hour.");
  }

  if (minutesSince(lastScrape?.news) > STALE_THRESHOLD_MINUTES) {
    alerts.push("News scraper has not run in the last hour.");
  }

  // ✅ If everything is healthy, render nothing
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-900/20 border border-red-500 rounded-xl p-5">
      <h3 className="text-red-400 font-semibold mb-2">
        🚨 System Alerts
      </h3>

      <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
        {alerts.map((alert, index) => (
          <li key={index}>{alert}</li>
        ))}
      </ul>
    </div>
  );
}
