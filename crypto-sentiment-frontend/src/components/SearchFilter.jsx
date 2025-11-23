// src/components/SearchFilter.jsx
import React, { useState, useEffect } from "react";

export default function SearchFilter({
  onApply,
  initialCoin = "",
  initialPeriod = 30,
  initialSource = "all",
}) {
  const [q, setQ] = useState(initialCoin);
  const [period, setPeriod] = useState(String(initialPeriod));
  const [source, setSource] = useState(initialSource);

  // keep local state in sync if parent changes coin (optional but nice)
  useEffect(() => {
    setQ(initialCoin);
  }, [initialCoin]);

  const apply = () => {
    const payload = {
      q: q.trim(),
      period: Number(period),
      source,
    };
    onApply && onApply(payload);
  };

  const reset = () => {
    setQ(initialCoin || "");
    setPeriod(String(initialPeriod || 30));
    setSource(initialSource || "all");
    onApply &&
      onApply({
        q: initialCoin || "",
        period: Number(initialPeriod || 30),
        source: initialSource || "all",
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      apply();
    }
  };

  const isModified =
    q.trim() !== (initialCoin || "") ||
    Number(period) !== Number(initialPeriod || 30) ||
    source !== (initialSource || "all");

  return (
    <div className="bg-cp-panel/90 rounded-xl p-6 shadow-md border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-lg font-semibold text-white">Search</h4>
        {isModified && (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] text-cp-neon hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Filter sentiment by coin, time period, and data source.
      </p>

      {/* Active filter summary */}
      <div className="flex flex-wrap gap-2 mb-4 text-[11px]">
        {q.trim() && (
          <span className="px-2 py-1 rounded-full bg-cp-bg/80 border border-white/10 text-gray-200">
            Coin: <span className="text-cp-neon">{q.trim()}</span>
          </span>
        )}
        <span className="px-2 py-1 rounded-full bg-cp-bg/80 border border-white/10 text-gray-200">
          Period:{" "}
          <span className="text-cp-neon">
            {period === "7"
              ? "Last 7 days"
              : period === "90"
              ? "Last 90 days"
              : "Last 30 days"}
          </span>
        </span>
        <span className="px-2 py-1 rounded-full bg-cp-bg/80 border border-white/10 text-gray-200">
          Source:{" "}
          <span className="text-cp-neon">
            {source === "all"
              ? "All"
              : source.charAt(0).toUpperCase() + source.slice(1)}
          </span>
        </span>
      </div>

      <div className="space-y-4">
        {/* Crypto search input */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1 uppercase tracking-wide">
            Cryptocurrency
          </label>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.value ?? e.target.value)}
              onKeyDown={handleKeyDown}
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
          disabled={!isModified}
          className={`
            w-full mt-3 py-2
            rounded-md
            text-sm font-semibold
            transition
            shadow-[0_0_20px_rgba(217,255,47,0.35)]
            ${
              isModified
                ? "bg-cp-neon text-black hover:bg-cp-neon/90"
                : "bg-gray-700 text-gray-400 cursor-not-allowed shadow-none"
            }
          `}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
