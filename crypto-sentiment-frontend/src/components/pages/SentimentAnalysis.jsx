// SentimentAnalysis.jsx
import React, { useEffect, useState } from "react";

import SearchFilter from "../SearchFilter";
import PopularSearches from "../PopularSearches";
import Heatmap from "../Heatmap";
import SentimentCard from "../sentiment_card";
import TrendChart from "../trend_chart";

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

// developer-provided uploaded file (local path)
const UPLOADED_SCREENSHOT = "/mnt/data/debf3a90-480b-4245-bf7c-e60e2d7754af.png";

export default function SentimentAnalysis() {
  const [overview, setOverview] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [timeframe, setTimeframe] = useState("day");
  const [error, setError] = useState(null);

  const fetchData = async (coin = selectedCoin, tf = timeframe) => {
    setLoadingOverview(true);
    setError(null);
    try {
      const [ov, tr] = await Promise.all([getOverview(coin), getTrends(coin, tf)]);
      setOverview(ov);
      setTrendData(tr || []);
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
      label:
        overview?.by_source?.twitter !== undefined && overview?.by_source?.twitter !== null
          ? `${getLabelByScore(overview.by_source.twitter, NEUTRAL_THRESHOLD)} ${(overview.by_source.twitter * 100).toFixed(1)}%`
          : "Neutral 0%",
      score: overview?.by_source?.twitter ?? 0,
    },
    {
      title: "Reddit Sentiment",
      sourceKey: "reddit",
      label:
        overview?.by_source?.reddit !== undefined && overview?.by_source?.reddit !== null
          ? `${getLabelByScore(overview.by_source.reddit, NEUTRAL_THRESHOLD)} ${(overview.by_source.reddit * 100).toFixed(1)}%`
          : "Neutral 0%",
      score: overview?.by_source?.reddit ?? 0,
    },
    {
      title: "News Sentiment",
      sourceKey: "news",
      label:
        overview?.by_source?.news !== undefined && overview?.by_source?.news !== null
          ? `${getLabelByScore(overview.by_source.news, NEUTRAL_THRESHOLD)} ${(overview.by_source.news * 100).toFixed(1)}%`
          : "Neutral 0%",
      score: overview?.by_source?.news ?? 0,
    },
    {
      title: "Overall Sentiment",
      sourceKey: "overall",
      label: overview?.overall
        ? `${getLabelByScore(overview.overall.score, NEUTRAL_THRESHOLD)} ${(overview.overall.score * 100).toFixed(1)}%`
        : "Neutral 0%",
      score: overview?.overall?.score ?? 0,
    },
  ];

  const handleTimeframeChange = (newTf) => setTimeframe(newTf);
  const handlePickPopular = (coinName) => {
    if (!coinName) return;
    const s = coinName.toUpperCase();
    setSelectedCoin(s);
  };

  return (
    <div className="flex flex-col gap-6 text-white p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sentiment Analysis</h1>
          <p className="text-xs text-gray-400 mt-1">Multi-source live feeds — scroll to load more</p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select value={selectedCoin} onChange={(e) => setSelectedCoin(e.target.value)} className="px-3 py-2 rounded-md text-sm bg-cp-bg border border-white/15 text-gray-100">
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="SOLANA">Solana (SOL)</option>
          </select>

          <button onClick={() => fetchData(selectedCoin, timeframe)} className="px-3 py-2 text-sm font-semibold rounded-md bg-cp-neon text-black">Refresh</button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingOverview ? (
          <div className="col-span-full text-center text-gray-400 text-sm py-4">Loading overview...</div>
        ) : (
          cards.map((c) => <SentimentCard key={c.sourceKey} title={c.title} label={c.label} score={c.score} sourceKey={c.sourceKey} coin={selectedCoin} />)
        )}
      </div>

      {/* Chart and lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-cp-panel/95 rounded-xl p-4 sm:p-6 shadow-lg border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Sentiment Trends — <span className="text-cp-neon">{selectedCoin}</span></h4>
              <div className="flex items-center gap-2">
                <button onClick={() => handleTimeframeChange("hour")} className={`px-2 py-1 rounded ${timeframe === "hour" ? "bg-cp-neon text-black" : "bg-cp-bg"}`}>Hour</button>
                <button onClick={() => handleTimeframeChange("day")} className={`px-2 py-1 rounded ${timeframe === "day" ? "bg-cp-neon text-black" : "bg-cp-bg"}`}>Day</button>
              </div>
            </div>

            <TrendChart data={trendData} coin={selectedCoin} onCoinChange={(c) => setSelectedCoin(c)} onTimeframeChange={handleTimeframeChange} height={320} />
          </div>

          {/* three panels side-by-side (responsive) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-cp-panel/95 rounded-xl p-4 shadow border border-white/5">
              <h5 className="font-semibold mb-3">Twitter</h5>
              <TwitterList coin={selectedCoin} pageSize={25} pageSizeIncrement={25} />
            </div>

            <div className="bg-cp-panel/95 rounded-xl p-4 shadow border border-white/5">
              <h5 className="font-semibold mb-3">Reddit</h5>
              <RedditList coin={selectedCoin} pageSize={25} pageSizeIncrement={25} />
            </div>

            <div className="bg-cp-panel/95 rounded-xl p-4 shadow border border-white/5">
              <h5 className="font-semibold mb-3">News</h5>
              <NewsList coin={selectedCoin} pageSize={25} pageSizeIncrement={25} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="bg-cp-panel/90 rounded p-4 border border-white/5">
            <SearchFilter onApply={() => {}} />
          </div>

          <div className="bg-cp-panel/90 rounded p-4 border border-white/5">
            <PopularSearches onPick={handlePickPopular} />
          </div>

          <div className="bg-cp-bg/80 rounded p-3 text-xs text-gray-300">
            Debug file: <code className="break-all">{UPLOADED_SCREENSHOT}</code>
          </div>
        </div>
      </div>

      <Heatmap initialDays={30} />

      {error && <div className="text-cp-magenta text-sm text-center mt-2">❌ {error}</div>}
    </div>
  );
}
