// RecentListsWrapper.jsx
import React, { useState } from "react";
import TwitterList from "./TwitterList";
import RedditList from "./RedditList";
import NewsList from "./NewsList";

const availableCoins = ["ALL", "BTC", "ETH", "SOLANA"];
const defaultSourceOrder = ["twitter", "reddit", "news"];

export default function RecentListsWrapper({
  initialCoin = "ALL",
  available = availableCoins,
}) {
  const [activeTab, setActiveTab] = useState("twitter");

  // Shared filters (passed down to each list)
  const [coin, setCoin] = useState(initialCoin);
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortKey, setSortKey] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className="bg-cp-panel/90 rounded-xl p-6 shadow-md border border-white/5 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-display font-semibold">Recent Posts</h3>

        <div className="flex items-center gap-2">
          <div className="tabs inline-flex bg-cp-bg/80 rounded">
            <button
              className={`px-3 py-2 rounded-l ${activeTab === "twitter" ? "bg-cp-neon/10" : ""}`}
              onClick={() => setActiveTab("twitter")}
            >
              Twitter
            </button>
            <button
              className={`px-3 py-2 ${activeTab === "reddit" ? "bg-cp-neon/10" : ""}`}
              onClick={() => setActiveTab("reddit")}
            >
              Reddit
            </button>
            <button
              className={`px-3 py-2 rounded-r ${activeTab === "news" ? "bg-cp-neon/10" : ""}`}
              onClick={() => setActiveTab("news")}
            >
              News
            </button>
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <select
          value={coin}
          onChange={(e) => setCoin(e.target.value)}
          className="px-3 py-2 rounded-md text-sm bg-cp-bg/80 border border-white/10 text-gray-100"
        >
          {available.map((c) => (
            <option key={c} value={c}>
              {c === "ALL" ? "All Coins" : c}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search post content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 rounded-md text-sm flex-grow bg-cp-bg/80 border border-white/10 text-gray-100"
        />

        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          className="px-3 py-2 rounded-md text-sm bg-cp-bg/80 border border-white/10 text-gray-100"
        >
          <option value="all">All Sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>

        <select
          value={`${sortKey}-${sortDirection}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split("-");
            setSortKey(key);
            setSortDirection(dir);
          }}
          className="px-3 py-2 rounded-md text-sm bg-cp-bg/80 border border-white/10 text-gray-100"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="sentiment-desc">Highest Sentiment</option>
          <option value="sentiment-asc">Lowest Sentiment</option>
        </select>

        <div className="flex items-center space-x-2">
          <label className="font-medium text-gray-300">Min Conf:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="font-semibold text-cp-neon">{minConfidence.toFixed(1)}</span>

          <button
            onClick={() => setCompactMode((p) => !p)}
            className="text-xs border px-2 py-1 rounded text-gray-300 border-white/15"
          >
            {compactMode ? "Expand" : "Compact"}
          </button>
        </div>
      </div>

      {/* Active tab content */}
      <div>
        {activeTab === "twitter" && (
          <TwitterList
            coin={coin}
            searchTerm={searchTerm}
            sentimentFilter={sentimentFilter}
            minConfidence={minConfidence}
            sortKey={sortKey}
            sortDirection={sortDirection}
            compactMode={compactMode}
          />
        )}
        {activeTab === "reddit" && (
          <RedditList
            coin={coin}
            searchTerm={searchTerm}
            sentimentFilter={sentimentFilter}
            minConfidence={minConfidence}
            sortKey={sortKey}
            sortDirection={sortDirection}
            compactMode={compactMode}
          />
        )}
        {activeTab === "news" && (
          <NewsList
            coin={coin}
            searchTerm={searchTerm}
            sentimentFilter={sentimentFilter}
            minConfidence={minConfidence}
            sortKey={sortKey}
            sortDirection={sortDirection}
            compactMode={compactMode}
          />
        )}
      </div>
    </div>
  );
}
