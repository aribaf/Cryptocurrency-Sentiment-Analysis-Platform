// src/components/Heatmap.jsx

import React, { useEffect, useState } from "react";
import { getHeatmap } from "../api/api";

// color helpers (same as earlier normalized version)
function scoreToColorNormalized(s) {
  const v = Math.max(-1, Math.min(1, s));
  if (v < 0) {
    const t = Math.abs(v);
    const h = (1 - t) * 8;
    const sPct = 90 - t * 80;
    const lPct = 75 - t * 10;
    return `hsl(${h}, ${sPct}%, ${lPct}%)`;
  } else if (v > 0) {
    const t = v;
    const h = 150 - (1 - t) * 30;
    const sPct = 60 + t * 20;
    const lPct = 85 - t * 30;
    return `hsl(${h}, ${sPct}%, ${lPct}%)`;
  } else {
    return "#1f2937"; // neutral mid-gray for dark UI
  }
}

function normalizeScores(rows) {
  const values = [];
  rows.forEach((r) => {
    if (r.values) {
      r.values.forEach((cell) => {
        if (cell.score !== null && !isNaN(cell.score)) {
          values.push(Number(cell.score));
        }
      });
    }
  });

  if (values.length === 0) {
    return rows.map((r) => ({
      ...r,
      values: r.values.map((v) => ({ ...v, normalized: null })),
    }));
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const doRescale = min >= 0;

  return rows.map((r) => ({
    ...r,
    values: r.values.map((v) => {
      const raw = v.score;
      if (raw === null || raw === undefined || isNaN(raw)) {
        return { ...v, normalized: null };
      }
      let normalized;
      if (doRescale) {
        if (max === min) normalized = 0;
        else normalized = ((raw - min) / (max - min)) * 2 - 1;
      } else {
        normalized = Math.max(-1, Math.min(1, raw));
      }
      return { ...v, normalized };
    }),
  }));
}

export default function Heatmap({ initialDays = 30 }) {
  const [days, setDays] = useState(initialDays);
  const [unit, setUnit] = useState("day");
  const [source, setSource] = useState("all");

  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState([]);
  const [dates, setDates] = useState([]);
  const [coins, setCoins] = useState([]);
  const [error, setError] = useState(null);

  const fetchHeatmap = (d, u, s) => {
    setLoading(true);
    setError(null);
    getHeatmap(d, u, s)
      .then((res) => {
        const rows = res || [];
        const coinSet = Array.from(new Set(rows.map((r) => r.coin))).sort();
        const dateSet = Array.from(new Set(rows.map((r) => r.date))).sort();

        const map = {};
        rows.forEach((r) => {
          map[r.coin] = map[r.coin] || {};
          map[r.coin][r.date] = r.score;
        });

        const gridRows = coinSet.map((c) => ({
          coin: c,
          values: dateSet.map((d) => ({
            date: d,
            score:
              map[c] && map[c][d] !== undefined ? map[c][d] : null,
          })),
        }));

        const normalized = normalizeScores(gridRows);
        setCoins(coinSet);
        setDates(dateSet);
        setGrid(normalized);
      })
      .catch((e) => {
        setError(e.message || "Failed to load heatmap");
        setGrid([]);
        setDates([]);
        setCoins([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHeatmap(days, unit, source);
  }, [days, unit, source]);

  return (
    <div className="bg-cp-panel/90 rounded-xl p-6 shadow-md border border-white/5 mt-6 overflow-x-auto text-white">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <h4 className="text-lg font-display font-semibold">
            Sentiment Heatmap
          </h4>
          <p className="text-xs text-gray-400">
            Visualize sentiment across coins (last {days} days)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="
              px-3 py-2 rounded-md
              bg-cp-bg/80 border border-white/10
              text-gray-100 focus:outline-none
              focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
            "
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="
              px-3 py-2 rounded-md
              bg-cp-bg/80 border border-white/10
              text-gray-100 focus:outline-none
              focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
            "
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="hour">Hourly</option>
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="
              px-3 py-2 rounded-md
              bg-cp-bg/80 border border-white/10
              text-gray-100 focus:outline-none
              focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
            "
          >
            <option value="all">All Sources</option>
            <option value="twitter">Twitter</option>
            <option value="reddit">Reddit</option>
            <option value="news">News</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-36 flex items-center justify-center text-cp-neon text-sm">
          Loading heatmap…
        </div>
      ) : error ? (
        <div className="h-36 flex items-center justify-center text-cp-magenta text-sm">
          {error}
        </div>
      ) : !grid.length || !dates.length ? (
        <div className="h-36 flex items-center justify-center text-gray-400 text-sm">
          No data for selected range / source.
        </div>
      ) : (
        <div className="min-w-[700px]">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium text-gray-300 sticky left-0 bg-cp-panel/95">
                  Coin / Date
                </th>
                {dates.map((d) => (
                  <th
                    key={d}
                    className="p-2 text-center font-medium text-gray-300"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.coin}>
                  <td className="p-2 font-semibold text-gray-100 sticky left-0 bg-cp-panel/95">
                    {row.coin}
                  </td>
                  {row.values.map((cell) => {
                    const norm = cell.normalized;
                    const color =
                      norm === null
                        ? "#020617" // slate-950-ish
                        : scoreToColorNormalized(norm);
                    const scoreLabel =
                      cell.score === null
                        ? "-"
                        : Number(cell.score).toFixed(3);
                    return (
                      <td key={cell.date} className="p-0">
                        <div
                          title={`${row.coin} • ${cell.date} • ${scoreLabel}`}
                          style={{
                            height: 30,
                            background: color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(15,23,42,0.3)",
                            fontSize: 11,
                            color: "#020617", // dark text against pastel cells
                          }}
                        >
                          {scoreLabel}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 text-[11px] text-gray-300">
            <div
              style={{
                width: 180,
                height: 10,
                background:
                  "linear-gradient(90deg, #ec4899, #4b5563, #d9ff2f)",
                borderRadius: 9999,
                boxShadow: "0 0 18px rgba(217,255,47,0.25)",
              }}
            />
            <div className="flex gap-3 items-center">
              <span className="text-cp-magenta font-medium">-1 (Bearish)</span>
              <span className="text-gray-400">0 (Neutral)</span>
              <span className="text-cp-neon font-medium">+1 (Bullish)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
