// src/pages/trend_prediction.jsx
import React, { useState, useEffect } from "react";
import { Search, Bell } from "lucide-react";

const KpiCard = ({ title, accuracy, change }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
    <h4 className="text-sm font-medium text-gray-500">{title}</h4>
    <p className="text-2xl font-bold text-gray-800 mt-1">{accuracy}</p>
    <p
      className={`text-xs font-medium mt-1 ${
        change.startsWith("+") ? "text-green-600" : "text-red-600"
      }`}
    >
      {change} from last month
    </p>
  </div>
);

const PredictionCard = ({ coin, trend, confidence }) => (
  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-sm font-semibold text-gray-700">{coin}</h3>
      <span
        className={`text-sm font-medium ${
          trend === "Bullish"
            ? "text-green-600"
            : trend === "Bearish"
            ? "text-red-600"
            : "text-yellow-600"
        }`}
      >
        {trend} {trend === "Bullish" ? "↗" : trend === "Bearish" ? "↘" : "–"}
      </span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div
        className={`h-2 rounded-full ${
          confidence > 80
            ? "bg-green-500"
            : confidence > 60
            ? "bg-yellow-400"
            : "bg-red-400"
        }`}
        style={{ width: `${confidence}%` }}
      ></div>
    </div>
    <p className="text-xs text-gray-500 mt-2">
      Confidence: <span className="font-semibold">{confidence}%</span>
    </p>
  </div>
);

export default function TrendPrediction() {
  const [timeframe, setTimeframe] = useState("Short-term (24h)");
  const [alertThreshold, setAlertThreshold] = useState("High Confidence Only");

  const coins = [
    { coin: "Bitcoin", trend: "Bullish", confidence: 92 },
    { coin: "Ethereum", trend: "Bullish", confidence: 87 },
    { coin: "Solana", trend: "Bullish", confidence: 83 },
    { coin: "Cardano", trend: "Neutral", confidence: 65 },
    { coin: "Dogecoin", trend: "Bearish", confidence: 78 },
    { coin: "Polkadot", trend: "Neutral", confidence: 61 },
  ];

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Trend Prediction</h1>
        <button className="text-sm px-3 py-1 bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
          Export Data
        </button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard title="Short-term Predictions" accuracy="85% Accuracy" change="+5%" />
        <KpiCard title="Mid-term Predictions" accuracy="78% Accuracy" change="+2%" />
        <KpiCard title="Long-term Predictions" accuracy="72% Accuracy" change="-3%" />
        <KpiCard title="Overall Accuracy" accuracy="79% Accuracy" change="+1%" />
      </div>

      {/* Predictions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Prediction List */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-800">
              Trend Predictions
            </h4>
            <div className="flex space-x-2">
              {["Short-term (24h)", "Mid-term (7d)", "Long-term (30d)"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    timeframe === t
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Predictions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coins.map((c) => (
              <PredictionCard
                key={c.coin}
                coin={c.coin}
                trend={c.trend}
                confidence={c.confidence}
              />
            ))}
          </div>

          {/* Historical Accuracy Placeholder */}
          <div className="mt-8">
            <h4 className="text-md font-semibold text-gray-800 mb-3">
              Historical Accuracy
            </h4>
            <div className="bg-gray-50 h-48 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              Historical accuracy chart will appear here
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Search Filter */}
          <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Search</h4>
            <div className="flex items-center space-x-2 mb-3">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Bitcoin, Ethereum, etc."
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            <label className="block text-sm text-gray-600 mb-1">
              Prediction Timeframe
            </label>
            <select
              className="w-full border border-gray-300 rounded-md p-2 text-sm mb-3"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option>Short-term (24h)</option>
              <option>Mid-term (7d)</option>
              <option>Long-term (30d)</option>
            </select>

            <label className="block text-sm text-gray-600 mb-1">
              Confidence Threshold
            </label>
            <select className="w-full border border-gray-300 rounded-md p-2 text-sm mb-4">
              <option>All Predictions</option>
              <option>High Confidence Only</option>
              <option>Medium Confidence</option>
            </select>

            <button className="w-full bg-blue-600 text-white text-sm font-semibold py-2 rounded-md hover:bg-blue-700 transition-colors">
              Apply Filters
            </button>
          </div>

          {/* Alert Settings */}
          <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-semibold text-gray-800">
                Alert Settings
              </h4>
              <Bell className="w-5 h-5 text-gray-500" />
            </div>

            <label className="block text-sm text-gray-600 mb-1">
              Alert Threshold
            </label>
            <select
              className="w-full border border-gray-300 rounded-md p-2 text-sm mb-4"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
            >
              <option>High Confidence Only</option>
              <option>Medium & High</option>
              <option>All Predictions</option>
            </select>

            <button className="w-full bg-blue-600 text-white text-sm font-semibold py-2 rounded-md hover:bg-blue-700 transition-colors">
              Save Alert Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
