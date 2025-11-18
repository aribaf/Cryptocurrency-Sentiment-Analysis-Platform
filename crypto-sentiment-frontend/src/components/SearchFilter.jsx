// src/components/SearchFilter.jsx
import React, { useState } from "react";

export default function SearchFilter({ onApply }) {
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("30");
  const [source, setSource] = useState("all");

  const apply = () => {
    onApply && onApply({ q: q.trim(), period: Number(period), source });
  };

  return (
    <div className="bg-cp-panel/90 rounded-xl p-6 shadow-md border border-white/5">
      <h4 className="text-lg font-semibold mb-1 text-white">Search</h4>
      <p className="text-xs text-gray-400 mb-5">
        Filter sentiment by coin, time period, and data source.
      </p>

      <div className="space-y-4">
        {/* Crypto search input */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1 uppercase tracking-wide">
            Cryptocurrency
          </label>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              placeholder="Bitcoin, Ethereum, etc."
              className="
                flex-1 px-3 py-2
                rounded-md
                text-sm
                bg-cp-bg/80
                border border-white/10
                text-gray-100
                placeholder:text-gray-500
                focus:outline-none
                focus:border-cp-neon
                focus:ring-1
                focus:ring-cp-neon
              "
            />
            <button
              type="button"
              onClick={apply}
              className="
                px-4 py-2
                rounded-md
                text-sm font-medium
                bg-cp-neon text-black
                hover:bg-cp-neon/90
                transition
                shadow-[0_0_18px_rgba(217,255,47,0.35)]
              "
            >
              Search
            </button>
          </div>
        </div>

        {/* Time period */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1 uppercase tracking-wide">
            Time Period
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="
              w-full px-3 py-2
              rounded-md
              text-sm
              bg-cp-bg/80
              border border-white/10
              text-gray-100
              focus:outline-none
              focus:border-cp-neon
              focus:ring-1
              focus:ring-cp-neon
            "
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {/* Data source */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1 uppercase tracking-wide">
            Data Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="
              w-full px-3 py-2
              rounded-md
              text-sm
              bg-cp-bg/80
              border border-white/10
              text-gray-100
              focus:outline-none
              focus:border-cp-neon
              focus:ring-1
              focus:ring-cp-neon
            "
          >
            <option value="all">All Sources</option>
            <option value="reddit">Reddit</option>
            <option value="twitter">Twitter</option>
            <option value="news">News</option>
          </select>
        </div>

        <button
          type="button"
          onClick={apply}
          className="
            w-full mt-3 py-2
            rounded-md
            text-sm font-semibold
            bg-cp-neon text-black
            hover:bg-cp-neon/90
            transition
            shadow-[0_0_20px_rgba(217,255,47,0.35)]
          "
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
