// src/components/trend/SearchPanel.jsx
import React, { useState } from "react";

export default function SearchPanel() {
  const [coin, setCoin] = useState("");
  const [timeframe, setTimeframe] = useState("short");
  const [threshold, setThreshold] = useState(0);

  function applyFilters() {
    alert("Client-side filters applied. For server filtering implement query params.");
  }

  return (
    <div className="bg-surface p-4 rounded-lg">
      <div className="text-sm font-medium mb-2">Search</div>
      <label className="text-xs text-gray-400">Cryptocurrency</label>
      <input value={coin} onChange={(e)=>setCoin(e.target.value)} placeholder="eg. Bitcoin, ETH" className="w-full p-2 rounded bg-black/20 mb-3"/>

      <label className="text-xs text-gray-400">Timeframe</label>
      <select value={timeframe} onChange={(e)=>setTimeframe(e.target.value)} className="w-full p-2 rounded bg-black/20 mb-3">
        <option value="short">Short-term (24h)</option>
        <option value="mid">Mid-term (7d)</option>
        <option value="long">Long-term (30d)</option>
      </select>

      <label className="text-xs text-gray-400">Confidence Threshold</label>
      <input type="range" min="0" max="100" value={threshold} onChange={(e)=>setThreshold(e.target.value)} className="w-full mb-2"/>
      <div className="text-xs mb-3 text-gray-300">{threshold}% or higher</div>

      <button onClick={applyFilters} className="w-full py-2 bg-blue-600 rounded text-white">Apply Filters</button>
    </div>
  );
}
