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

export default function TrendChart({ data, height = 350 }) {
  const [mode, setMode] = useState("sources"); // 'sources' or 'overall'
  const [visibleSources, setVisibleSources] = useState({
    twitter: true,
    reddit: true,
    news: true,
    overall: true,
  });

  // ✅ Prepare Data
  const formatted = (data || []).map((d) => ({
    time: new Date(d.time_bucket).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    twitter: Number(d.twitter || 0),
    reddit: Number(d.reddit || 0),
    news: Number(d.news || 0),
    overall: Number(d.overall || d.mean_sentiment_score || 0),
  }));

  // use your palette for chart strokes
  const COLORS = {
    twitter: "#8b5cf6", // cp-purple
    reddit: "#ff5722",  // cp-orange
    news: "#d9ff2f",    // cp-neon
    overall: "#ec4899", // cp-magenta
  };

  const toggleSource = (source) => {
    setVisibleSources((prev) => ({
      ...prev,
      [source]: !prev[source],
    }));
  };

  return (
    <div className="bg-cp-panel/90 rounded-xl p-4 shadow-lg border border-white/5 text-white">
      {/* Header + Mode Toggle */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h4 className="text-md font-display font-semibold">
          Sentiment Trends — {mode === "overall" ? "Overall" : "By Source"}
        </h4>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setMode("sources")}
            className={`px-3 py-1 rounded-full font-medium border transition-colors ${
              mode === "sources"
                ? "bg-cp-neon text-black border-cp-neon shadow-[0_0_12px_rgba(217,255,47,0.4)]"
                : "bg-cp-bg text-gray-200 border-white/15 hover:border-cp-neon/60"
            }`}
          >
            By Source
          </button>
          <button
            onClick={() => setMode("overall")}
            className={`px-3 py-1 rounded-full font-medium border transition-colors ${
              mode === "overall"
                ? "bg-cp-neon text-black border-cp-neon shadow-[0_0_12px_rgba(217,255,47,0.4)]"
                : "bg-cp-bg text-gray-200 border-white/15 hover:border-cp-neon/60"
            }`}
          >
            Overall
          </button>
        </div>
      </div>

      {/* Source Toggles (checkbox filters) */}
      {mode === "sources" && (
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
          {["twitter", "reddit", "news"].map((src) => (
            <label key={src} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleSources[src]}
                onChange={() => toggleSource(src)}
                className="
                  h-4 w-4 rounded border border-white/40 bg-cp-bg/80
                  checked:bg-cp-neon checked:border-cp-neon accent-cp-neon
                "
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
        <LineChart
          data={formatted}
          margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid
            stroke="rgba(148,163,184,0.25)" // slate-400/25
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="time"
            tick={{
              fontSize: 11,
              fill: "#9ca3af", // gray-400
            }}
            stroke="#4b5563"
          />
          <YAxis
            yAxisId="sentiment"
            tick={{
              fontSize: 11,
              fill: "#9ca3af",
            }}
            stroke="#4b5563"
            domain={[-1, 1]}
            allowDecimals={true}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: "11px",
              paddingTop: "8px",
              color: "#e5e7eb",
            }}
          />

          {/* --- Dynamic Lines --- */}
          {mode === "sources" ? (
            <>
              {visibleSources.twitter && (
                <Line
                  yAxisId="sentiment"
                  type="monotone"
                  dataKey="twitter"
                  stroke={COLORS.twitter}
                  name="Twitter"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {visibleSources.reddit && (
                <Line
                  yAxisId="sentiment"
                  type="monotone"
                  dataKey="reddit"
                  stroke={COLORS.reddit}
                  name="Reddit"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {visibleSources.news && (
                <Line
                  yAxisId="sentiment"
                  type="monotone"
                  dataKey="news"
                  stroke={COLORS.news}
                  name="News"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
            </>
          ) : (
            visibleSources.overall && (
              <Line
                yAxisId="sentiment"
                type="monotone"
                dataKey="overall"
                stroke={COLORS.overall}
                name="Overall Sentiment"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
