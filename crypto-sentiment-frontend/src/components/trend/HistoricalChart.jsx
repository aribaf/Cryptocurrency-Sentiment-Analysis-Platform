import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/**
 * Props:
 *  - data OR dataPoints: array of history docs { generated_at, confidence, ... }
 *  - metric OR field: name of numeric field to plot (default 'confidence')
 */
export default function HistoricalChart(props) {
  const raw = props.data || props.dataPoints || [];
  const metric = props.metric || props.field || "confidence";

  // Normalize into { time, value } objects for Recharts
  const parsed = (raw || [])
    .map((d) => {
      // try multiple date fields if necessary
      const gen = d.generated_at || d.generatedAt || d.generatedAtISO || d.time || d.date;
      let time = "";
      try {
        if (gen) {
          // Accept Date objects or ISO strings
          const dt = gen instanceof Date ? gen : new Date(gen);
          if (!isNaN(dt.getTime())) {
            time = dt.toLocaleString(); // friendly label
          }
        }
      } catch (e) {
        time = String(gen || "");
      }

      const value = Number(d[metric] ?? d.confidence ?? 0);
      return { ...d, time, value };
    })
    // ensure order oldest -> newest
    .sort((a, b) => {
      const ta = new Date(a.generated_at || a.time || 0).getTime();
      const tb = new Date(b.generated_at || b.time || 0).getTime();
      return ta - tb;
    });

  if (!parsed.length) {
    return (
      <div className="p-6 text-center text-gray-500 bg-transparent rounded">
        Historical accuracy chart will appear here
      </div>
    );
  }

  // simple tick formatter to avoid overlapping long strings
  const tickFormatter = (tick) => {
    try {
      const dt = new Date(tick);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      // fallback if tick is already a friendly string
      return String(tick).slice(0, 16);
    } catch {
      return String(tick).slice(0, 16);
    }
  };

  // build chart-friendly points: we want the X values to be the ISO string or full date so tooltip shows full info
  const chartData = parsed.map((p) => ({
    ...p,
    _x_iso: p.generated_at || p.time || new Date().toISOString(),
    display_time: p.time || p._x_iso,
    value: p.value,
  }));

  return (
    <div className="bg-transparent p-2 rounded-lg">
      <h3 className="text-sm text-gray-300 mb-2">Historical {metric}</h3>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#111827" />
            <XAxis
              dataKey="display_time"
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              interval="preserveEnd"
              tickFormatter={(v, idx) => {
                // show fewer ticks on long datasets
                if (chartData.length > 12) {
                  const step = Math.ceil(chartData.length / 8);
                  const i = idx;
                  return i % step === 0 ? (v.length > 12 ? v.slice(0, 12) : v) : "";
                }
                return v.length > 12 ? v.slice(0, 12) : v;
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              width={60}
              domain={["dataMin", "dataMax"]}
            />
            <Tooltip
              formatter={(value) => [value, metric]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
