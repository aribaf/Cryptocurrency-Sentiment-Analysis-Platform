// src/components/trend/TrendRealtime.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ------------- Helpers -----------------
function parsePercent(x) {
  if (!x) return 0;
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    return parseFloat(x.replace("%", "")) || 0;
  }
  return 0;
}

function prettyPrice(x) {
  if (x === null || x === undefined) return "—";
  return Number(x).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function getTrendColor(trend) {
  const t = (trend || "").toLowerCase();
  if (t.includes("bull")) return "text-emerald-400";
  if (t.includes("bear")) return "text-red-400";
  return "text-yellow-300";
}

function getTrendBadgeBg(trend) {
  const t = (trend || "").toLowerCase();
  if (t.includes("bull")) return "bg-emerald-500/15 text-emerald-300";
  if (t.includes("bear")) return "bg-red-500/15 text-red-300";
  return "bg-yellow-500/15 text-yellow-200";
}

// ----------- Card Component ------------
// single coin card
function TrendCard({ item }) {
  const confidence = parsePercent(item.confidence);

  return (
    <div className="flex flex-col gap-3 p-4 sm:p-5 bg-[#05070a] rounded-xl shadow-sm border border-white/10 hover:border-cp-neon/60 transition-colors">
      {/* Top row: name + badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {item.cryptocurrency}
          </div>
          <div
            className={`mt-1 text-lg sm:text-xl font-semibold ${getTrendColor(
              item.market_trend
            )}`}
          >
            {item.market_trend}
          </div>
        </div>

        <span
          className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium ${getTrendBadgeBg(
            item.market_trend
          )}`}
        >
          Live signal
        </span>
      </div>

      {/* Price row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase text-slate-500">Current</div>
          <div className="text-base sm:text-lg font-mono text-white">
            ${prettyPrice(item.current_price)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] uppercase text-slate-500">
            Predicted next
          </div>
          <div className="text-base sm:text-lg font-mono text-slate-100">
            ${prettyPrice(item.predicted_next_price)}
          </div>
        </div>
      </div>

      {/* Confidence row */}
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="text-slate-500">Model confidence</span>
        <span
          className={`font-semibold ${
            confidence >= 80
              ? "text-emerald-400"
              : confidence >= 60
              ? "text-yellow-300"
              : "text-slate-300"
          }`}
        >
          {confidence.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ----------- Main Component ------------

export default function TrendRealtime() {
  const [predictions, setPredictions] = useState([]);
  const [historyPoints, setHistoryPoints] = useState([]);
  const wsRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  const connectWS = () => {
    const wsUrl =
      API_BASE.replace("http://", "ws://").replace("https://", "wss://") +
      "/ws/live_trends";

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log("WS connected");

    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.data) {
          const sorted = payload.data.sort((a, b) =>
            a.cryptocurrency.localeCompare(b.cryptocurrency)
          );
          setPredictions(sorted);

          // Add time-series point for chart
          const timestamp = new Date().toLocaleTimeString();
          setHistoryPoints((prev) => {
            const next = [
              ...prev,
              {
                time: timestamp,
                Bitcoin: sorted.find((x) => x.cryptocurrency === "Bitcoin")
                  ?.current_price,
                Ethereum: sorted.find((x) => x.cryptocurrency === "Ethereum")
                  ?.current_price,
                Solana: sorted.find((x) => x.cryptocurrency === "Solana")
                  ?.current_price,
              },
            ];
            return next.slice(-30); // keep last 30 updates
          });
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.onclose = () => {
      console.log("WS disconnected → reconnecting in 3s");
      setTimeout(() => connectWS(), 3000);
    };
  };

  useEffect(() => {
    connectWS();
    return () => wsRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full bg-cp-panel rounded-xl border border-white/5 p-4 sm:p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Live Trend Predictions
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Streaming model signals for the top tracked coins.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          Live
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {predictions.map((p) => (
          <TrendCard key={p.cryptocurrency} item={p} />
        ))}
        {!predictions.length && (
          <div className="col-span-full text-sm text-slate-400">
            Waiting for live signals…
          </div>
        )}
      </div>

      {/* Live price chart – stays responsive; remove this block if you only want cards */}
      {historyPoints.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-[#05070a] p-4 sm:p-5 rounded-xl border border-white/10">
          <h3 className="mb-3 text-sm sm:text-base font-semibold text-white">
            Live Price (last updates)
          </h3>

          <div className="h-52 sm:h-60 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyPoints}>
                <CartesianGrid stroke="#111827" strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  width={70}
                  tickFormatter={(v) => v.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "#1f2937",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="Bitcoin"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Ethereum"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Solana"
                  stroke="#f472b6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
