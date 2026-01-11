// src/components/Dashboard.jsx

import React, { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import { getOverview, getTrends } from "../../api/api";
import RecentList from "../recent_list";
import SentimentCard from "../sentiment_card";
import TrendChart from "../trend_chart";
import DonutChart from "../donut_chart";
import TransactionsPreview from "../TransactionsPreview";
import TrendRealtime from "../trend/TrendRealTime";
import Chatbot from "../chatbot/Chatbot";
import TradingChart from "../charts/TradingChart";
const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8000") + "/api"; // FastAPI base (from Swagger)
// -----------------------------
// Analytics Helpers (Enhancements)
// -----------------------------
const calculateCorrelation = (x, y) => {
  if (!x.length || x.length !== y.length) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / x.length;
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;

  let num = 0,
    denX = 0,
    denY = 0;

  for (let i = 0; i < x.length; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    denX += Math.pow(x[i] - meanX, 2);
    denY += Math.pow(y[i] - meanY, 2);
  }

  return denX && denY ? num / Math.sqrt(denX * denY) : 0;
};

const getRiskLevel = (values) => {
  const volatility = Math.max(...values) - Math.min(...values);
  if (volatility > 0.4) return "High";
  if (volatility > 0.2) return "Moderate";
  return "Low";
};

// -----------------------------
// CoinSentimentComparison component
// -----------------------------
const COLORS = {
  BTC: "#10b981", // green
  ETH: "#60a5fa", // blue-ish
  SOLANA: "#f59e0b", // amber
};
// -----------------------------
// Realistic Neutral Default Values (Preloaded UI)
// -----------------------------
const DEFAULT_OVERVIEW = {
  overall: {
    score: 0.02,
    label: "Neutral",
  },
  by_source: {
    twitter: 0.01,
    reddit: -0.01,
    news: 0.02,
  },
  sentiment_counts: {
    positive: 34,
    neutral: 42,
    negative: 24,
  },
};

const DEFAULT_TREND = [
  { time: "T-4", sentiment: 0.01 },
  { time: "T-3", sentiment: 0.015 },
  { time: "T-2", sentiment: 0.012 },
  { time: "T-1", sentiment: 0.018 },
  { time: "Now", sentiment: 0.02 },
];

// -----------------------------
// Generate Realistic Trend Data by Coin, Source, and Timeframe
// -----------------------------
const generateTrendData = (coin, timeframe) => {
  const now = new Date();
  let dataPoints = [];
  let timeUnit = "";
  let steps = 0;

  // Determine data points based on timeframe
  switch (timeframe) {
    case "Hour":
      steps = 12; // 12 points (5-min intervals)
      timeUnit = "minute";
      break;
    case "Day":
      steps = 24; // 24 hours
      timeUnit = "hour";
      break;
    case "Week":
      steps = 7; // 7 days
      timeUnit = "day";
      break;
    case "30D":
      steps = 30; // 30 days
      timeUnit = "day";
      break;
    default:
      steps = 24;
      timeUnit = "hour";
  }

  // Base sentiment values for each coin (determines overall trend direction)
  const coinBase = {
    BTC: { twitter: 0.26, reddit: 0.61, news: -0.003, overall: 0.29 },
    ETH: { twitter: 0.19, reddit: 0.45, news: 0.08, overall: 0.22 },
    SOLANA: { twitter: 0.15, reddit: 0.38, news: 0.06, overall: 0.18 },
  };

  const base = coinBase[coin] || coinBase.BTC;

  // Generate time series with realistic variations
  for (let i = steps - 1; i >= 0; i--) {
    let time = new Date(now);
    let label = "";

    switch (timeUnit) {
      case "minute":
        time.setMinutes(time.getMinutes() - i * 5);
        label = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        break;
      case "hour":
        time.setHours(time.getHours() - i);
        label = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        break;
      case "day":
        time.setDate(time.getDate() - i);
        label = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        break;
    }

    // Add realistic variations (±15% from base)
    const variation = 0.15;
    const twitterNoise = (Math.random() - 0.5) * variation;
    const redditNoise = (Math.random() - 0.5) * variation;
    const newsNoise = (Math.random() - 0.5) * variation * 0.5; // News is more stable
    
    // Create gradual trend (small upward or downward movement)
    const trendFactor = (steps - i) / steps * 0.05; // 5% max trend
    
    dataPoints.push({
      time_bucket: time.toISOString(),
      time: label,
      twitter: Math.max(-1, Math.min(1, base.twitter + twitterNoise + trendFactor)),
      reddit: Math.max(-1, Math.min(1, base.reddit + redditNoise + trendFactor * 0.8)),
      news: Math.max(-1, Math.min(1, base.news + newsNoise + trendFactor * 0.6)),
      overall: Math.max(-1, Math.min(1, base.overall + (twitterNoise + redditNoise + newsNoise) / 3 + trendFactor)),
      mean_sentiment_score: Math.max(-1, Math.min(1, base.overall + (twitterNoise + redditNoise + newsNoise) / 3 + trendFactor)),
    });
  }

  return dataPoints;
};

const DEFAULT_COMPARISON = [
  { coin: "BTC", overall: 0.02, twitter: 0.01, reddit: 0.0, news: 0.02 },
  { coin: "ETH", overall: 0.018, twitter: 0.01, reddit: -0.005, news: 0.015 },
  { coin: "SOLANA", overall: 0.015, twitter: 0.008, reddit: 0.0, news: 0.012 },
];

// -----------------------------
// Coin-Specific Mock Data (Realistic Values)
// -----------------------------
const COIN_MOCK_DATA = {
  BTC: {
    overall: {
      score: 0.29,
      label: "Positive",
    },
    by_source: {
      twitter: 0.26,
      reddit: 0.61,
      news: -0.003,
    },
    sentiment_counts: {
      positive: 142,
      neutral: 85,
      negative: 43,
    },
  },
  ETH: {
    overall: {
      score: 0.22,
      label: "Positive",
    },
    by_source: {
      twitter: 0.19,
      reddit: 0.45,
      news: 0.08,
    },
    sentiment_counts: {
      positive: 118,
      neutral: 95,
      negative: 47,
    },
  },
  SOLANA: {
    overall: {
      score: 0.18,
      label: "Positive",
    },
    by_source: {
      twitter: 0.15,
      reddit: 0.38,
      news: 0.06,
    },
    sentiment_counts: {
      positive: 95,
      neutral: 102,
      negative: 53,
    },
  },
};

/**
 * CoinSentimentComparison
 * Props:
 * - data: [{ coin: 'BTC', overall: 0.1, twitter: 0.05, reddit: 0.02, news: 0.03 }, ...]
 * - onCoinClick?: function(coinKey: 'BTC' | 'ETH' | 'SOLANA')
 */
function CoinSentimentComparison({ data = [], onCoinClick }) {
  const sources = ["overall", "twitter", "reddit", "news"];

  const series = sources.map((src) => {
    const row = { source: src };
    data.forEach((coinObj) => {
      const coinKey = (coinObj.coin || "").toUpperCase();
      row[coinKey] = Number(
        coinObj[src] ??
          coinObj[`by_source_${src}`] ??
          (coinObj.by_source && coinObj.by_source[src]) ??
          0
      );
    });
    return row;
  });

  const totalPoints = series.reduce((acc, r) => {
    return (
      acc +
      Object.keys(r).reduce(
        (s, k) => (k === "source" ? s : s + Math.abs(Number(r[k] || 0))),
        0
      )
    );
  }, 0);

  if (!data || data.length === 0 || totalPoints === 0) {
    return (
      <div className="bg-cp-panel rounded-xl p-4 border border-white/5 h-48 flex items-center justify-center text-gray-400">
        No comparison data available.
      </div>
    );
  }

  const coinKeys = data.map((d) => (d.coin || "").toUpperCase());

  return (
    <div className="bg-cp-panel rounded-xl p-4 sm:p-5 lg:p-6 border border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
        <div>
          <h4 className="text-base sm:text-lg font-semibold">
            Coin Sentiment Comparison
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            Overall vs per-source sentiment for BTC, ETH and SOLANA.
          </p>
        </div>

        {/* Optional chip buttons to jump tabs from here */}
        {onCoinClick && (
          <div className="flex flex-wrap gap-1">
            {coinKeys.map((ck) => (
              <button
                key={ck}
                onClick={() => onCoinClick(ck)}
                className="px-3 py-1 text-xs rounded-full border border-white/15 bg-black/30 text-gray-200 hover:border-cp-neon hover:text-cp-neon transition-colors"
              >
                {ck}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart wrapper for small screens */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[280px]" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
              <XAxis
                dataKey="source"
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(v) => (v * 100).toFixed(0) + "%"}
                tick={{ fill: "#9CA3AF" }}
              />
              <Tooltip
                formatter={(value) => (Number(value) * 100).toFixed(2) + "%"}
              />
              <Legend wrapperStyle={{ color: "#9CA3AF" }} />
              {data.map((coinObj) => {
                const coinKey = (coinObj.coin || "").toUpperCase();
                const color = COLORS[coinKey] || "#c084fc";
                return (
                  <Line
                    key={coinKey}
                    type="monotone"
                    dataKey={coinKey}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Dashboard component
// -----------------------------

// Define the threshold (consistent with backend: +/- 0.05)
const NEUTRAL_THRESHOLD = 0.05;

// Helper function to determine the label based on score and threshold
const getLabelByScore = (score, threshold) => {
  if (score > threshold) return "Positive";
  if (score < -threshold) return "Negative";
  return "Neutral";
};

// dummy KPIs in case you want them later
const DUMMY_KPIS = {
  volume: "$124.5B",
  volume_change: "+5.2%",
  fear_greed_score: 68,
  fear_greed_label: "Greed",
  btc_dominance: "52.4%",
};

const TabButton = ({ coin, currentCoin, setCoin }) => (
  <button
    onClick={() => setCoin(coin)}
    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors border ${
      currentCoin === coin
        ? "bg-cp-neon text-black border-cp-neon shadow-md"
        : "bg-cp-panel text-gray-300 border-white/10 hover:bg-cp-panel/80"
    }`}
  >
    {coin}
  </button>
);

const TimeframeButton = ({ unit, currentTime, setTime }) => (
  <button
    onClick={() => setTime(unit)}
    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors border ${
      currentTime === unit
        ? "bg-cp-neon text-black border-cp-neon"
        : "bg-cp-panel text-gray-300 border-white/10 hover:bg-cp-panel/80"
    }`}
  >
    {unit}
  </button>
);

const getUnit = (timeframe) => {
  if (timeframe === "Hour") return "hour";
  if (timeframe === "Day" || timeframe === "7D" || timeframe === "30D")
    return "day";
  if (timeframe === "Week" || timeframe === "90D") return "week";
  return "day";
};

// Map tab labels → coin tickers your API understands
const coinMap = {
  Overview: "BTC", // or "ALL" if your backend supports it
  Bitcoin: "BTC",
  Ethereum: "ETH",
  Solana: "SOLANA",
};
const tradingViewSymbolMap = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOLANA: "SOLUSDT",
};


export default function Dashboard() {
  const [overview, setOverview] = useState(DEFAULT_OVERVIEW);
  const [trend, setTrend] = useState(DEFAULT_TREND);
  const [comparisonData, setComparisonData] = useState(DEFAULT_COMPARISON);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [activeCoinTab, setActiveCoinTab] = useState("Overview");
  const [timeframe, setTimeframe] = useState("Day");
  const [showExportModal, setShowExportModal] = useState(false);

  // picked coin for this tab
  const selectedCoin = coinMap[activeCoinTab] || "BTC";
  const tradingSymbol =
  tradingViewSymbolMap[selectedCoin] || "BTCUSDT";
  // simple CSV downloader – ALWAYS hits FastAPI on :8000, never Vite
  const downloadCsv = async (route) => {
    const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
    const href = `${API_BASE}${normalizedRoute}`; // e.g. http://localhost:8000/api/download/twitter.csv

    console.log("Downloading CSV from:", href); // optional debug

    try {
      const response = await fetch(href, {
  credentials: "include",
});


      if (!response.ok) {
        const text = await response.text();
        alert(`Download failed (${response.status}): ${text.slice(0, 120)}`);
        return;
      }

      const disposition = response.headers.get("Content-Disposition");
      let filename = "export.csv";
      if (disposition && disposition.includes("filename")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("An unexpected error occurred during download.");
    }
  };

  // --- Fetch Dashboard Data ---
  const fetchDashboardData = useCallback(() => {
    const coinSymbol = selectedCoin;
    const trendUnit = getUnit(timeframe);

    // Use coin-specific mock data instead of API calls
    const mockData = COIN_MOCK_DATA[coinSymbol] || COIN_MOCK_DATA.BTC;
    
    // Set the overview with coin-specific fake data
    setOverview(mockData);
    
    // Generate realistic trend data for this coin and timeframe
    const trendData = generateTrendData(coinSymbol, timeframe);
    setTrend(trendData);
    
    setLoading(false);

    // Comparison chart uses mock data for all coins
    const comparisonMockData = [
      {
        coin: "BTC",
        overall: COIN_MOCK_DATA.BTC.overall.score,
        twitter: COIN_MOCK_DATA.BTC.by_source.twitter,
        reddit: COIN_MOCK_DATA.BTC.by_source.reddit,
        news: COIN_MOCK_DATA.BTC.by_source.news,
      },
      {
        coin: "ETH",
        overall: COIN_MOCK_DATA.ETH.overall.score,
        twitter: COIN_MOCK_DATA.ETH.by_source.twitter,
        reddit: COIN_MOCK_DATA.ETH.by_source.reddit,
        news: COIN_MOCK_DATA.ETH.by_source.news,
      },
      {
        coin: "SOLANA",
        overall: COIN_MOCK_DATA.SOLANA.overall.score,
        twitter: COIN_MOCK_DATA.SOLANA.by_source.twitter,
        reddit: COIN_MOCK_DATA.SOLANA.by_source.reddit,
        news: COIN_MOCK_DATA.SOLANA.by_source.news,
      },
    ];
    setComparisonData(comparisonMockData);
  }, [selectedCoin, timeframe]);

  useEffect(() => {
    fetchDashboardData();
    // No polling needed for mock data
  }, [fetchDashboardData]);

  // --- Card data from overview ---
  const sourceCards = [
    {
      title: "Overall Sentiment",
      sourceKey: "overall",
      score: overview?.overall?.score ?? overview?.overall_score ?? 0,
      label: overview?.overall
        ? `${overview.overall.label} ${(overview.overall.score * 100).toFixed(
            1
          )}%`
        : "Neutral 0%",
    },
    {
      title: "Twitter Sentiment",
      sourceKey: "twitter",
      score: overview?.by_source?.twitter ?? overview?.bySource?.twitter ?? 0,
      label:
        (overview?.by_source?.twitter ?? overview?.bySource?.twitter ?? 0) !==
        undefined
          ? `${getLabelByScore(
              overview?.by_source?.twitter ?? overview?.bySource?.twitter ?? 0,
              NEUTRAL_THRESHOLD
            )} ${(
              (overview?.by_source?.twitter ??
                overview?.bySource?.twitter ??
                0) * 100
            ).toFixed(1)}%`
          : "Neutral 0%",
    },
    {
      title: "Reddit Sentiment",
      sourceKey: "reddit",
      score: overview?.by_source?.reddit ?? overview?.bySource?.reddit ?? 0,
      label:
        (overview?.by_source?.reddit ?? overview?.bySource?.reddit ?? 0) !==
        undefined
          ? `${getLabelByScore(
              overview?.by_source?.reddit ?? overview?.bySource?.reddit ?? 0,
              NEUTRAL_THRESHOLD
            )} ${(
              (overview?.by_source?.reddit ??
                overview?.bySource?.reddit ??
                0) * 100
            ).toFixed(1)}%`
          : "Neutral 0%",
    },
    {
      title: "News Sentiment",
      sourceKey: "news",
      score: overview?.by_source?.news ?? overview?.bySource?.news ?? 0,
      label:
        (overview?.by_source?.news ?? overview?.bySource?.news ?? 0) !==
        undefined
          ? `${getLabelByScore(
              overview?.by_source?.news ?? overview?.bySource?.news ?? 0,
              NEUTRAL_THRESHOLD
            )} ${(
              (overview?.by_source?.news ??
                overview?.bySource?.news ??
                0) * 100
            ).toFixed(1)}%`
          : "Neutral 0%",
    },
  ];

  const donutData = {
    positive:
      overview?.sentiment_counts?.positive_count ??
      overview?.sentiment_counts?.positive ??
      0,
    neutral:
      overview?.sentiment_counts?.neutral_count ??
      overview?.sentiment_counts?.neutral ??
      0,
    negative:
      overview?.sentiment_counts?.negative_count ??
      overview?.sentiment_counts?.negative ??
      0,
  };

  const trendTitle =
    activeCoinTab === "Overview"
      ? "Sentiment Trends (BTC)"
      : `Sentiment Trends (${activeCoinTab})`;

  // -----------------------------
// Enhancement Metrics
// -----------------------------
const sentimentSeries = trend.map((t) => t.sentiment);

// placeholder price series (acceptable for FYP)
// later you can replace with real OHLC values
const priceSeries = sentimentSeries.map((_, i) => i + 1);

const correlation = calculateCorrelation(sentimentSeries, priceSeries);
const riskLevel = getRiskLevel(sentimentSeries);

const correlationLabel =
  correlation > 0.6
    ? "Strong"
    : correlation > 0.3
    ? "Moderate"
    : "Weak";
    
  return (
    <div className="font-sans text-white max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Overview of multi-source sentiment, trends and market activity.
          </p>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="text-xs sm:text-sm px-3 py-2 rounded-lg border border-white/10 bg-cp-panel hover:bg-cp-panel/80 transition-colors"
        >
          Export Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 border-b border-white/10 pb-3 sm:pb-4">
        <TabButton
          coin="Overview"
          currentCoin={activeCoinTab}
          setCoin={setActiveCoinTab}
        />
        <TabButton
          coin="Bitcoin"
          currentCoin={activeCoinTab}
          setCoin={setActiveCoinTab}
        />
        <TabButton
          coin="Ethereum"
          currentCoin={activeCoinTab}
          setCoin={setActiveCoinTab}
        />
        <TabButton
          coin="Solana"
          currentCoin={activeCoinTab}
          setCoin={setActiveCoinTab}
        />
      </div>

      {/* Sentiment cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 lg:mb-8">
        {sourceCards.map((c) => (
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

      {/* Comparison chart */}
      

      {/* Main layout */}
      {/* Main layout */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
  
  {/* LEFT COLUMN (2/3 width) */}
  <div className="lg:col-span-2 space-y-4 lg:space-y-6">

    {/* TradingView Chart */}
    <div className="bg-cp-panel rounded-xl p-4 sm:p-6 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base sm:text-lg font-semibold">
          Live Market Chart — {selectedCoin}
        </h4>
        
      </div>

      <TradingChart symbol={tradingSymbol} />
    </div>

    {/* Sentiment Trend Chart */}
    <div className="bg-cp-panel rounded-xl p-4 sm:p-6 shadow-lg border border-white/5">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
        <h4 className="text-base sm:text-lg font-semibold">
          {trendTitle} — {timeframe}
        </h4>
        <div className="flex flex-wrap gap-2">
          <TimeframeButton unit="Hour" currentTime={timeframe} setTime={setTimeframe} />
          <TimeframeButton unit="Day" currentTime={timeframe} setTime={setTimeframe} />
          <TimeframeButton unit="Week" currentTime={timeframe} setTime={setTimeframe} />
          <TimeframeButton unit="30D" currentTime={timeframe} setTime={setTimeframe} />
        </div>
      </div>

      <TrendChart
        data={trend}
        height={300}
        coin={selectedCoin}
        isPlaceholder={loading}
      />
    </div>

    {/* Transactions */}
    <TransactionsPreview coin={selectedCoin} />

    {/* Live Predictions */}
    <TrendRealtime />
  </div>

  {/* RIGHT COLUMN (1/3 width) */}
  <div className="lg:col-span-1 space-y-4 lg:space-y-6">
    <div className="bg-cp-panel rounded-xl p-4 sm:p-6 border border-white/5">
      <DonutChart
        positive={donutData.positive}
        neutral={donutData.neutral}
        negative={donutData.negative}
      />
    </div>

    <div className="bg-cp-panel rounded-xl p-4 sm:p-6 border border-white/5">
      <RecentList coin={selectedCoin} limit={20} />
    </div>
  </div>

</div>


      {/* Export modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowExportModal(false)}
          />

          {/* modal content */}
          <div className="relative z-50 w-full max-w-lg mx-4 bg-cp-panel border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Export Data</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Download CSV snapshots generated from your MongoDB data.
            </p>

            <div className="space-y-4 text-sm">
              {/* Sentiment source exports */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                <div className="font-semibold text-white mb-2">
                  Sentiment Source CSVs
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Export cleaned sentiment data from Twitter, Reddit and News.
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadCsv("/download/twitter.csv")}
                    className="px-3 py-2 rounded-lg bg-cp-panel border border-white/15 text-xs font-semibold hover:border-cp-neon hover:text-cp-neon transition"
                  >
                    Twitter Sentiment
                  </button>
                  <button
                    onClick={() => downloadCsv("/download/reddit.csv")}
                    className="px-3 py-2 rounded-lg bg-cp-panel border border-white/15 text-xs font-semibold hover:border-cp-neon hover:text-cp-neon transition"
                  >
                    Reddit Sentiment
                  </button>
                  <button
                    onClick={() => downloadCsv("/download/news.csv")}
                    className="px-3 py-2 rounded-lg bg-cp-panel border border-white/15 text-xs font-semibold hover:border-cp-neon hover:text-cp-neon transition"
                  >
                    News Sentiment
                  </button>
                </div>
              </div>

              {/* All trend predictions (single CSV from backend) */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">
                    All Trend Predictions (CSV)
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Pre-generated trend prediction file including all tracked
                    coins, accuracy and signal fields.
                  </div>
                </div>
                <button
                  onClick={() => downloadCsv("/trends/download/csv")}
                  className="px-4 py-2 rounded-lg bg-cp-neon text-black text-xs font-semibold hover:brightness-110 transition"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* Explain Market Button */}
{!isChatOpen && (
  <div className="hidden md:block fixed bottom-6 right-20 z-[9000]">
    <button
      onClick={() => setIsChatOpen(true)}
      className="bg-cp-neon px-4 py-2 rounded-lg font-semibold text-black hover:brightness-110 transition"
    >
      Explain Today's Market
    </button>
  </div>
)}
{/* Floating AI Assistant Button */}
<button
  onClick={() => setIsChatOpen(true)}
  className="fixed bottom-24 md:bottom-6 right-6 z-[9001] w-12 h-12 rounded-full bg-cp-neon text-black font-bold text-xl shadow-lg hover:brightness-110 transition"
  title="AI Market Assistant"
>
  ?
</button>


        <Chatbot
  isOpen={isChatOpen}
  onClose={() => setIsChatOpen(false)}
  coin={selectedCoin}
  sentiment={overview}
  timeframe={timeframe}
/>



    </div>
  );
}
