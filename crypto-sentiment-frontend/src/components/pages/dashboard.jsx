// src/components/Dashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

import { getOverview, getTrends } from "../../api/api";
import RecentList from '../recent_list';
import SentimentCard from '../sentiment_card';
import TrendChart from '../trend_chart';
import DonutChart from '../donut_chart';
import TransactionsPreview from '../TransactionsPreview';

// -----------------------------
// CoinSentimentComparison component
// -----------------------------
const COLORS = {
  BTC: '#10b981', // green
  ETH: '#60a5fa', // blue-ish
  SOLANA: '#f59e0b' // amber
};

/**
 * CoinSentimentComparison
 * Props:
 *  - data: array of objects for each coin: [{ coin: 'BTC', overall: 0.1, twitter: 0.05, reddit: 0.02, news: 0.03 }, ...]
 *
 * Renders a line chart where X axis = source (overall, twitter, reddit, news)
 * and each coin is a separate line showing the score for that source.
 */
function CoinSentimentComparison({ data = [] }) {
  const sources = ['overall', 'twitter', 'reddit', 'news'];

  const series = sources.map((src) => {
    const row = { source: src };
    data.forEach((coinObj) => {
      const coinKey = (coinObj.coin || '').toUpperCase();
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
    return acc + Object.keys(r).reduce((s, k) => (k === 'source' ? s : s + Math.abs(Number(r[k] || 0))), 0);
  }, 0);

  if (!data || data.length === 0 || totalPoints === 0) {
    return (
      <div className="bg-cp-panel rounded-xl p-4 border border-white/5 h-48 flex items-center justify-center text-gray-400">
        No comparison data available.
      </div>
    );
  }

  return (
    <div className="bg-cp-panel rounded-xl p-4 border border-white/5">
      <h4 className="text-lg font-semibold mb-3">Coin Sentiment Comparison</h4>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
            <XAxis dataKey="source" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis tickFormatter={(v) => (v * 100).toFixed(0) + '%'} tick={{ fill: '#9CA3AF' }} />
            <Tooltip formatter={(value) => (Number(value) * 100).toFixed(2) + '%'} />
            <Legend wrapperStyle={{ color: '#9CA3AF' }} />
            {data.map((coinObj) => {
              const coinKey = (coinObj.coin || '').toUpperCase();
              const color = COLORS[coinKey] || '#c084fc';
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

// --- HARDCODED KPIS (for now) ---
const DUMMY_KPIS = {
  volume: '$124.5B',
  volume_change: '+5.2%',
  fear_greed_score: 68,
  fear_greed_label: 'Greed',
  btc_dominance: '52.4%',
};

const TabButton = ({ coin, currentCoin, setCoin }) => (
  <button
    onClick={() => setCoin(coin)}
    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors border ${
      currentCoin === coin
        ? 'bg-cp-neon text-black border-cp-neon shadow-md'
        : 'bg-cp-panel text-gray-300 border-white/10 hover:bg-cp-panel/80'
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
        ? 'bg-cp-neon text-black border-cp-neon'
        : 'bg-cp-panel text-gray-300 border-white/10 hover:bg-cp-panel/80'
    }`}
  >
    {unit}
  </button>
);

const KpiCard = ({ title, value, subtitle, colorClass = 'text-cp-neon' }) => (
  <div className="bg-cp-panel rounded-xl p-4 shadow-sm border border-white/5">
    <p className="text-xs font-medium text-gray-400">{title}</p>
    <h3 className={`text-2xl font-extrabold mt-1 ${colorClass}`}>{value}</h3>
    {subtitle && (
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    )}
  </div>
);

const getUnit = (timeframe) => {
  if (timeframe === 'Hour') return 'hour';
  if (timeframe === 'Day' || timeframe === '7D' || timeframe === '30D') return 'day';
  if (timeframe === 'Week' || timeframe === '90D') return 'week';
  return 'day';
};

const coinMap = {
  Overview: 'BTC',
  Bitcoin: 'BTC',
  Ethereum: 'ETH',
  Solana: 'SOLANA',
};

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);

  // Removed recent state — RecentList will fetch dynamically like SentimentAnalysis
  const [activeCoinTab, setActiveCoinTab] = useState('Overview');
  const [timeframe, setTimeframe] = useState('Day');

  // --- Fetch Dashboard Data ---
  const fetchDashboardData = useCallback(() => {
    const coinSymbol = coinMap[activeCoinTab] || 'BTC';
    const trendUnit = getUnit(timeframe);

    // Fetch Overview and Trends (pass coinSymbol to getOverview so everything is coin-specific)
    Promise.all([
      getOverview(coinSymbol),
      getTrends(coinSymbol, trendUnit)
    ])
      .then(([overviewRes, trendRes]) => {
        // normalize response shapes: prefer .data if present
        const normalizedOverview = overviewRes && overviewRes.data ? overviewRes.data : overviewRes;
        setOverview(normalizedOverview);
        setTrend(trendRes || []);
      })
      .catch(console.error);

    // Also fetch overview for BTC/ETH/SOLANA to build comparison chart (non-blocking)
    Promise.allSettled([
      getOverview('BTC'),
      getOverview('ETH'),
      getOverview('SOLANA')
    ]).then((results) => {
      const coins = ['BTC', 'ETH', 'SOLANA'];
      const arr = results.map((r, idx) => {
        if (r.status === 'fulfilled') {
          const val = r.value && r.value.data ? r.value.data : r.value;
          return {
            coin: coins[idx],
            overall: val?.overall?.score ?? val?.overall_score ?? 0,
            twitter: val?.by_source?.twitter ?? val?.by_source?.Twitter ?? 0,
            reddit: val?.by_source?.reddit ?? val?.by_source?.Reddit ?? 0,
            news: val?.by_source?.news ?? val?.by_source?.News ?? 0
          };
        }
        return { coin: coins[idx], overall: 0, twitter: 0, reddit: 0, news: 0 };
      });
      setComparisonData(arr);
    }).catch(console.error);

  }, [activeCoinTab, timeframe]);

  useEffect(() => {
    fetchDashboardData();

    // ⭐️ ADDED: Set up automatic refresh (polling) every 60 seconds (1 minute) ⭐️
    const POLLING_INTERVAL = 60000; // 60 seconds in milliseconds
    const intervalId = setInterval(fetchDashboardData, POLLING_INTERVAL);

    // Cleanup function to stop polling when the component unmounts
    return () => clearInterval(intervalId);

  }, [fetchDashboardData]);

  // --- Consolidated Card Data (Consistent Logic) ---
  const selectedCoin = coinMap[activeCoinTab] || 'BTC';

  const sourceCards = [
    {
      title: "Overall Sentiment",
      sourceKey: "overall",
      score: overview?.overall?.score ?? overview?.overall_score ?? 0,
      label: overview?.overall
        ? `${overview.overall.label} ${(overview.overall.score * 100).toFixed(1)}%`
        : "Neutral 0%",
    },
    {
      title: "Twitter Sentiment",
      sourceKey: "twitter",
      score: overview?.by_source?.twitter ?? overview?.bySource?.twitter ?? 0,
      label: (overview?.by_source?.twitter ?? overview?.bySource?.twitter ?? 0) !== undefined
        ? `${getLabelByScore(overview?.by_source?.twitter ?? overview?.bySource?.twitter ?? 0, NEUTRAL_THRESHOLD)} ${((overview?.by_source?.twitter ?? overview?.bySource?.twitter ?? 0) * 100).toFixed(1)}%`
        : "Neutral 0%",
    },
    {
      title: "Reddit Sentiment",
      sourceKey: "reddit",
      score: overview?.by_source?.reddit ?? overview?.bySource?.reddit ?? 0,
      label: (overview?.by_source?.reddit ?? overview?.bySource?.reddit ?? 0) !== undefined
        ? `${getLabelByScore(overview?.by_source?.reddit ?? overview?.bySource?.reddit ?? 0, NEUTRAL_THRESHOLD)} ${((overview?.by_source?.reddit ?? overview?.bySource?.reddit ?? 0) * 100).toFixed(1)}%`
        : "Neutral 0%",
    },
    {
      title: "News Sentiment",
      sourceKey: "news",
      score: overview?.by_source?.news ?? overview?.bySource?.news ?? 0,
      label: (overview?.by_source?.news ?? overview?.bySource?.news ?? 0) !== undefined
        ? `${getLabelByScore(overview?.by_source?.news ?? overview?.bySource?.news ?? 0, NEUTRAL_THRESHOLD)} ${((overview?.by_source?.news ?? overview?.bySource?.news ?? 0) * 100).toFixed(1)}%`
        : "Neutral 0%",
    },
  ];

  const donutData = {
    positive: overview?.sentiment_counts?.positive_count ?? overview?.sentiment_counts?.positive ?? 0,
    neutral: overview?.sentiment_counts?.neutral_count ?? overview?.sentiment_counts?.neutral ?? 0,
    negative: overview?.sentiment_counts?.negative_count ?? overview?.sentiment_counts?.negative ?? 0
  };

  const trendTitle =
    activeCoinTab === 'Overview'
      ? 'Sentiment Trends (BTC)'
      : `Sentiment Trends (${activeCoinTab})`;

  return (
    <div className="font-sans text-white p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <button className="text-xs px-3 py-1 rounded-lg border border-white/10 bg-cp-panel hover:bg-cp-panel/80 transition-colors">
          Export Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
        <TabButton coin="Overview" currentCoin={activeCoinTab} setCoin={setActiveCoinTab} />
        <TabButton coin="Bitcoin" currentCoin={activeCoinTab} setCoin={setActiveCoinTab} />
        <TabButton coin="Ethereum" currentCoin={activeCoinTab} setCoin={setActiveCoinTab} />
        <TabButton coin="Solana" currentCoin={activeCoinTab} setCoin={setActiveCoinTab} />
      </div>

      {/* Sentiment Cards - Grid setup is good (1-col -> 2-col -> 4-col) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Coin comparison chart */}
      <div className="mb-6">
  <CoinSentimentComparison
    data={comparisonData}
    onCoinClick={(coinKey) => {
      // map coinKey back to your tab names
      if (coinKey === 'BTC') setActiveCoinTab('Bitcoin');
      else if (coinKey === 'ETH') setActiveCoinTab('Ethereum');
      else if (coinKey === 'SOLANA') setActiveCoinTab('Solana');
    }}
  />
</div>

      {/* Chart + Widgets Section */}
      {/* Main layout: 1 column on small, 3 columns (2/3 chart, 1/3 sidebar) on large */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Trend Chart (2/3 width) + Transactions Preview */}
        <div className="lg:col-span-2 space-y-6">

          {/* Trend Chart Container */}
          <div className="bg-cp-panel rounded-xl p-4 sm:p-6 shadow-lg border border-white/5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
              <h4 className="text-base sm:text-lg font-semibold">
                {trendTitle} — {timeframe}
              </h4>
              <div className="flex flex-wrap space-x-1">
                <TimeframeButton unit="Hour" currentTime={timeframe} setTime={setTimeframe} />
                <TimeframeButton unit="Day" currentTime={timeframe} setTime={setTimeframe} />
                <TimeframeButton unit="Week" currentTime={timeframe} setTime={setTimeframe} />
                <TimeframeButton unit="30D" currentTime={timeframe} setTime={setTimeframe} />
              </div>
            </div>
            <TrendChart data={trend} height={300} />
          </div>

          {/* ⭐️ Transactions Preview moved here, below the Trend Chart ⭐️ */}
          <TransactionsPreview />
        </div>

        {/* RIGHT COLUMN: Sidebar Widgets (Donut, Recent List) */}
        <div className="lg:col-span-1 space-y-6">

          {/* Donut Chart */}
          <div className="bg-cp-panel rounded-xl p-6 border border-white/5">
            <DonutChart
              positive={donutData.positive}
              neutral={donutData.neutral}
              negative={donutData.negative}
            />
          </div>

          {/* Recent List (Now dynamically fetched like SentimentAnalysis) */}
          <div className="bg-cp-panel rounded-xl p-6 border border-white/5">
            <RecentList coin={selectedCoin} limit={20} />
          </div>
        </div>

      </div>
    </div>
  );
}
