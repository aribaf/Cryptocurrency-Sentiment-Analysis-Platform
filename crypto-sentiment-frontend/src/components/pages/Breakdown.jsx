import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getBreakdown } from "../../api/api"; // <- api client

// Coins we can query individually
const COINS = ["BTC", "ETH", "SOLANA", "ALL"];
const PER_COIN = ["BTC", "ETH", "SOLANA"]; // for the mini overview

export default function Breakdown() {
  const { source } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Current coin from query string (default BTC)
  const coin = searchParams.get("coin") || "BTC";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // main breakdown for selected coin
  const [error, setError] = useState(null);

  // extra: per-coin breakdown (for BTC / ETH / SOLANA)
  const [perCoinData, setPerCoinData] = useState({});
  const [perCoinLoading, setPerCoinLoading] = useState(true);

  // Change coin in URL
  const handleCoinChange = (e) => {
    const newCoin = e.target.value;
    navigate(`/breakdown/${source}?coin=${newCoin}`);
  };

  const pct = (n) => {
    if (n == null) return "—";
    return `${(Number(n) * 100).toFixed(1)}%`;
  };

  const getScoreColor = (score) => {
    if (score > 0.3) return "text-[#d9ff2f]"; // bullish
    if (score < -0.3) return "text-[#ff522f]"; // bearish
    return "text-gray-400";
  };

  // Main + per-coin data (with polling)
  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      if (!source) {
        if (mounted) {
          setError("No source specified");
          setLoading(false);
          setPerCoinLoading(false);
        }
        return;
      }

      setLoading(true);
      setPerCoinLoading(true);
      setError(null);

      try {
        // 1) main breakdown for selected coin
        const mainPayload = await getBreakdown(source, coin);
        if (!mounted) return;

        const mainData =
          mainPayload && typeof mainPayload === "object"
            ? mainPayload.data || mainPayload
            : null;

        if (!mainData) {
          throw new Error("Invalid server response or empty data");
        }
        setData(mainData);
      } catch (err) {
        console.error("Breakdown error:", err);
        if (mounted) setError(err.message || "Failed to load breakdown");
      } finally {
        if (mounted) setLoading(false);
      }

      // 2) per-coin breakdown for BTC / ETH / SOLANA
      try {
        const results = await Promise.all(
          PER_COIN.map((c) => getBreakdown(source, c))
        );
        if (!mounted) return;

        const mapped = {};
        results.forEach((payload, idx) => {
          const c = PER_COIN[idx];
          const d = payload && (payload.data || payload);
          mapped[c] = d || null;
        });
        setPerCoinData(mapped);
      } catch (err) {
        console.error("Per-coin breakdown error:", err);
      } finally {
        if (mounted) setPerCoinLoading(false);
      }
    };

    // initial + polling
    fetchAll();
    const INTERVAL = 60000; // 60s
    const id = setInterval(fetchAll, INTERVAL);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [source, coin]);

  const prettySource =
    source && source.length
      ? source.charAt(0).toUpperCase() + source.slice(1)
      : "Source";

  return (
    <div className="bg-[#101010] min-h-screen text-gray-200 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          className="mb-2 text-sm text-[#ff522f] hover:text-[#d9ff2f] transition-colors"
          onClick={() => navigate(-1)}
        >
          &larr; Back to Dashboard
        </button>

        {/* Header + coin selector row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black mb-1 text-white tracking-tight">
              <span className="text-[#d9ff2f]">{prettySource}</span> Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Live sentiment breakdown for this data source. 
            </p>
          </div>

          {/* Coin selector */}
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="coin-select"
              className="text-xs sm:text-sm font-medium text-gray-400"
            >
              Filter Coin:
            </label>
            <select
              id="coin-select"
              value={coin}
              onChange={handleCoinChange}
              className="bg-gray-900 text-white border border-gray-700 rounded-md px-2 py-1.5 text-sm focus:ring-[#d9ff2f] focus:border-[#d9ff2f] transition-colors"
            >
              {COINS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="text-xs sm:text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-200">{coin}</span>
            </span>
          </div>
        </div>

        {loading && (
          <div className="text-gray-500 text-sm mt-2">
            Loading metrics&hellip;
          </div>
        )}
        {error && <div className="text-red-500 mt-4">Error: {error}</div>}

        {/* MAIN BREAKDOWN */}
        {!loading && !error && data && (
          <div className="space-y-8">
            {/* Sentiment Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Positive Metric */}
              <div className="p-4 rounded-lg border-2 border-[#d9ff2f]/50 bg-black/30 shadow-lg shadow-[#d9ff2f]/10">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Positive
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-[#d9ff2f] mt-1">
                  {pct(data.positive)}
                </div>
              </div>

              {/* Neutral Metric */}
              <div className="p-4 rounded-lg border-2 border-gray-600/50 bg-black/30 shadow-lg shadow-gray-600/10">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Neutral
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-gray-400 mt-1">
                  {pct(data.neutral)}
                </div>
              </div>

              {/* Negative Metric */}
              <div className="p-4 rounded-lg border-2 border-[#ff522f]/50 bg-black/30 shadow-lg shadow-[#ff522f]/10">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Negative
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-[#ff522f] mt-1">
                  {pct(data.negative)}
                </div>
              </div>

              {/* Average Score Metric */}
              <div className="p-4 rounded-lg border-2 border-indigo-600/50 bg-black/30 shadow-lg shadow-indigo-600/10">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Avg sentiment score
                </div>
                <div
                  className={`text-3xl sm:text-4xl font-bold mt-1 ${getScoreColor(
                    data.avg_score
                  )}`}
                >
                  {data.avg_score != null
                    ? Number(data.avg_score).toFixed(3)
                    : "—"}
                </div>
              </div>
            </div>

            {/* PER-COIN MINI BREAKDOWN */}
            <div className="p-4 sm:p-5 rounded-lg bg-black/40 border border-gray-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-lg font-bold text-white">
                  Per-Coin Sentiment (BTC / ETH / SOLANA)
                </h3>
                {perCoinLoading && (
                  <span className="text-xs text-gray-500">
                    Updating&hellip;
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PER_COIN.map((c) => {
                  const d = perCoinData[c];
                  const avg = d?.avg_score ?? 0;
                  return (
                    <div
                      key={c}
                      className="p-4 rounded-lg border border-gray-700 bg-gradient-to-br from-black/50 to-gray-900/80"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                          {c}
                        </span>
                        <span
                          className={`text-xs font-bold ${getScoreColor(
                            avg
                          )}`}
                        >
                          {avg != null
                            ? Number(avg).toFixed(3)
                            : "—"}
                        </span>
                      </div>

                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Pos</span>
                        <span>Neu</span>
                        <span>Neg</span>
                      </div>

                      <div className="mt-1 flex gap-1 h-2 rounded-full overflow-hidden bg-gray-800">
                        <div
                          className="bg-[#d9ff2f]"
                          style={{
                            width: pct(d?.positive ?? 0),
                          }}
                        />
                        <div
                          className="bg-gray-500"
                          style={{
                            width: pct(d?.neutral ?? 0),
                          }}
                        />
                        <div
                          className="bg-[#ff522f]"
                          style={{
                            width: pct(d?.negative ?? 0),
                          }}
                        />
                      </div>

                      <p className="mt-2 text-[11px] text-gray-500">
                        Pos {pct(d?.positive)} · Neu {pct(d?.neutral)} · Neg{" "}
                        {pct(d?.negative)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Posts/Items Section */}
            <div className="p-4 sm:p-6 rounded-lg bg-black/40 border border-gray-800">
              <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 text-white">
                Top Posts / Items
              </h3>

              {Array.isArray(data.top_posts) && data.top_posts.length ? (
                <ul className="divide-y divide-gray-800">
                  {data.top_posts.map((p, i) => (
                    <li key={i} className="py-3">
                      <p className="mb-0.5 text-sm sm:text-base font-medium">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            {p.title || p.text || p.url}
                          </a>
                        ) : (
                          <span className="text-gray-300">
                            {p.title || p.text || "Untitled"}
                          </span>
                        )}
                      </p>
                      <div className="text-[11px] sm:text-xs text-gray-500 flex flex-wrap gap-2">
                        {p.created_at
                          ? String(p.created_at).slice(0, 19)
                          : ""}
                        {p.sentiment_label && (
                          <span
                            className={`font-semibold ${
                              p.sentiment_label === "Positive"
                                ? "text-[#d9ff2f]"
                                : p.sentiment_label === "Negative"
                                ? "text-[#ff522f]"
                                : "text-gray-400"
                            }`}
                          >
                            · {p.sentiment_label}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">
                  No top posts available.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
