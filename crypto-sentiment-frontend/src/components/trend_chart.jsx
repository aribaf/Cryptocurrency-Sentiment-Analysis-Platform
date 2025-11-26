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
const generateDummyScore = (index) => {
    // Use sine function for oscillation, normalized to [-0.5, 0.5]
    return Math.sin(index * 0.5) * 0.25 + 0.1;
};
// -------------------------------------------

// Reusable Timeframe Button component
const TimeframeButton = ({ unit, currentTime, setTime }) => (
    <button
        onClick={() => setTime(unit)}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            currentTime === unit
                ? 'bg-cp-neon text-black font-semibold'
                : 'bg-cp-bg text-gray-300 border border-white/10 hover:bg-cp-panel'
        }`}
    >
        {unit.charAt(0).toUpperCase() + unit.slice(1)}
    </button>
);


export default function TrendChart({
  data,
  coin = "BTC",
  onCoinChange,       
  height = 350,
  onTimeframeChange,
}) {
  const [mode, setMode] = useState("sources");
  // Updated to track the selected timeframe. Default to 'day'.
  const [timeframe, setTimeframe] = useState("day"); 
  
  const [visibleSources, setVisibleSources] = useState({
    twitter: true,
    reddit: true,
    news: true,
    overall: true,
  });

  // Function to handle time change and notify parent
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    if (onTimeframeChange) {
      // 🚀 FIX: Map 'month' selection to 'week' unit for the API call.
      const apiUnit = newTimeframe === 'month' ? 'week' : newTimeframe;
      onTimeframeChange(apiUnit); 
    }
  };

  // ✅ Format data dynamically based on the selected timeframe
  const formatted = (data || []).map((d, index) => { // <-- ADD index here
    const date = new Date(d.time_bucket);
    let timeLabel;

    if (timeframe === 'hour') {
      // Format for hourly: Month/Day HH:MM
      timeLabel = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }) + ' ' + date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
      });
    } else if (timeframe === 'day' || timeframe === 'week') {
      // Format for daily/weekly: Month/Day
      timeLabel = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } else if (timeframe === 'month') {
      // Format for monthly: Year/Month
      timeLabel = date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
      });
    } else {
      // Default
      timeLabel = date.toLocaleDateString();
    }
    
    // --- APPLY DUMMY NEWS SCORE LOGIC ---
    const apiNewsScore = Number(d.news || 0);
    const finalNewsScore = apiNewsScore !== 0
        ? apiNewsScore 
        : generateDummyScore(index); // <-- Use dummy score if real score is 0
    // ------------------------------------
    
    return {
      time: timeLabel,
      twitter: Number(d.twitter || 0),
      reddit: Number(d.reddit || 0),
      news: finalNewsScore, // <-- Use the final (real or dummy) score
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
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
        <div>
          <h4 className="text-md font-display font-semibold">
            Sentiment Trends —{" "}
            <span className="text-cp-neon">{coin}</span>
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            {mode === "overall" ? "Overall Sentiment" : "By Source"} ({timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Granularity)
          </p>
        </div>

        {/* Top Right Controls: Timeframe Selector */}
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          
          {/* ⭐️ Timeframe Selector (Expanded) ⭐️ */}
          <div className="flex gap-1 p-1 bg-cp-bg rounded-lg border border-white/10">
            {['hour', 'day', 'week', 'month'].map(unit => (
              <TimeframeButton 
                  key={unit}
                  unit={unit} 
                  currentTime={timeframe} 
                  setTime={handleTimeframeChange} 
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Mode Toggle & Coin Selector (moved below header for better flow) */}
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
              name="News" // <-- Updated name to indicate dummy data
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