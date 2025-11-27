// src/components/trend/Sidebar.jsx
import React, { useState } from "react";

function formatPercent(value) {
  if (value === null || value === undefined) return "—";

  // Handle both 0.8571 and 85.71
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";

  const pct = num <= 1.5 ? num * 100 : num; // assume 0–1 range if small
  return `${pct.toFixed(2)}%`;
}

export default function Sidebar({
  onSearch,
  onTimeframe,
  timeframe,
  onExport,
  stats = {},
  activeCoin,
  historyLength = 0,
}) {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    onSearch && onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    onSearch && onSearch("");
  };

  const handleExport = () => {
    onExport && onExport();
  };

  const overallLabel = formatPercent(stats.overall);

  return (
    <aside className="w-full lg:w-80 space-y-4">
      {/* Overall Accuracy card */}
      <div className="bg-black/40 rounded-xl border border-white/10 px-4 py-3">
        <div className="text-[11px] tracking-wide text-gray-400 uppercase mb-1">
          Overall Accuracy
        </div>
        <div className="text-2xl font-semibold text-white">
          {overallLabel}
        </div>
      </div>

      {/* Search */}
      <div className="bg-black/40 rounded-xl border border-white/10 px-4 py-3">
        <div className="text-[11px] tracking-wide text-gray-400 uppercase mb-2">
          Search Cryptocurrency
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              onSearch && onSearch(v); // live search
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="BTC, Ethereum, Solana"
            className="flex-1 bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-cp-neon"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="px-3 py-2 rounded-lg bg-cp-neon text-black text-xs sm:text-sm font-semibold hover:brightness-110 transition"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded-lg bg-gray-700 text-white text-xs sm:text-sm hover:bg-gray-600 transition"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Timeframe selector */}
      <div className="bg-black/40 rounded-xl border border-white/10 px-4 py-3">
        <div className="text-[11px] tracking-wide text-gray-400 uppercase mb-2">
          Prediction Timeframe
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "short", label: "24H" },
            { key: "mid", label: "7D" },
            { key: "long", label: "30D" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onTimeframe && onTimeframe(opt.key)}
              className={`py-2 rounded-lg text-xs font-semibold border transition ${
                timeframe === opt.key
                  ? "bg-cp-neon text-black border-cp-neon"
                  : "bg-black/60 text-gray-300 border-white/10 hover:border-cp-neon/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="bg-black/40 rounded-xl border border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={handleExport}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white transition"
        >
          Export Predictions CSV
        </button>
      </div>

      {/* History summary */}
      <div className="bg-black/40 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300">
        {activeCoin ? (
          <>
            <div className="text-xs text-gray-400 mb-1">History for</div>
            <div className="text-lg font-semibold text-white">
              {activeCoin}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Showing last {historyLength} points
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-400">
            Select a coin&apos;s &quot;View history&quot; to inspect its
            recent predictions.
          </div>
        )}
      </div>
    </aside>
  );
}
