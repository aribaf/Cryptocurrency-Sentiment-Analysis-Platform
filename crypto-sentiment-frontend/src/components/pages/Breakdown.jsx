import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getBreakdown } from "../../api/api"; // <- use the api client

// 1. Define available coins (consistent with backend logic)
const COINS = ["BTC", "ETH", "SOLANA", "ALL"]; 

export default function Breakdown() {
  const { source } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get the current coin, defaulting to BTC if not set
  const coin = searchParams.get("coin") || "BTC"; 

  const [loading, setLoading] = useState(true);
  // expected data structure: { positive, neutral, negative, avg_score, top_posts }
  const [data, setData] = useState(null); 
  const [error, setError] = useState(null);

  // 2. Handler to change the coin filter
  const handleCoinChange = (e) => {
    const newCoin = e.target.value;
    // Update the URL's query parameter. This triggers the useEffect below.
    // We navigate to the current source path with the updated coin query.
    navigate(`/breakdown/${source}?coin=${newCoin}`);
  };

  // 4. Helper function to format percentages
  function pct(n) {
    if (n == null) return "—";
    return `${(Number(n) * 100).toFixed(1)}%`;
  }

  // 5. Helper function to get class for sentiment score
  const getScoreColor = (score) => {
    if (score > 0.3) return "text-[#d9ff2f]"; // Neon Green/Bullish
    if (score < -0.3) return "text-[#ff522f]"; // Neon Orange/Bearish
    return "text-gray-400"; // Neutral
  };

  // 3. Data Fetching Effect
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

    // Call the API client function
    getBreakdown(source, coin)
      .then((payload) => {
        if (!mounted) return;
        
        // Validate the response structure
        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid server response or empty data");
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

    // Cleanup function
    return () => {
      mounted = false;
    };
    // Dependencies: source or coin changes, triggering a re-fetch.
    // navigate is stable and can be omitted.
  }, [source, coin]); 

  // --- JSX Rendering ---
  return (
    // R1: Dark Background and Responsive Padding
    <div className="bg-[#101010] min-h-screen text-gray-200 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Back Button */}
        <button 
          className="mb-4 text-sm text-[#ff522f] hover:text-[#d9ff2f] transition-colors" 
          onClick={() => navigate(-1)}
        >
          &larr; Back to Dashboard
        </button>
        
        {/* Header */}
        <h2 className="text-3xl sm:text-4xl font-black mb-2 text-white tracking-tight">
          {/* R2: Responsive Heading - Capitalize source name */}
          <span className="text-[#d9ff2f]">
            {source ? `${source.charAt(0).toUpperCase() + source.slice(1)}` : "Source"}
          </span> Breakdown
        </h2>
        
        {/* 3. Coin Selector UI */}
        <div className="flex items-center space-x-2 mb-6">
          <label htmlFor="coin-select" className="text-sm font-medium text-gray-400">Filter Coin:</label>
          <select
            id="coin-select"
            value={coin}
            onChange={handleCoinChange}
            className="bg-gray-800 text-white border border-gray-700 rounded-md p-1.5 focus:ring-[#d9ff2f] focus:border-[#d9ff2f] transition-colors"
          >
            {COINS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">— Showing results for **{coin}**</span>
        </div>
        {/* End Coin Selector UI */}

        {loading && <div className="text-gray-500">Loading metrics…</div>}
        {error && <div className="text-red-500 mt-4">Error: {error}</div>}

        {!loading && !error && data && (
          <div className="space-y-8">
            {/* Sentiment Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Positive Metric */}
              <div className="p-4 rounded-lg border-2 border-[#d9ff2f]/50 bg-black/30 shadow-lg shadow-[#d9ff2f]/10">
                <div className="text-sm text-gray-400">Positive</div>
                <div className="text-3xl font-bold text-[#d9ff2f]">{pct(data.positive)}</div>
              </div>
              
              {/* Neutral Metric */}
              <div className="p-4 rounded-lg border-2 border-gray-600/50 bg-black/30 shadow-lg shadow-gray-600/10">
                <div className="text-sm text-gray-400">Neutral</div>
                <div className="text-3xl font-bold text-gray-400">{pct(data.neutral)}</div>
              </div>
              
              {/* Negative Metric */}
              <div className="p-4 rounded-lg border-2 border-[#ff522f]/50 bg-black/30 shadow-lg shadow-[#ff522f]/10">
                <div className="text-sm text-gray-400">Negative</div>
                <div className="text-3xl font-bold text-[#ff522f]">{pct(data.negative)}</div>
              </div>
              
              {/* Average Score Metric */}
              <div className="p-4 rounded-lg border-2 border-indigo-600/50 bg-black/30 shadow-lg shadow-indigo-600/10">
                <div className="text-sm text-gray-400">Avg sentiment score</div>
                {/* R3: Dynamically color the avg score */}
                <div className={`text-3xl font-bold ${getScoreColor(data.avg_score)}`}>
                  {data.avg_score != null ? Number(data.avg_score).toFixed(3) : "—"}
                </div>
              </div>
            </div>

            {/* Top Posts/Items Section */}
            <div className="p-4 sm:p-6 rounded-lg bg-black/40 border border-gray-800">
              <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 text-white">Top Posts / Items</h3>
              
              {Array.isArray(data.top_posts) && data.top_posts.length ? (
                // R4: Ensure list is readable on all screens
                <ul className="divide-y divide-gray-800">
                  {data.top_posts.map((p, i) => (
                    <li key={i} className="py-3">
                      <p className="mb-0.5 text-base font-medium">
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                            {p.title || p.text || p.url}
                          </a>
                        ) : (
                          <span className="text-gray-300">{p.title || p.text || "Untitled"}</span>
                        )}
                      </p>
                      {/* R5: Smaller text for metadata, uses orange/red for negative sentiment label */}
                      <div className="text-xs text-gray-500">
                        {p.created_at ? String(p.created_at).slice(0, 19) : ""} 
                        {p.sentiment_label ? (
                          <span 
                            className={`font-semibold ml-2 ${p.sentiment_label === 'Positive' ? 'text-[#d9ff2f]' : p.sentiment_label === 'Negative' ? 'text-[#ff522f]' : 'text-gray-400'}`}
                          >
                            — {p.sentiment_label}
                          </span>
                        ) : ""}
                      </div>
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
    </div>
  );
}