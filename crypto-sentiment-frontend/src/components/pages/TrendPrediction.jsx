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
        const rep = list[0] || {};
        const short =
          rep.short_term_acc ??
          rep.short_term_accuracy ??
          rep.short_term ??
          null;
        const mid =
          rep.mid_term_acc ?? rep.mid_term_accuracy ?? rep.mid_term ?? null;
        const long =
          rep.long_term_acc ?? rep.long_term_accuracy ?? rep.long_term ?? null;
        const overall =
          rep.overall_acc ??
          rep.overall_accuracy ??
          rep.confidence ??
          rep.confidence_pct ??
          null;
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

  // in TrendPrediction.jsx
  const onExport = () => {
    const base = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
    const href = base
      ? `${base}/api/trends/download/csv`
      : "/api/trends/download/csv";

    // open CSV in a new tab (or trigger download)
    window.open(href, "_blank");
  };

  const visible = items.filter((it) => {
    if (!filter) return true;
    return (it.cryptocurrency || "").toLowerCase().includes(filter);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            Trend Prediction
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Model-based price direction and confidence for major cryptocurrencies.
          </p>
        </div>
      </div>

      {/* Accuracy cards (wrap nicely on small screens) */}
      <div className="mb-4 sm:mb-6">
        <AccuracyCards stats={stats} />
      </div>

      {/* Main layout: stack on mobile, split on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
        {/* Left / main column */}
        <div className="xl:col-span-3 space-y-4 sm:space-y-5">
          {/* List of prediction cards */}
          <div className="space-y-4 sm:space-y-5">
            {loading && (
              <div className="text-gray-400 text-sm sm:text-base">
                Loading predictions...
              </div>
            )}
            {!loading && visible.length === 0 && (
              <div className="text-gray-500 text-sm sm:text-base">
                No predictions found.
              </div>
            )}
            {visible.map((item) => (
              <TrendCard
                key={item.cryptocurrency}
                item={item}
                onViewHistory={onViewHistory}
              />
            ))}
          </div>

          {/* Live realtime panel */}
          <section className="mt-5 sm:mt-6 lg:mt-8">
            <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
              Live Price & Signal (Last Updates)
            </h2>
            {/* If charts ever overflow horizontally on tiny screens, this wrapper helps */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[280px]">
                <TrendRealtime />
              </div>
            </div>
          </section>

          {/* Historical accuracy below it */}
          <section className="mt-5 sm:mt-6 lg:mt-8">
            <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
              Historical Accuracy
            </h2>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[280px]">
                <HistoricalChart data={history} metric="confidence" />
              </div>
            </div>
          </section>
        </div>

        {/* Optional sidebar (filters, export, etc.) – keep responsive if you re-enable */}
        {/*
        <aside className="xl:col-span-1">
          <Sidebar
            onSearch={onSearch}
            onTimeframe={setTimeframe}
            timeframe={timeframe}
            onExport={onExport}
            stats={stats}
            activeCoin={activeCoin}
            historyLength={history.length}
          />
        </aside>
        */}
      </div>
    </div>
  );
}
