// src/components/pages/Breakdown.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getBreakdown } from "../../api/api"; // <- use the api client

export default function Breakdown() {
  const { source } = useParams();
  const [searchParams] = useSearchParams();
  const coin = searchParams.get("coin") || "BTC";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // expected: { positive, neutral, negative, avg_score, top_posts }
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setData(null);

    if (!source) {
      setError("No source specified");
      setLoading(false);
      return;
    }

    getBreakdown(source, coin)
      .then((payload) => {
        if (!mounted) return;
        // getBreakdown (in api.js) will return the inner payload (already unwrapped)
        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid server response");
        }
        setData(payload);
      })
      .catch((err) => {
        console.error("Breakdown error:", err);
        if (mounted) setError(err.message || "Failed to load breakdown");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [source, coin]);

  function pct(n) {
    if (n == null) return "—";
    return `${(Number(n) * 100).toFixed(1)}%`;
  }

  return (
    <div className="p-6 max-w-5xl">
      <button className="mb-4 text-sm text-indigo-600" onClick={() => navigate(-1)}>← Back</button>
      <h2 className="text-2xl font-semibold mb-2">
        {source ? `${source.charAt(0).toUpperCase() + source.slice(1)} Breakdown` : "Source Breakdown"} — {coin}
      </h2>

      {loading && <div className="text-gray-500">Loading metrics…</div>}
      {error && <div className="text-red-600 mt-4">Error: {error}</div>}

      {!loading && !error && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Positive</div>
              <div className="text-2xl font-bold">{pct(data.positive)}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Neutral</div>
              <div className="text-2xl font-bold">{pct(data.neutral)}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Negative</div>
              <div className="text-2xl font-bold">{pct(data.negative)}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Avg sentiment score</div>
              <div className="text-2xl font-bold">{data.avg_score != null ? Number(data.avg_score).toFixed(3) : "—"}</div>
            </div>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-medium mb-2">Top posts / items</h3>
            {Array.isArray(data.top_posts) && data.top_posts.length ? (
              <ul className="list-disc pl-5">
                {data.top_posts.map((p, i) => (
                  <li key={i} className="mb-1">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-indigo-600">
                        {p.title || p.text || p.url}
                      </a>
                    ) : (
                      <span>{p.title || p.text || "Untitled"}</span>
                    )}
                    <div className="text-xs text-gray-400">{p.created_at ? String(p.created_at).slice(0, 19) : ""} {p.sentiment_label ? ` — ${p.sentiment_label}` : ""}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">No top posts available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
