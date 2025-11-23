import React, { useEffect, useMemo, useState, useCallback } from "react";
import { getTwitter, getReddit, getNews } from "../api/api";

// --- Custom Debounce Hook ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const SOURCE_KEY = "recent_list_pref_sources_v2";
const COIN_KEY = "recent_list_pref_coin_v2";

const defaultSourceOrder = ["twitter", "reddit", "news"];
const sourceLabels = {
  twitter: { label: "Twitter", color: "bg-cp-purple/20 text-cp-purple" },
  reddit: { label: "Reddit", color: "bg-cp-orange/20 text-cp-orange" },
  news: { label: "News", color: "bg-cp-magenta/20 text-cp-magenta" },
};

// Normalize sentiment + color
const getSentimentDetails = (item) => {
  let label = item.sentiment_label || item.label || "Neutral";
  let confidence =
    item.confidence ?? item.sentiment_score ?? item.polarity ?? null;

  let colorClass = "text-amber-300";

  if (label.toLowerCase().includes("positive")) {
    colorClass = "text-cp-neon";
  } else if (label.toLowerCase().includes("negative")) {
    colorClass = "text-cp-magenta";
  } else if (confidence !== null) {
    if (confidence > 0.3) colorClass = "text-cp-neon";
    else if (confidence < -0.3) colorClass = "text-cp-magenta";
  }

  label =
    label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();

  return { label, confidence, colorClass };
};

const timeSince = (date) => {
  if (!date) return "N/A";
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj)) return "N/A";

    const seconds = Math.floor((new Date() - dateObj) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) + " seconds ago";
  } catch {
    return "N/A";
  }
};

export default function RecentList({
  items = null,
  coin: propCoin = null,
  sources = null,
  limit = 20,
  availableCoins = ["ALL", "BTC", "ETH", "SOLANA"],
  // auto-refresh interval in ms (default 60s)
  refreshIntervalMs = 60000,
}) {
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sources (persisted)
  const [selectedSources, setSelectedSources] = useState(() => {
    try {
      const fromLs = localStorage.getItem(SOURCE_KEY);
      if (fromLs) return JSON.parse(fromLs);
    } catch {}
    return sources && Array.isArray(sources)
      ? sources
      : defaultSourceOrder;
  });

  // Coin preference (persisted)
  const [localCoin, setLocalCoin] = useState(() => {
    try {
      const c = localStorage.getItem(COIN_KEY);
      if (c) return c;
    } catch {}
    return propCoin || "ALL";
  });

  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [compactMode, setCompactMode] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [sortKey, setSortKey] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Persist prefs
  useEffect(() => {
    try {
      localStorage.setItem(
        SOURCE_KEY,
        JSON.stringify(selectedSources)
      );
    } catch {}
  }, [selectedSources]);

  useEffect(() => {
    try {
      if (localCoin) localStorage.setItem(COIN_KEY, localCoin);
    } catch {}
  }, [localCoin]);

  const finalCoin = propCoin ? propCoin : localCoin;

  // Unify incoming items from different APIs
  const unifyItems = (rawItems, source) =>
    (rawItems || []).map((it) => {
      const title =
        it.title || it.text || it.content || it.tweet || "";
      const url =
        it.url || it.permalink || it.link || it.tweet_url || null;
      const id = it.id || it._id || it.tweet_id || url || title;

      const created =
        it.created_at ||
        it.created_utc ||
        it.published_at ||
        it.date ||
        it.time ||
        it.scraped_at ||
        null;

      let safeCreatedDate = null;
      if (created) {
        const dateObj = new Date(created);
        if (!isNaN(dateObj)) safeCreatedDate = dateObj.toISOString();
      }

      return {
        ...it,
        id,
        url,
        title,
        text: it.text || it.title || it.content || "",
        created_at: safeCreatedDate,
        source,
        coin: it.coin || it.ticker || it.symbol || null,
      };
    });

  // Fetch logic (no filters in deps; filters are client-side only)
  const fetchData = useCallback(async () => {
    if (items) return; // parent is controlling items

    setLoading(true);
    setError(null);

    const isAllCoins = finalCoin === "ALL";

    const fetchPromises = [];
    const fetchLimit = Math.ceil(
      limit / (selectedSources.length || 1)
    );

    if (selectedSources.includes("twitter")) {
      fetchPromises.push(
        getTwitter(fetchLimit, isAllCoins ? null : finalCoin).then(
          (res) => unifyItems(res, "twitter")
        )
      );
    }
    if (selectedSources.includes("reddit")) {
      fetchPromises.push(
        getReddit(fetchLimit, isAllCoins ? null : finalCoin).then(
          (res) => unifyItems(res, "reddit")
        )
      );
    }
    if (selectedSources.includes("news")) {
      fetchPromises.push(
        getNews(fetchLimit, isAllCoins ? null : finalCoin).then(
          (res) => unifyItems(res, "news")
        )
      );
    }

    if (fetchPromises.length === 0) {
      setFetched([]);
      setLoading(false);
      return;
    }

    try {
      const results = await Promise.all(fetchPromises);
      const combined = results.flat();
      setFetched(combined);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to load recent posts.");
      }
    } finally {
      setLoading(false);
    }
  }, [items, finalCoin, limit, selectedSources]);

  // Auto-refresh: initial fetch + poll every `refreshIntervalMs`
  useEffect(() => {
    if (items) return;

    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await fetchData();
    };

    run(); // initial

    const intervalId = setInterval(run, refreshIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [fetchData, refreshIntervalMs, items]);

  // Filtering + sorting (client-side, on top of fetched data)
  const filteredAndSortedItems = useMemo(() => {
    const data = items || fetched;

    const sentimentFiltered = data.filter((item) => {
      const { label, confidence } = getSentimentDetails(item);
      const score = confidence ?? 0;

      const meetsConfidence = Math.abs(score) >= minConfidence;
      if (!meetsConfidence) return false;

      if (sentimentFilter === "all") return true;
      if (sentimentFilter === "positive") return score > 0;
      if (sentimentFilter === "neutral")
        return score === 0 || (score > -0.3 && score < 0.3);
      if (sentimentFilter === "negative") return score < 0;
      return true;
    });

    const lowerSearchTerm = debouncedSearchTerm
      .toLowerCase()
      .trim();
    const searchFiltered = lowerSearchTerm
      ? sentimentFiltered.filter(
          (item) =>
            item.title?.toLowerCase().includes(lowerSearchTerm) ||
            item.text?.toLowerCase().includes(lowerSearchTerm) ||
            item.coin?.toLowerCase().includes(lowerSearchTerm)
        )
      : sentimentFiltered;

    const sorted = searchFiltered.sort((a, b) => {
      let valA, valB;

      if (sortKey === "date") {
        valA = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;
        valB = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;
      } else if (sortKey === "sentiment") {
        valA = getSentimentDetails(a).confidence ?? 0;
        valB = getSentimentDetails(b).confidence ?? 0;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [
    items,
    fetched,
    sentimentFilter,
    minConfidence,
    debouncedSearchTerm,
    sortKey,
    sortDirection,
  ]);

  const toggleSource = (source) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSentimentFilter("all");
    setMinConfidence(0);
    setSortKey("date");
    setSortDirection("desc");
    setSelectedSources(defaultSourceOrder);
  };

  const activeFiltersCount =
    (sentimentFilter !== "all" ? 1 : 0) +
    (minConfidence > 0 ? 1 : 0) +
    (searchTerm ? 1 : 0) +
    (selectedSources.length < defaultSourceOrder.length ? 1 : 0);

  // --- Render ---
  return (
    <div className="bg-cp-panel/90 rounded-xl p-6 shadow-md border border-white/5 text-white">
      <h3 className="text-xl font-display font-semibold mb-4">
        Recent Posts
        {finalCoin && finalCoin !== "ALL" && (
          <span className="ml-2 text-cp-neon text-sm align-middle">
            ({finalCoin})
          </span>
        )}
      </h3>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        {!propCoin && (
          <select
            value={localCoin}
            onChange={(e) => setLocalCoin(e.target.value)}
            className="
              px-3 py-2 rounded-md text-sm w-full sm:w-auto
              bg-cp-bg/80 border border-white/10 text-gray-100
              focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
            "
          >
            {availableCoins.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All Coins" : c}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          placeholder="Search post content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="
            px-3 py-2 rounded-md text-sm flex-grow
            bg-cp-bg/80 border border-white/10 text-gray-100
            placeholder:text-gray-500
            focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
          "
        />

        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          className="
            px-3 py-2 rounded-md text-sm w-full sm:w-auto
            bg-cp-bg/80 border border-white/10 text-gray-100
            focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
          "
        >
          <option value="all">All Sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>

        <select
          value={`${sortKey}-${sortDirection}`}
          onChange={(e) => {
            const [key, direction] = e.target.value.split("-");
            setSortKey(key);
            setSortDirection(direction);
          }}
          className="
            px-3 py-2 rounded-md text-sm w-full sm:w-auto
            bg-cp-bg/80 border border-white/10 text-gray-100
            focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
          "
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="sentiment-desc">Highest Sentiment</option>
          <option value="sentiment-asc">Lowest Sentiment</option>
        </select>

        <button
          onClick={clearFilters}
          disabled={activeFiltersCount === 0}
          className={`
            px-3 py-2 text-sm rounded-md border w-full sm:w-auto transition-colors
            ${
              activeFiltersCount > 0
                ? "bg-cp-magenta/10 text-cp-magenta border-cp-magenta/60 hover:bg-cp-magenta/20"
                : "bg-cp-bg/60 text-gray-500 border-white/10 cursor-not-allowed"
            }
          `}
        >
          Clear Filters{" "}
          {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </button>
      </div>

      {/* Sources + slider */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <span className="text-sm font-medium text-gray-300">
          Sources:
        </span>
        {defaultSourceOrder.map((source) => (
          <label
            key={source}
            className="flex items-center space-x-2 text-sm text-gray-200 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedSources.includes(source)}
              onChange={() => toggleSource(source)}
              className="
                h-4 w-4 rounded border border-white/30 bg-cp-bg/80
                checked:bg-cp-neon checked:border-cp-neon accent-cp-neon
              "
            />
            <span>{sourceLabels[source]?.label || source}</span>
          </label>
        ))}

        <div className="flex items-center space-x-2 text-sm ml-auto">
          <label
            htmlFor="confidence-slider"
            className="font-medium text-gray-300 whitespace-nowrap"
          >
            Min Conf:
          </label>
          <input
            id="confidence-slider"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={minConfidence}
            onChange={(e) =>
              setMinConfidence(parseFloat(e.target.value))
            }
            className="
              w-20 h-1.5 rounded-lg appearance-none cursor-pointer
              bg-cp-bg/70
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-cp-neon
              [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(217,255,47,0.6)]
            "
          />
          <span className="font-semibold text-cp-neon">
            {minConfidence.toFixed(1)}
          </span>
          <button
            onClick={() => setCompactMode((p) => !p)}
            className="
              text-xs border px-2 py-1 rounded
              text-gray-300 border-white/15
              hover:border-cp-purple hover:text-cp-purple
              transition-colors
            "
            title="Toggle compact view"
          >
            {compactMode ? "Expand" : "Compact"}
          </button>
        </div>
      </div>

      {/* List */}
      <div
        className={`mt-3 space-y-3 ${
          compactMode ? "max-h-[500px]" : "max-h-[700px]"
        } overflow-y-auto pr-2`}
      >
        {loading && (
          <div className="text-center text-cp-neon py-6 text-sm">
            Loading posts from selected sources…
          </div>
        )}

        {error && (
          <div className="text-center text-cp-magenta py-6 text-sm">
            ❌ Error fetching data: {error}
          </div>
        )}

        {!loading && !error && filteredAndSortedItems.length === 0 && (
          <div className="text-center text-gray-400 py-6 text-sm">
            No recent posts found for the current coin, sources, and
            filters.
          </div>
        )}

        {!loading &&
          !error &&
          filteredAndSortedItems.map((p) => {
            const { label, confidence, colorClass } =
              getSentimentDetails(p);
            const sourceDetails =
              sourceLabels[p.source] || sourceLabels.news;

            return (
              <div
                key={p.id}
                className={`
                  p-3 rounded-lg border border-white/8 bg-cp-bg/40
                  transition-shadow transition-colors
                  ${
                    compactMode
                      ? "text-sm"
                      : "hover:shadow-[0_0_20px_rgba(0,0,0,0.6)] hover:border-cp-purple/70"
                  }
                `}
              >
                <a
                  href={p.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={`
                    block leading-snug font-medium
                    ${compactMode ? "text-sm" : "text-base"}
                    text-gray-100 hover:text-cp-neon transition-colors
                  `}
                  title={p.title || p.text}
                >
                  {p.title || p.text || "No title available"}
                </a>

                <div
                  className={`
                    flex flex-wrap items-center gap-2
                    ${compactMode ? "text-xs mt-1" : "text-sm mt-2"}
                  `}
                >
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${sourceDetails.color}`}
                  >
                    {sourceDetails.label}
                  </span>

                  <span className={`font-semibold ${colorClass}`}>
                    Sentiment: {label}
                  </span>

                  {confidence !== null && (
                    <span className="text-gray-300">
                      Conf: {confidence.toFixed(3)}
                    </span>
                  )}

                  <span className="text-gray-400 ml-auto whitespace-nowrap">
                    {p.created_at ? timeSince(p.created_at) : "Date N/A"}
                  </span>
                </div>

                {!compactMode && p.text && (
                  <p className="text-gray-300 mt-2 text-sm line-clamp-2">
                    {p.text}
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
