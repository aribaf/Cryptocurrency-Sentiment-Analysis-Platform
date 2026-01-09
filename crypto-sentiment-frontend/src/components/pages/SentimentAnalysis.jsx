// SentimentAnalysis.jsx
import React, { useEffect, useState } from "react";

import SearchFilter from "../SearchFilter";
import PopularSearches from "../PopularSearches";
import Heatmap from "../Heatmap";
import SentimentCard from "../sentiment_card";
import TrendChart from "../trend_chart";
import Chatbot from "../chatbot/Chatbot";

import TwitterList from "../TwitterList";
import RedditList from "../RedditList";
import NewsList from "../NewsList";

import { getOverview, getTrends } from "../../api/api";

const NEUTRAL_THRESHOLD = 0.05;
const getLabelByScore = (score, threshold) => {
  if (score > threshold) return "Positive";
  if (score < -threshold) return "Negative";
  return "Neutral";
};
// -----------------------------
// Realistic Neutral Defaults (Preloaded UI)
// -----------------------------
const DEFAULT_OVERVIEW = {
  overall: {
    score: 0.02,
  },
  by_source: {
    twitter: 0.01,
    reddit: -0.01,
    news: 0.02,
  },
};

const DEFAULT_TREND = [
  { time: "T-4", sentiment: 0.01 },
  { time: "T-3", sentiment: 0.015 },
  { time: "T-2", sentiment: 0.012 },
  { time: "T-1", sentiment: 0.018 },
  { time: "Now", sentiment: 0.02 },
];

// developer-provided uploaded file (local path)
const UPLOADED_SCREENSHOT = "/mnt/data/debf3a90-480b-4245-bf7c-e60e2d7754af.png";

export default function SentimentAnalysis() {
  const [overview, setOverview] = useState(DEFAULT_OVERVIEW);
  const [trendData, setTrendData] = useState(DEFAULT_TREND);
  const [loadingOverview, setLoadingOverview] = useState(false);

  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [timeframe, setTimeframe] = useState("day");
  const [error, setError] = useState(null);

  const fetchData = async (coin = selectedCoin, tf = timeframe) => {
    setLoadingOverview(true);
    setError(null);
    try {
      const [ov, tr] = await Promise.all([
        getOverview(coin),
        getTrends(coin, tf),
      ]);
      setOverview(ov || DEFAULT_OVERVIEW);
      setTrendData(tr?.length ? tr : DEFAULT_TREND);

    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchData(selectedCoin, timeframe);
  }, [selectedCoin, timeframe]);

  const cards = [
  {
    title: "Twitter Sentiment",
    sourceKey: "twitter",
    score: overview.by_source.twitter,
    label: `${getLabelByScore(
      overview.by_source.twitter,
      NEUTRAL_THRESHOLD
    )} ${(overview.by_source.twitter * 100).toFixed(1)}%`,
  },
  {
    title: "Reddit Sentiment",
    sourceKey: "reddit",
    score: overview.by_source.reddit,
    label: `${getLabelByScore(
      overview.by_source.reddit,
      NEUTRAL_THRESHOLD
    )} ${(overview.by_source.reddit * 100).toFixed(1)}%`,
  },
  {
    title: "News Sentiment",
    sourceKey: "news",
    score: overview.by_source.news,
    label: `${getLabelByScore(
      overview.by_source.news,
      NEUTRAL_THRESHOLD
    )} ${(overview.by_source.news * 100).toFixed(1)}%`,
  },
  {
    title: "Overall Sentiment",
    sourceKey: "overall",
    score: overview.overall.score,
    label: `${getLabelByScore(
      overview.overall.score,
      NEUTRAL_THRESHOLD
    )} ${(overview.overall.score * 100).toFixed(1)}%`,
  },
];


  const handleTimeframeChange = (newTf) => setTimeframe(newTf);
  const handlePickPopular = (coinName) => {
    if (!coinName) return;
    const s = coinName.toUpperCase();
    setSelectedCoin(s);
  };

  return (
    <div className="text-white max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Sentiment Analysis
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Multi-source live feeds — filter by coin and timeframe to explore
            trends.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value)}
            className="px-3 py-2 rounded-md text-sm bg-cp-bg border border-white/15 text-gray-100"
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="SOLANA">Solana (SOL)</option>
          </select>

          <button
            onClick={() => fetchData(selectedCoin, timeframe)}
            className="px-3 py-2 text-sm font-semibold rounded-md bg-cp-neon text-black hover:brightness-110 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {cards.map((c) => (
            <SentimentCard
              key={c.sourceKey}
              title={c.title}
              label={c.label}
              score={c.score}
              sourceKey={c.sourceKey}
              coin={selectedCoin}
            />
          ))}

      </div>

      {/* Chart and lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side: trends + lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trend chart */}
          <div className="bg-cp-panel/95 rounded-xl p-4 sm:p-6 shadow-lg border border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h4 className="text-base sm:text-lg font-semibold">
                Sentiment Trends —{" "}
                <span className="text-cp-neon">{selectedCoin}</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTimeframeChange("hour")}
                  className={`px-2 py-1 rounded text-xs sm:text-sm ${
                    timeframe === "hour"
                      ? "bg-cp-neon text-black"
                      : "bg-cp-bg text-gray-200"
                  }`}
                >
                  Hour
                </button>
                <button
                  onClick={() => handleTimeframeChange("day")}
                  className={`px-2 py-1 rounded text-xs sm:text-sm ${
                    timeframe === "day"
                      ? "bg-cp-neon text-black"
                      : "bg-cp-bg text-gray-200"
                  }`}
                >
                  Day
                </button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <div className="min-w-[280px]">
                <TrendChart
                  data={trendData}
                  coin={selectedCoin}
                  onCoinChange={(c) => setSelectedCoin(c)}
                  onTimeframeChange={handleTimeframeChange}
                  height={320}
                />
              </div>
            </div>
          </div>

          {/* three panels side-by-side (responsive) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-cp-panel/95 rounded-xl p-4 shadow border border-white/5 flex flex-col">
              <h5 className="font-semibold mb-3 text-sm sm:text-base">
                Twitter
              </h5>
              <div className="flex-1 min-h-[180px] overflow-y-auto">
                <TwitterList
                  coin={selectedCoin}
                  pageSize={25}
                  pageSizeIncrement={25}
                />
              </div>
            </div>

            <div className="bg-cp-panel/95 rounded-xl p-4 shadow border border-white/5 flex flex-col">
              <h5 className="font-semibold mb-3 text-sm sm:text-base">
                Reddit
              </h5>
              <div className="flex-1 min-h-[180px] overflow-y-auto">
                <RedditList
                  coin={selectedCoin}
                  pageSize={25}
                  pageSizeIncrement={25}
                />
              </div>
            </div>

            <div className="bg-cp-panel/95 rounded-xl p-4 shadow border border-white/5 flex flex-col">
              <h5 className="font-semibold mb-3 text-sm sm:text-base">
                News
              </h5>
              <div className="flex-1 min-h-[180px] overflow-y-auto">
                <NewsList
                  coin={selectedCoin}
                  pageSize={25}
                  pageSizeIncrement={25}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:space-y-5">
          <div className="bg-cp-panel/90 rounded-xl p-4 sm:p-5 border border-white/5">
            <h3 className="text-sm sm:text-base font-semibold mb-3">
              Search & Filters
            </h3>
            <SearchFilter onApply={() => {}} />
          </div>

          

          
        </div>
      </div>

      {/* Heatmap section */}
      <div className="bg-cp-panel/95 rounded-xl p-4 sm:p-6 border border-white/5">
        <h3 className="text-sm sm:text-base font-semibold mb-3">
          Historical Sentiment Heatmap
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Distribution of positive, neutral and negative posts over the last
          days for monitored coins.
        </p>
        <Heatmap initialDays={30} />
      </div>

      {error && (
        <div className="text-cp-magenta text-sm text-center mt-2">
          ❌ {error}
        </div>
      )}
      <Chatbot
  coin={selectedCoin}
  sentiment={overview}
  timeframe={timeframe}
/>

    </div>
    
  );
}
