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
  }, [open, coin]);

  useEffect(() => {
    if (!autoRefresh || !open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(loadHistory, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, open]);

  if (!open) return null;

  const latest = history.length ? history[history.length - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black opacity-60" onClick={onClose} />

      {/* modal */}
      <div className="relative bg-[#0b0d0f] max-w-4xl w-full p-5 rounded shadow-lg z-50 border border-[#1a1d21]">
        {/* header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{coin} — Trend History</h3>

          <button onClick={onClose} className="text-gray-300 hover:text-white">
            Close
          </button>
        </div>

        {/* Auto-refresh */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-blue-500"
          />
          <span className="text-sm text-gray-300">Auto-refresh every 5s</span>
        </div>

        {/* content */}
        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-gray-500 text-center py-12">
            No historical points yet.  
            <br />
            Wait 30–60 seconds for the realtime worker to generate data.
          </div>
        ) : (
          <>
            {/* Chart */}
            <HistoricalChart dataPoints={history} field="confidence" height={250} />

            {/* summary */}
            {latest && (
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-[#111317] p-3 rounded border border-[#1a1d21]">
                  <div className="text-xs text-gray-400">Latest Confidence</div>
                  <div className="text-lg font-semibold text-white">
                    {latest.confidence}%
                  </div>
                </div>

                <div className="bg-[#111317] p-3 rounded border border-[#1a1d21]">
                  <div className="text-xs text-gray-400">Predicted Next Price</div>
                  <div className="text-lg font-semibold text-white">
                    {latest.predicted_next_price}
                  </div>
                </div>

                <div className="bg-[#111317] p-3 rounded border border-[#1a1d21]">
                  <div className="text-xs text-gray-400">Generated At</div>
                  <div className="text-sm text-white">
                    {new Date(latest.generated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
