import React, { useEffect, useState } from "react";

// local components
import SearchFilter from "../SearchFilter";
import PopularSearches from "../PopularSearches";
import Heatmap from "../Heatmap";
import SentimentCard from "../sentiment_card";
import TrendChart from "../trend_chart";
import RecentList from "../recent_list";

// API client
import { getOverview, getTrends } from "../../api/api";

// Define the threshold (consistent with Dashboard)
const NEUTRAL_THRESHOLD = 0.05;

// Helper function to determine the label based on score and threshold
const getLabelByScore = (score, threshold) => {
  if (score > threshold) return "Positive";
  if (score < -threshold) return "Negative";
  return "Neutral";
};


export default function SentimentAnalysis() {
  const [overview, setOverview] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  
  // ⭐️ NEW STATE: To control the trend granularity ('day' or 'hour')
  const [timeframe, setTimeframe] = useState("day"); 
  
  const [error, setError] = useState(null);

  // map human coin name -> ticker
  const mapNameToTicker = (name) => {
    if (!name) return null;
    const s = name.toLowerCase();
    if (s.includes("bitcoin") || s === "btc") return "BTC";
    if (s.includes("ethereum") || s === "eth") return "ETH";
    if (s.includes("solana") || s === "sol") return "SOLANA";
    if (name.length <= 5) return name.toUpperCase();
    return name.toUpperCase();
  };

  // fetch overview + trends
  // ⭐️ MODIFIED: Now accepts the trend unit (timeframe) ⭐️
  const fetchData = async (coin = selectedCoin, currentUnit = timeframe) => {
    setLoading(true);
    setError(null);
    
    // Ensure coin is a string before API call
    const coinSymbol = coin || 'BTC'; 

    try {
      const [overviewRes, trendRes] = await Promise.all([
        getOverview(coinSymbol), 
        // ⭐️ Pass the current unit to getTrends ⭐️
        getTrends(coinSymbol, currentUnit),
      ]);

      setOverview(overviewRes);
      setTrendData(trendRes || []);
    } catch (err) {
      setError(err.message || String(err) || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };
  
  // ⭐️ NEW HANDLER: Called by TrendChart when the user toggles the timeframe ⭐️
  const handleTimeframeChange = (newTimeframe) => {
    // Update state, which triggers the useEffect hook below
    setTimeframe(newTimeframe);
  };

  useEffect(() => {
    // The API call now uses both selectedCoin and timeframe
    fetchData(selectedCoin, timeframe);
    // ⭐️ MODIFIED DEPENDENCY: Refetch data whenever the coin OR timeframe changes
  }, [selectedCoin, timeframe]); 

  // cards
  const cards = [
    {
      title: "Twitter Sentiment",
      sourceKey: "twitter",
      label: overview?.by_source?.twitter !== undefined && overview?.by_source?.twitter !== null
        ? `${getLabelByScore(
            overview.by_source.twitter,
            NEUTRAL_THRESHOLD
          )} ${(overview.by_source.twitter * 100).toFixed(1)}%`
        : "Neutral 0%",
      score: overview?.by_source?.twitter ?? 0,
    },
    {
      title: "Reddit Sentiment",
      sourceKey: "reddit",
      label: overview?.by_source?.reddit !== undefined && overview?.by_source?.reddit !== null
        ? `${getLabelByScore(
            overview.by_source.reddit,
            NEUTRAL_THRESHOLD
          )} ${(overview.by_source.reddit * 100).toFixed(1)}%`
        : "Neutral 0%",
      score: overview?.by_source?.reddit ?? 0,
    },
    {
      title: "News Sentiment",
      sourceKey: "news",
      label: overview?.by_source?.news !== undefined && overview?.by_source?.news !== null
        ? `${getLabelByScore(
            overview.by_source.news,
            NEUTRAL_THRESHOLD
          )} ${(overview.by_source.news * 100).toFixed(1)}%`
        : "Neutral 0%",
      score: overview?.by_source?.news ?? 0,
    },
    {
      title: "Overall Sentiment",
      sourceKey: "overall",
      label: overview?.overall
        ? `${getLabelByScore(
            overview.overall.score,
            NEUTRAL_THRESHOLD
          )} ${(overview.overall.score * 100).toFixed(1)}%`
        : "Neutral 0%",
      score: overview?.overall?.score ?? 0,
    },
  ];

  // SearchFilter -> Apply
  const handleApplyFilters = (filters) => {
    if (filters?.q) {
      const mapped = mapNameToTicker(filters.q);
      if (mapped) {
        setSelectedCoin(mapped);
        return; 
      }
    }
    // Manually call fetchData if non-coin filters are applied
    fetchData(selectedCoin, timeframe); 
  };

  // PopularSearches pill click
  const handlePickPopular = (coinName) => {
    const mapped = mapNameToTicker(coinName);
    if (mapped) {
      setSelectedCoin(mapped);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-white p-4 sm:p-6 lg:p-8">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Sentiment Analysis
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Multi-source sentiment signals for major cryptocurrencies
          </p>
        </div>

        {/* Adjusted buttons/select for better wrapping on small screens */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value)}
            className="
              px-3 py-2 text-sm rounded-md
              bg-cp-bg border border-white/15 text-gray-100
              focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
            "
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="SOLANA">Solana (SOL)</option>
          </select>
          <button
            onClick={() => fetchData(selectedCoin, timeframe)}
            className="
              px-3 py-2 text-sm font-semibold rounded-md
              bg-cp-neon text-black
              hover:bg-cp-neon/90
              shadow-[0_0_14px_rgba(217,255,47,0.4)]
              transition-colors
            "
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ===== Cards ===== */}
      {/* Ensures 1 col on XS, 2 on SM, and 4 on LG+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-full text-center text-gray-400 text-sm py-4">
            Loading data...
          </div>
        ) : (
          cards.map((c) => (
            <SentimentCard
              key={c.sourceKey}
              title={c.title}
              label={c.label}
              score={c.score}
              sourceKey={c.sourceKey}
              coin={selectedCoin} 
            />
          ))
        )}
      </div>

      {/* ===== Main grid: chart + sidebar ===== */}
      {/* Sidebar moves to the bottom on non-LG screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: chart + recent list - Takes up 2/3 on LG+ */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-cp-panel/95 rounded-xl p-4 sm:p-6 shadow-lg border border-white/5 min-h-[260px]">
            <h4 className="text-lg font-semibold mb-4">
              Sentiment Trends —{" "}
              <span className="text-cp-neon">{selectedCoin}</span>
            </h4>

            {loading ? (
              <div className="h-60 flex items-center justify-center text-sm text-gray-400">
                Loading chart...
              </div>
            ) : (
              <TrendChart
                data={trendData}
                coin={selectedCoin}
                onCoinChange={(coin) => setSelectedCoin(coin)}
                // ⭐️ Pass the new handler to TrendChart ⭐️
                onTimeframeChange={handleTimeframeChange}
                height={320}
              />
            )}
          </div>

          {/* RecentList uses selectedCoin for its internal fetch */}
          <RecentList
            coin={selectedCoin}
            limit={20}
          />
        </div>

        {/* Right column: filters + popular - Takes up 1/3 on LG+ */}
        <div className="lg:col-span-1 space-y-4">
          <SearchFilter onApply={handleApplyFilters} />
          <PopularSearches onPick={handlePickPopular} />
        </div>
      </div>

      {/* Heatmap (full width) */}
      <Heatmap initialDays={30} />

      {/* Error */}
      {error && (
        <div className="text-cp-magenta text-sm text-center mt-2">
          ❌ {error}
        </div>
      )}
    </div>
  );
}