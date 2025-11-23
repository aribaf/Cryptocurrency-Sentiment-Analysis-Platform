// src/components/EmotionBreakdown.jsx
import React from "react";

export default function EmotionBreakdown({ emotions }) {
  if (!emotions || Object.keys(emotions).length === 0) return null;

  const entries = Object.entries(emotions).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-cp-panel/90 rounded-xl p-4 sm:p-5 shadow-md border border-white/5">
      <h4 className="text-sm font-semibold mb-3 text-white">
        Emotion Breakdown
      </h4>
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1 text-gray-300">
              <span className="capitalize">
                {key.replace("_", " ")}
              </span>
              <span className="text-cp-neon">
                {(value * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-cp-bg/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-cp-neon"
                style={{ width: `${Math.min(100, value * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-gray-500">
        Shows how emotions like joy, fear, and anger contribute to the overall sentiment.
      </p>
    </div>
  );
}
