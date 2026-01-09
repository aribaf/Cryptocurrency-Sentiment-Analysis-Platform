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
  ReferenceLine,
} from "recharts";

/* ----------------------------------
   SMOOTHING (MOVING AVERAGE)
---------------------------------- */
const smoothSeries = (arr, key, window = 5) =>
  arr.map((d, i) => {
    const slice = arr.slice(Math.max(0, i - window), i + 1);
    const avg =
      slice.reduce((sum, x) => sum + (x[key] ?? 0), 0) / slice.length;
    return { ...d, [key]: Number(avg.toFixed(4)) };
  });

/* ----------------------------------
   CUSTOM TOOLTIP
---------------------------------- */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="p-3 rounded-lg border border-white/10 shadow-lg bg-cp-bg/95 text-xs text-gray-100">
      <p className="font-semibold mb-1 text-cp-neon">{label}</p>
      {payload.map((item, i) => (
        <p key={i} style={{ color: item.stroke }}>
          {item.name}: {item.value.toFixed(3)}
        </p>
      ))}
    </div>
  );
};

/* ----------------------------------
   COMPONENT
---------------------------------- */
export default function TrendChart({
  data,
  coin = "BTC",
  onCoinChange,
  height = 350,
}) {
  const [mode, setMode] = useState("sources");

  const [visibleSources, setVisibleSources] = useState({
    twitter: true,
    reddit: true,
    news: true,
  });

  /* ---------- FORMAT DATA (REAL ONLY) ---------- */
  let formatted = (data || []).map((d) => {
    const date = new Date(d.time_bucket);
    const label = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    return {
      time: label,
      twitter: Number(d.twitter ?? null),
      reddit: Number(d.reddit ?? null),
      news: d.news !== undefined ? Number(d.news) : null,
      overall: Number(d.overall ?? d.mean_sentiment_score ?? 0),
    };
  });

  /* ---------- APPLY SMOOTHING ---------- */
  formatted = smoothSeries(formatted, "twitter", 5);
  formatted = smoothSeries(formatted, "reddit", 5);
  formatted = smoothSeries(formatted, "news", 5);
  formatted = smoothSeries(formatted, "overall", 5);

  /* ---------- COLORS ---------- */
  const COLORS = {
    twitter: "#8b5cf6",
    reddit: "#ff5722",
    news: "#d9ff2f",
    overall: "#ec4899",
  };

  const toggleSource = (src) =>
    setVisibleSources((p) => ({ ...p, [src]: !p[src] }));

  return (
    <div className="bg-cp-panel/90 rounded-xl p-4 border border-white/5 text-white">

      {/* HEADER */}
      <div className="flex justify-between mb-4">
        <div>
          <h4 className="text-md font-semibold">
            Coin — <span className="text-cp-neon">{coin}</span>
          </h4>
          <p className="text-xs text-gray-400">
            {mode === "overall" ? "Overall Sentiment Trend" : "Sentiment by Source"}
          </p>
        </div>
      </div>

      {/* MODE TOGGLE */}
      <div className="flex justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 text-xs">
          {["sources", "overall"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-full transition ${
                mode === m
                  ? "bg-cp-neon text-black font-semibold"
                  : "bg-cp-bg border border-white/15 text-gray-300"
              }`}
            >
              {m === "sources" ? "By Source" : "Overall Trend"}
            </button>
          ))}
        </div>

        {onCoinChange && (
          <select
            value={coin}
            onChange={(e) => onCoinChange(e.target.value)}
            className="px-3 py-1 text-xs rounded bg-cp-bg border border-white/15"
          >
            <option value="BTC">Bitcoin</option>
            <option value="ETH">Ethereum</option>
            <option value="SOLANA">Solana</option>
          </select>
        )}
      </div>

      {/* SOURCE FILTERS */}
      {mode === "sources" && (
        <div className="flex gap-4 mb-4 text-xs">
          {["twitter", "reddit", "news"].map((src) => (
            <label key={src} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleSources[src]}
                onChange={() => toggleSource(src)}
                className="accent-cp-neon"
              />
              <span style={{ color: COLORS[src], fontWeight: 600 }}>
                {src.toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* CHART */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="time" />
          <YAxis domain={[-0.5, 0.5]} tickFormatter={(v) => v.toFixed(2)} />
          <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {mode === "sources" && visibleSources.twitter && (
            <Line
              dataKey="twitter"
              name="Twitter"
              stroke={COLORS.twitter}
              strokeWidth={2.5}
              dot={false}
            />
          )}

          {mode === "sources" && visibleSources.reddit && (
            <Line
              dataKey="reddit"
              name="Reddit"
              stroke={COLORS.reddit}
              strokeWidth={1.5}
              opacity={0.6}
              dot={false}
            />
          )}

          {mode === "sources" && visibleSources.news && (
            <Line
              dataKey="news"
              name="News"
              stroke={COLORS.news}
              strokeWidth={1.5}
              opacity={0.6}
              dot={false}
              connectNulls={false}
            />
          )}

          {mode === "overall" && (
            <Line
              dataKey="overall"
              name="Overall Sentiment"
              stroke={COLORS.overall}
              strokeWidth={3}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* FOOTER EXPLANATION */}
      <p className="text-xs text-gray-400 mt-3">
        Sentiment values range from −1 (negative) to +1 (positive).  
        Lines represent a 5-point moving average to reduce short-term noise.
      </p>
    </div>
  );
}
