import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

/* ---------------- STATUS LOGIC ---------------- */
function getStatus(lastUpdated) {
  if (!lastUpdated) return { label: "Unknown", color: "bg-gray-500" };

  const diffHours =
    (Date.now() - new Date(lastUpdated)) / (1000 * 60 * 60);

  if (diffHours < 1) return { label: "Fresh", color: "bg-green-500" };
  if (diffHours < 6) return { label: "Warning", color: "bg-yellow-500" };
  return { label: "Stale", color: "bg-red-500" };
}

/* ---------------- COMPONENT ---------------- */
export default function AdminSentiment() {
  const [data, setData] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  const token = localStorage.getItem("access_token");

  const fetchData = () => {
    axios
      .get(`${API_BASE}/api/admin/sentiment-monitor`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data))
      .catch((err) =>
        console.error("Sentiment monitor error:", err)
      );
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  /* ---------------- ACTIONS ---------------- */

  const handleRerun = async (source) => {
    try {
      setLoadingAction(source);
      await axios.post(
        `${API_BASE}/api/admin/sentiment/rerun/${source}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`${source.toUpperCase()} scraper triggered`);
      fetchData();
    } catch (err) {
      alert(
        err.response?.data?.detail || "Failed to rerun scraper"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggle = async (source) => {
    try {
      setLoadingAction(source);
      const res = await axios.post(
        `${API_BASE}/api/admin/sentiment/toggle/${source}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(
        `${source.toUpperCase()} is now ${
          res.data.enabled ? "ENABLED" : "DISABLED"
        }`
      );
    } catch {
      alert("Failed to toggle source");
    } finally {
      setLoadingAction(null);
    }
  };

  if (!data) {
    return (
      <div className="text-gray-400">
        Loading sentiment monitor…
      </div>
    );
  }

  return (
    <div className="bg-cp-panel p-6 rounded-xl border border-white/10">
      <h2 className="text-xl font-bold mb-4">
        Sentiment Data Monitor
      </h2>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  {Object.entries(data).map(([source, s]) => {
    const status = getStatus(s.last_updated);
    return (
      <div
        key={source}
        className="bg-cp-panel p-4 rounded-lg border border-white/10"
      >
        <div className="text-sm text-gray-400 capitalize">
          {source}
        </div>
        <div className="text-lg font-bold">
          {s.records} records
        </div>
        <div
          className={`text-xs mt-1 ${
            status.label === "Fresh"
              ? "text-green-400"
              : status.label === "Warning"
              ? "text-yellow-400"
              : "text-red-400"
          }`}
        >
          {status.label}
        </div>
      </div>
    );
  })}
</div>

      <table className="w-full text-sm text-left">
        <thead className="text-gray-400 border-b border-white/10">
          <tr>
            <th className="py-2">Source</th>
            <th>Records</th>
            <th>Avg Score</th>
            <th>Last Updated</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {Object.entries(data).map(([source, s]) => {
            const status = getStatus(s.last_updated);

            return (
              <tr
                key={source}
                className="border-b border-white/5 hover:bg-white/5 transition"
              >
                <td className="py-2 capitalize">{source}</td>
                <td>{s.records}</td>
                <td>
                  {typeof s.avg_score === "number"
                    ? s.avg_score.toFixed(3)
                    : "0.000"}
                </td>
                <td>
                  {s.last_updated
                    ? new Date(s.last_updated).toLocaleString()
                    : "N/A"}
                </td>

                <td>
  <span
    className={`px-2 py-1 rounded-full text-xs font-semibold ${
      status.label === "Fresh"
        ? "bg-green-500/20 text-green-400"
        : status.label === "Warning"
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-red-500/20 text-red-400"
    }`}
  >
    {status.label}
  </span>
</td>


                <td className="flex gap-2">
  <button
    onClick={() => handleRerun(source)}
    className="px-3 py-1 text-xs rounded border border-white/20 hover:bg-white/10"
  >
    Re-run
  </button>

  <button
    onClick={() => handleToggle(source)}
    className="px-3 py-1 text-xs rounded border border-red-500/40 text-red-400 hover:bg-red-500/10"
  >
    Disable
  </button>
</td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
