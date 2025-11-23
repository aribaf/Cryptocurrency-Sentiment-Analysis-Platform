import React, { useEffect, useState, useCallback } from "react";

import AccuracyCards from "../trend/AccuracyCards";
import TrendCard from "../trend/TrendCard";
import Sidebar from "../trend/Sidebar";
import HistoricalChart from "../trend/HistoricalChart";
import TrendRealtime from "../trend/TrendRealTime";

import { fetchTrends, fetchTrendHistory } from "../../api/api.js";

export default function TrendPrediction() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCoin, setActiveCoin] = useState(null);
  const [history, setHistory] = useState([]);
  const [timeframe, setTimeframe] = useState("short");
  const [filter, setFilter] = useState("");
  const [stats, setStats] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTrends();
      const list = Array.isArray(data) ? data : [];
      setItems(list);

      // compute quick accuracy cards from the first item or aggregate
      if (list.length) {
        // try to find a representative item (Bitcoin / first)
        const rep = list[0] || {};
        const short = rep.short_term_acc ?? rep.short_term_accuracy ?? rep.short_term ?? null;
        const mid = rep.mid_term_acc ?? rep.mid_term_accuracy ?? rep.mid_term ?? null;
        const long = rep.long_term_acc ?? rep.long_term_accuracy ?? rep.long_term ?? null;
        const overall =
          rep.overall_acc ?? rep.overall_accuracy ?? rep.confidence ?? rep.confidence_pct ?? null;
        setStats({ short, mid, long, overall });
      } else {
        setStats({});
      }
    } catch (e) {
      console.error("fetchTrends error", e);
      setItems([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 30_000); // poll every 30s
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    // when active coin changes load history
    async function loadHistory() {
      if (!activeCoin) return setHistory([]);
      try {
        const h = await fetchTrendHistory(activeCoin, 90);
        setHistory(Array.isArray(h) ? h : []);
      } catch (err) {
        console.error("fetchTrendHistory error", err);
        setHistory([]);
      }
    }
    loadHistory();
  }, [activeCoin]);

  const onViewHistory = async (coin) => {
    setActiveCoin(coin);
    try {
      const h = await fetchTrendHistory(coin, 90);
      setHistory(Array.isArray(h) ? h : []);
    } catch (err) {
      console.error("fetchTrendHistory:", err);
      setHistory([]);
    }
  };

  const onSearch = (q) => {
    setFilter(q?.trim()?.toLowerCase() || "");
  };

  const onExport = () => {
    const base = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
    const href = base ? `${base}/api/trends/download/csv` : "/api/trends/download/csv";
    window.open(href, "_blank");
  };

  const visible = items.filter((it) => {
    if (!filter) return true;
    return (it.cryptocurrency || "").toLowerCase().includes(filter);
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Trend Prediction</h1>

      <AccuracyCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="space-y-4">
            {loading && <div className="text-gray-400">Loading predictions...</div>}
            {!loading && visible.length === 0 && (
              <div className="text-gray-500">No predictions found.</div>
            )}
            {visible.map((item) => (
              <TrendCard key={item.cryptocurrency} item={item} onViewHistory={onViewHistory} />
            ))}
          </div>

          {/* Live realtime panel */}
<div className="mt-6">
  <TrendRealtime />
</div>

{/* Historical accuracy below it */}
<div className="mt-6">
  <h2 className="text-lg font-semibold mb-3">Historical Accuracy</h2>
  <HistoricalChart data={history} metric="confidence" />
</div>

        </div>

        <aside className="lg:col-span-1">
          <Sidebar
            onSearch={onSearch}
            onTimeframe={setTimeframe}
            timeframe={timeframe}
            onExport={onExport}
          />
          <div className="mt-4">
            {activeCoin ? (
              <div className="bg-black/30 p-4 rounded border border-gray-800">
                <div className="text-sm text-gray-400 mb-2">History for</div>
                <div className="text-lg font-semibold">{activeCoin}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Showing last {history.length} points
                </div>
              </div>
            ) : (
              <div className="bg-black/30 p-4 rounded border border-gray-800 text-sm text-gray-400">
                Select a coin's “View History” to inspect its recent predictions.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
