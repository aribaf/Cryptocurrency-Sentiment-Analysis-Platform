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

// 💥 Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-white border border-gray-300 rounded shadow-md text-sm text-gray-800 font-sans">
        <p className="font-bold mb-1">{label}</p>
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

  const COLORS = {
    twitter: "#1DA1F2", // Blue
    reddit: "#FF4500", // Orange
    news: "#22C55E", // Green
    overall: "#9333EA", // Purple
  };

  // ✅ Handle checkbox toggle
  const toggleSource = (source) => {
    setVisibleSources((prev) => ({
      ...prev,
      [source]: !prev[source],
    }));
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
      {/* Header + Mode Toggle */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h4 className="text-md font-semibold text-gray-800">
          Sentiment Trends —{" "}
          {mode === "overall" ? "Overall" : "By Source"}
        </h4>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMode("sources")}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              mode === "sources"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            By Source
          </button>
          <button
            onClick={() => setMode("overall")}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              mode === "overall"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Overall
          </button>
        </div>
      </div>

      {/* Source Toggles (checkbox filters) */}
      {mode === "sources" && (
        <div className="flex flex-wrap items-center space-x-4 mb-4">
          {["twitter", "reddit", "news"].map((src) => (
            <label key={src} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={visibleSources[src]}
                onChange={() => toggleSource(src)}
                className="accent-blue-600"
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
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{
              fontSize: 11,
              fill: "#4b5563",
              className: "font-sans",
            }}
          />
          <YAxis
            yAxisId="sentiment"
            tick={{
              fill: "#4b5563",
              className: "font-sans",
            }}
            domain={[-1, 1]}
            allowDecimals={true}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "5px" }} />

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
                  dot
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
                  dot
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
                  dot
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
                dot
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
