import React, { useEffect, useState, useRef } from "react";
import { fetchTrendHistory } from "../../api/api";
import HistoricalChart from "./HistoricalChart";

export default function TrendDetailModal({ coin, open, onClose, days = 31 }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  const loadHistory = async () => {
    if (!coin) return;
    setLoading(true);

    try {
      const data = await fetchTrendHistory(coin, days);
      const sorted = (data || []).sort(
        (a, b) => new Date(a.generated_at) - new Date(b.generated_at)
      );
      setHistory(sorted);
    } catch (err) {
      console.error("History fetch error:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadHistory();
  }, [open, coin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoRefresh || !open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(loadHistory, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const latest = history.length ? history[history.length - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-4xl mx-4 sm:mx-6 lg:mx-0">
        <div className="bg-[#05070a] border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                <span>{coin} — Trend History</span>
                <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-cp-neon/10 text-cp-neon border border-cp-neon/40">
                  Last {days} days
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400">
                Inspect how the model’s confidence and price predictions evolved over time.
              </p>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="text-lg leading-none">✕</span>
            </button>
          </div>

          {/* Control bar */}
          <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer-checked:bg-emerald-500/70 transition-colors relative">
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        autoRefresh ? "translate-x-4" : ""
                      }`}
                    />
                  </div>
                </div>
                <span>Auto-refresh every 5s</span>
              </label>
            </div>

            {latest && (
              <div className="text-[11px] sm:text-xs text-gray-400">
                Last updated:&nbsp;
                <span className="text-gray-200">
                  {new Date(latest.generated_at).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Content (scrollable) */}
          <div className="px-4 sm:px-6 py-4 flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-gray-400 text-center py-12 text-sm">
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="text-gray-500 text-center py-12 text-sm">
                No historical points yet.
                <br />
                <span className="text-xs text-gray-400">
                  Wait 30–60 seconds for the realtime worker to generate data.
                </span>
              </div>
            ) : (
              <>
                {/* Chart */}
                <div className="bg-[#070a0f] border border-white/10 rounded-xl p-3 sm:p-4">
                  <HistoricalChart
                    dataPoints={history}
                    field="confidence"
                    height={260}
                  />
                </div>

                {/* Summary cards */}
                {latest && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <div className="bg-[#070a0f] p-3 sm:p-4 rounded-xl border border-white/10">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                        Latest Confidence
                      </div>
                      <div className="text-lg sm:text-xl font-semibold text-white">
                        {latest.confidence}%
                      </div>
                    </div>

                    <div className="bg-[#070a0f] p-3 sm:p-4 rounded-xl border border-white/10">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                        Predicted Next Price
                      </div>
                      <div className="text-lg sm:text-xl font-semibold text-white">
                        {latest.predicted_next_price}
                      </div>
                    </div>

                    <div className="bg-[#070a0f] p-3 sm:p-4 rounded-xl border border-white/10">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                        Generated At
                      </div>
                      <div className="text-xs sm:text-sm text-gray-100">
                        {new Date(latest.generated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
