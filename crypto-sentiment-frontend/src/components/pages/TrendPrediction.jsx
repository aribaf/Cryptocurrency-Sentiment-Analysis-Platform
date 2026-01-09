import React, { useEffect, useState, useCallback } from "react";

import AccuracyCards from "../trend/AccuracyCards";
import TrendCard from "../trend/TrendCard";
import Sidebar from "../trend/Sidebar";
import HistoricalChart from "../trend/HistoricalChart";
import TrendRealtime from "../trend/TrendRealTime";
import Chatbot from "../chatbot/Chatbot";

import { fetchTrends, fetchTrendHistory } from "../../api/api.js";

// -----------------------------
// Neutral Baseline Defaults (Preloaded UI)
// -----------------------------
const DEFAULT_STATS = {
  short: 0.58,
  mid: 0.61,
  long: 0.64,
  overall: 0.62,
};

const DEFAULT_ITEMS = [
  {
    cryptocurrency: "BTC",
    signal: "HOLD",
    confidence: 0.62,
    timeframe: "short",
    direction: "neutral",
  },
  {
    cryptocurrency: "ETH",
    signal: "HOLD",
    confidence: 0.6,
    timeframe: "short",
    direction: "neutral",
  },
  {
    cryptocurrency: "SOLANA",
    signal: "HOLD",
    confidence: 0.59,
    timeframe: "short",
    direction: "neutral",
  },
];

const DEFAULT_HISTORY = [
  { time: "T-4", confidence: 0.6 },
  { time: "T-3", confidence: 0.61 },
  { time: "T-2", confidence: 0.62 },
  { time: "T-1", confidence: 0.63 },
  { time: "Now", confidence: 0.62 },
];

export default function TrendPrediction() {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [loading, setLoading] = useState(false);
  const [activeCoin, setActiveCoin] = useState("BTC");
  const [history, setHistory] = useState(DEFAULT_HISTORY);
  const [timeframe, setTimeframe] = useState("short");
  const [filter, setFilter] = useState("");
  const [stats, setStats] = useState(DEFAULT_STATS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTrends();
      const list = Array.isArray(data) ? data : [];

      setItems(list.length ? list : DEFAULT_ITEMS);

      if (list.length) {
        const rep = list[0] || {};
        const short =
          rep.short_term_acc ??
          rep.short_term_accuracy ??
          rep.short_term ??
          DEFAULT_STATS.short;
        const mid =
          rep.mid_term_acc ??
          rep.mid_term_accuracy ??
          rep.mid_term ??
          DEFAULT_STATS.mid;
        const long =
          rep.long_term_acc ??
          rep.long_term_accuracy ??
          rep.long_term ??
          DEFAULT_STATS.long;
        const overall =
          rep.overall_acc ??
          rep.overall_accuracy ??
          rep.confidence ??
          rep.confidence_pct ??
          DEFAULT_STATS.overall;

        setStats({ short, mid, long, overall });
      } else {
        setStats(DEFAULT_STATS);
      }
    } catch (e) {
      console.error("fetchTrends error", e);
      setItems(DEFAULT_ITEMS);
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    async function loadHistory() {
      if (!activeCoin) {
        setHistory(DEFAULT_HISTORY);
        return;
      }
      try {
        const h = await fetchTrendHistory(activeCoin, 90);
        setHistory(Array.isArray(h) && h.length ? h : DEFAULT_HISTORY);
      } catch (err) {
        console.error("fetchTrendHistory error", err);
        setHistory(DEFAULT_HISTORY);
      }
    }
    loadHistory();
  }, [activeCoin]);

  const onViewHistory = async (coin) => {
    setActiveCoin(coin);
    try {
      const h = await fetchTrendHistory(coin, 90);
      setHistory(Array.isArray(h) && h.length ? h : DEFAULT_HISTORY);
    } catch (err) {
      console.error("fetchTrendHistory:", err);
      setHistory(DEFAULT_HISTORY);
    }
  };

  const onSearch = (q) => {
    setFilter(q?.trim()?.toLowerCase() || "");
  };

  const onExport = () => {
    const base = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
    const href = base
      ? `${base}/api/trends/download/csv`
      : "/api/trends/download/csv";
    window.open(href, "_blank");
  };

  const visible = items.filter((it) => {
    if (!filter) return true;
    return (it.cryptocurrency || "").toLowerCase().includes(filter);
  });
  const chatbotContext = {
  overall: {
    score: stats.overall,
    label:
      stats.overall > 0.65
        ? "High confidence"
        : stats.overall > 0.55
        ? "Moderate confidence"
        : "Low confidence",
  },
};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
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

      {/* Accuracy cards */}
      <div className="mb-4 sm:mb-6">
        <AccuracyCards stats={stats} />
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
        <div className="xl:col-span-3 space-y-4 sm:space-y-5">
          {/* Prediction cards */}
          <div className="space-y-4 sm:space-y-5">
            {visible.map((item) => (
              <TrendCard
                key={item.cryptocurrency}
                item={item}
                onViewHistory={onViewHistory}
              />
            ))}
          </div>

          {/* Live realtime */}
          <section className="mt-5 sm:mt-6 lg:mt-8">
            <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
              Live Price & Signal (Last Updates)
            </h2>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[280px]">
                <TrendRealtime />
              </div>
            </div>
          </section>

          {/* Historical accuracy */}
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

        {/* Optional sidebar (still disabled) */}
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
<Chatbot
  coin={activeCoin}
  sentiment={chatbotContext}
  timeframe={timeframe}
/>

    </div>
  );
}
