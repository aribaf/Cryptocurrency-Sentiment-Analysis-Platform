// src/components/trend/Sidebar.jsx
import React, { useState } from "react";

export default function Sidebar({ onSearch, onTimeframe, timeframe, onExport }) {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (onSearch) onSearch(query);
  };

  const handleExport = () => {
    if (onExport) onExport();
  };

  return (
    <div className="space-y-4">

      {/* Search Box */}
      <div className="bg-black/30 p-3 rounded-lg border border-gray-800 backdrop-blur-sm">
        <label className="text-xs text-gray-400">Search</label>

        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch && onSearch(e.target.value); // live search
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. Bitcoin, ETH"
            className="flex-1 bg-transparent border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
          />

          <button
            onClick={() => {
              setQuery("");
              onSearch && onSearch("");
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
          >
            All
          </button>
        </div>
      </div>

      {/* Prediction Timeframe */}
      <div className="bg-black/30 p-3 rounded-lg border border-gray-800 backdrop-blur-sm">
        <label className="text-xs text-gray-400">Prediction Timeframe</label>

        <select
          value={timeframe}
          onChange={(e) => onTimeframe && onTimeframe(e.target.value)}
          className="w-full mt-2 bg-transparent border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-blue-500"
        >
          <option value="short" className="bg-black">Short-term (24h)</option>
          <option value="mid" className="bg-black">Mid-term (7d)</option>
          <option value="long" className="bg-black">Long-term (30d)</option>
        </select>
      </div>

      {/* Export Button */}
      <div className="bg-black/30 p-3 rounded-lg border border-gray-800 backdrop-blur-sm">
        <button
          onClick={handleExport}
          className="w-full bg-green-600 hover:bg-green-700 transition text-white px-3 py-2 rounded font-medium"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
