import React, { useEffect, useState, useCallback } from 'react'
import { getOverview, getRecent, getTrends } from "../../api/api";
import RecentList from '../recent_list'
import SentimentCard from '../sentiment_card'
import TrendChart from '../trend_chart'
import DonutChart from '../donut_chart'

// --- HARDCODED KPIs (for now) ---
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
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            currentCoin === coin
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
    >
        {coin}
    </button>
);

const TimeframeButton = ({ unit, currentTime, setTime }) => (
    <button
        onClick={() => setTime(unit)}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            currentTime === unit
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
    >
        {unit}
    </button>
);

const KpiCard = ({ title, value, subtitle, colorClass = 'text-gray-800' }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <p className="text-xs font-medium text-gray-600">{title}</p>
        <h3 className={`text-2xl font-extrabold mt-1 ${colorClass}`}>{value}</h3>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
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
    Custom: 'SOLANA',
};

export default function Dashboard() {
    const [overview, setOverview] = useState(null)
    const [recent, setRecent] = useState([]) 
    const [trend, setTrend] = useState([]) 

    const [redditSentiment, setRedditSentiment] = useState(null);
    const [twitterSentiment, setTwitterSentiment] = useState(null);
    const [newsSentiment, setNewsSentiment] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);

    const [activeCoinTab, setActiveCoinTab] = useState('Overview') 
    const [timeframe, setTimeframe] = useState('Day') 

    // --- Fetch Dashboard Data ---
    const fetchDashboardData = useCallback(() => {
        const coinSymbol = coinMap[activeCoinTab] || 'BTC';
        const trendUnit = getUnit(timeframe);

        getOverview()
        .then(r => setOverview(r.data.data)) // only store the actual data object
        .catch(console.error);

        
        getRecent(20)
            .then(r => setRecent(r.data.data || r.data))
            .catch(console.error);
        
        getTrends(coinSymbol, trendUnit)
            .then(r => setTrend(r.data.data || r.data))
            .catch(console.error);
    }, [activeCoinTab, timeframe]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // --- Reddit Sentiment Fetch ---
    useEffect(() => {
        const fetchRedditSentiment = () => {
            fetch("http://127.0.0.1:8000/api/sentiment/reddit")
                .then((res) => res.json())
                .then((data) => {
                    if (data && data.data && data.data.overall) {
                        setRedditSentiment(data.data.overall);
                        setLastFetched(Date.now());
                    } else {
                        setRedditSentiment({ score: 0, label: "Neutral" });
                    }
                })
                .catch((err) => {
                    console.error("Error fetching Reddit sentiment:", err);
                    setRedditSentiment({ score: 0, label: "Neutral" });
                });
        };

        fetchRedditSentiment();
        const interval = setInterval(fetchRedditSentiment, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // --- Twitter Sentiment Fetch ---
    useEffect(() => {
        const fetchTwitterSentiment = () => {
            fetch("http://127.0.0.1:8000/api/sentiment/overview")
                .then((res) => res.json())
                .then((data) => {
                    if (data && data.data && data.data.by_source) {
                        const twitterScore = data.data.by_source.twitter;
                        const label =
                            twitterScore > 0.05
                                ? "Positive"
                                : twitterScore < -0.05
                                ? "Negative"
                                : "Neutral";
                        setTwitterSentiment({ score: twitterScore, label });
                    } else {
                        setTwitterSentiment({ score: 0, label: "Neutral" });
                    }
                })
                .catch((err) => {
                    console.error("Error fetching Twitter sentiment:", err);
                    setTwitterSentiment({ score: 0, label: "Neutral" });
                });
        };

        fetchTwitterSentiment();
        const interval = setInterval(fetchTwitterSentiment, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // --- News Sentiment Fetch (NEW) ---
    useEffect(() => {
        const fetchNewsSentiment = () => {
            fetch("http://127.0.0.1:8000/api/sentiment/news")
                .then((res) => res.json())
                .then((data) => {
                    if (data && data.data && data.data.overall) {
                        setNewsSentiment(data.data.overall);
                    } else {
                        setNewsSentiment({ score: 0, label: "Neutral" });
                    }
                })
                .catch((err) => {
                    console.error("Error fetching News sentiment:", err);
                    setNewsSentiment({ score: 0, label: "Neutral" });
                });
        };

        fetchNewsSentiment();
        const interval = setInterval(fetchNewsSentiment, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const donutData = {
        positive: overview?.data?.sentiment_counts?.positive || 0.60,
        neutral: overview?.data?.sentiment_counts?.neutral || 0.25,
        negative: overview?.data?.sentiment_counts?.negative || 0.15 
    }

    const trendTitle = activeCoinTab === 'Overview' ? 'Sentiment Trends (BTC)' : `Sentiment Trends (${activeCoinTab})`

    return (
        <div className="font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 text-gray-800">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <button className="text-sm px-3 py-1 bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                    Export Data
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-8 border-b border-gray-200 pb-3">
                <TabButton coin="Overview" currentCoin={activeCoinTab} setCoin={setActiveCoinTab} />
                <TabButton coin="Bitcoin" currentCoin={activeCoinTab} setCoin={setActiveCoinTab} />
                <TabButton coin="Ethereum" currentCoin={activeCoinTab} setCoin={setActiveCoinTab} />
                <TabButton coin="Custom" currentCoin={activeCoinTab} setCoin={setActiveCoinTab} />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard title="Market Volume (24h)" value={DUMMY_KPIS.volume} subtitle={`Change: ${DUMMY_KPIS.volume_change}`} colorClass={DUMMY_KPIS.volume_change.startsWith('+') ? 'text-green-600' : 'text-red-600'} />
                <KpiCard title="Fear & Greed Index" value={DUMMY_KPIS.fear_greed_score} subtitle={`Mood: ${DUMMY_KPIS.fear_greed_label}`} colorClass={DUMMY_KPIS.fear_greed_label === 'Greed' ? 'text-green-600' : 'text-red-600'} />
                <KpiCard title="BTC Dominance" value={DUMMY_KPIS.btc_dominance} subtitle="Bitcoin's share of total market" />
                <KpiCard title="Top Trending Topic" value="NFTs" subtitle="Driving recent social volume" />
            </div>

            {/* Sentiment Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
<SentimentCard 
    title="Overall Sentiment" 
    label={overview?.overall?.label || "Loading..."} 
    score={overview?.overall?.score || 0} 
/>
                <SentimentCard title="Reddit Sentiment" label={redditSentiment ? redditSentiment.label : "Loading..."} score={redditSentiment ? redditSentiment.score : 0} />
                <SentimentCard title="Twitter Sentiment" label={twitterSentiment ? twitterSentiment.label : "Loading..."} score={twitterSentiment ? twitterSentiment.score : 0} />
                <SentimentCard title="News Sentiment" label={newsSentiment ? newsSentiment.label : "Loading..."} score={newsSentiment ? newsSentiment.score : 0} />
            </div>

            {/* Chart + Recent Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">{trendTitle} — {timeframe}</h4>
                        <div className="space-x-1">
                            <TimeframeButton unit="Hour" currentTime={timeframe} setTime={setTimeframe} /> 
                            <TimeframeButton unit="Day" currentTime={timeframe} setTime={setTimeframe} /> 
                            <TimeframeButton unit="Week" currentTime={timeframe} setTime={setTimeframe} /> 
                            <TimeframeButton unit="30D" currentTime={timeframe} setTime={setTimeframe} />
                        </div>
                    </div>
                    <TrendChart data={trend} height={300} /> 
                </div>

                <div className="space-y-6">
                    <DonutChart positive={donutData.positive} neutral={donutData.neutral} negative={donutData.negative} />
                    <RecentList items={recent} />
                </div>
            </div>
        </div>
    )
}
