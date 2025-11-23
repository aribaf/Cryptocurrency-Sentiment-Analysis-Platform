// src/components/AccuracyCards.jsx
import React from "react";

function StatCard({ title, value, delta }) {
  return (
    <div className="bg-surface p-4 rounded-lg shadow-sm border border-gray-800">
      <div className="text-sm text-gray-400">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {delta !== undefined && (
        <div className={`mt-1 text-sm ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
        </div>
      )}
    </div>
  );
}

export default function AccuracyCards({ stats }) {
  // stats expected: { short: "85%", mid: "78%", long: "72%", overall: "79%" }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
      <StatCard title="Short-term Predictions" value={stats.short ?? "—"} />
      <StatCard title="Mid-term Predictions" value={stats.mid ?? "—"} />
      <StatCard title="Long-term Predictions" value={stats.long ?? "—"} />
      <StatCard title="Overall Accuracy" value={stats.overall ?? "—"} />
    </div>
  );
}
