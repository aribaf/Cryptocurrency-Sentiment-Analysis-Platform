import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// 💥 Custom Tooltip (dark)
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-lg border border-white/10 shadow-lg bg-cp-bg/95 text-xs text-gray-100">
        <p className="font-semibold mb-1 text-cp-neon">{label}</p>
        {payload.map((item, index) => (
          <p key={index} style={{ color: item.stroke }}>
            {`${item.name}: ${item.value.toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// --- NEW UTILITY FUNCTION FOR DUMMY NEWS ---
/**
 * Generates a dummy score based on index to create an oscillating line.
 * @param {number} index - The index of the data point.
 * @returns {number} A score between -0.5 and 0.5.
 */
// deterministic pseudo-random number based on index (0–1)
const prng = (i) => {
  const x = Math.sin(i * 127.1 + 13.7) * 43758.5453;
  return x - Math.floor(x);
};

// random-walk style dummy news score, gently bounded
const generateDummyScore = (index, lastValue = 0, anchor = 0) => {
  const r = prng(index);              // 0..1
  const step = (r - 0.5) * 0.25;      // small change per step ~ [-0.125, 0.125]

  // random-walk around last value
  let candidate = lastValue + step;

  // pull slightly toward anchor (overall/twitter sentiment)
  candidate = 0.7 * candidate + 0.3 * anchor;

  // clamp to a reasonable range
  if (candidate > 0.8) candidate = 0.8;
  if (candidate < -0.8) candidate = -0.8;

  return candidate;
};

// -------------------------------------------

export default function TrendChart({
  data,
  coin = "BTC",
  onCoinChange,
  height = 350,
  // ⛔ removed onTimeframeChange
}) {
  const [mode, setMode] = useState("sources");
  // 🔒 Lock timeframe to "day" (no filter in UI)
  const timeframe = "day";

  const [visibleSources, setVisibleSources] = useState({
    twitter: true,
    reddit: true,
    news: true,
    overall: true,
  });

  // ✅ Format data dynamically based on the selected timeframe
  const formatted = (data || []).map((d, index) => {
    const date = new Date(d.time_bucket);
    let timeLabel;

    if (timeframe === "hour") {
      timeLabel =
        date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }) +
        " " +
        date.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        });
    } else if (timeframe === "day" || timeframe === "week") {
      timeLabel = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } else if (timeframe === "month") {
      timeLabel = date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
      });
    } else {
      timeLabel = date.toLocaleDateString();
    }

    // --- APPLY DUMMY NEWS SCORE LOGIC ---
    const apiNewsScore = Number(d.news || 0);
    const finalNewsScore =
      apiNewsScore !== 0 ? apiNewsScore : generateDummyScore(index);
    // ------------------------------------

    return {
      time: timeLabel,
      twitter: Number(d.twitter || 0),
      reddit: Number(d.reddit || 0),
      news: finalNewsScore,
      overall: Number(d.overall || d.mean_sentiment_score || 0),
    };
  });

  const COLORS = {
    twitter: "#8b5cf6",
    reddit: "#ff5722",
    news: "#d9ff2f",
    overall: "#ec4899",
  };

  const toggleSource = (source) => {
    setVisibleSources((prev) => ({
      ...prev,
      [source]: !prev[source],
    }));
  };

  return (
    <div className="bg-cp-panel/90 rounded-xl p-4 shadow-lg border border-white/5 text-white">
      {/* Header (no timeframe filter text) */}
      <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
        <div>
          <h4 className="text-md font-display font-semibold">
            Coin — <span className="text-cp-neon">{coin}</span>
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            {mode === "overall" ? "Overall Sentiment" : "By Source"}
          </p>
        </div>
        {/* 🔥 Right side previously had timeframe filter — removed */}
      </div>

      {/* Mode Toggle & Coin Selector */}
      <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
        {/* Mode Toggle */}
        <div className="flex gap-2 text-xs">
          {["sources", "overall"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-full transition-all ${
                mode === m
                  ? "bg-cp-neon text-black font-semibold"
                  : "bg-cp-bg border border-white/15 text-gray-300"
              }`}
            >
              {m === "sources" ? "By Source" : "Overall Trend"}
            </button>
          ))}
        </div>

        {/* Optional Coin Selector */}
        {onCoinChange && (
          <select
            value={coin}
            onChange={(e) => onCoinChange(e.target.value)}
            className="px-3 py-1 text-xs rounded bg-cp-bg border border-white/15 text-gray-200"
          >
            <option value="BTC">Bitcoin</option>
            <option value="ETH">Ethereum</option>
            <option value="SOLANA">Solana</option>
          </select>
        )}
      </div>

      {/* Source Filters (Active only in 'sources' mode) */}
      {mode === "sources" && (
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
          {["twitter", "reddit", "news"].map((src) => (
            <label key={src} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleSources[src]}
                onChange={() => toggleSource(src)}
                className="h-4 w-4 rounded accent-cp-neon"
              />
              <span style={{ color: COLORS[src], fontWeight: 600 }}>
                {src.charAt(0).toUpperCase() + src.slice(1)}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="time" />
          <YAxis domain={[-1, 1]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {mode === "sources" && visibleSources.twitter && (
            <Line
              type="monotone"
              dataKey="twitter"
              name="Twitter"
              stroke={COLORS.twitter}
            />
          )}
          {mode === "sources" && visibleSources.reddit && (
            <Line
              type="monotone"
              dataKey="reddit"
              name="Reddit"
              stroke={COLORS.reddit}
            />
          )}
          {mode === "sources" && visibleSources.news && (
            <Line
              type="monotone"
              dataKey="news"
              name="News"
              stroke={COLORS.news}
            />
          )}

          {mode === "overall" && (
            <Line
              type="monotone"
              dataKey="overall"
              name="Overall Sentiment"
              stroke={COLORS.overall}
              strokeWidth={3}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
