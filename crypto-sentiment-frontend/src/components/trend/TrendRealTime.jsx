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

// ----------- Card Component ------------
function TrendCard({ item }) {
  return (
    <div className="p-4 bg-[#0b0d0f] rounded-xl shadow-sm border border-[#1f2937]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-400">{item.cryptocurrency}</div>
          <div className="text-xl font-semibold text-white">
            {item.market_trend}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-slate-500">Price</div>
          <div className="text-lg font-mono text-white">
            ${prettyPrice(item.current_price)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-500">Pred.</div>
        <div className="font-semibold text-white">
          ${prettyPrice(item.predicted_next_price)}
        </div>
        <div className="text-sm text-emerald-400">
          {parsePercent(item.confidence).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

// ----------- Main Component ------------
export default function TrendRealtime() {
  const [predictions, setPredictions] = useState([]);
  const [historyPoints, setHistoryPoints] = useState([]);
  const wsRef = useRef(null);

  const API_BASE =
    import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

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
  }, []);

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-white">Live Trend Predictions</h2>

      {/* cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {predictions.map((p) => (
          <TrendCard key={p.cryptocurrency} item={p} />
        ))}
      </div>

      {/* Chart */}
      <div className="mt-6 bg-[#0b0d0f] p-5 rounded-xl border border-[#1f2937]">
        <h3 className="mb-3 text-lg text-white">Live Price (last updates)</h3>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={historyPoints}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
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
  );
}
