// RedditList.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getReddit } from "../api/api";

// ---------------------- UTILITIES ----------------------

const parseCreated = (created) => {
  if (!created) return null;
  try {
    const s = String(created).trim();
    if (/^\d+$/.test(s)) {
      let ts = Number(s);
      if (s.length === 10) ts *= 1000;
      if (ts < 1e12) ts *= 1000;
      const d = new Date(ts);
      if (!isNaN(d)) return d.toISOString();
    } else {
      const d = new Date(s);
      if (!isNaN(d)) return d.toISOString();
    }
  } catch {}
  return null;
};

const timeSince = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d)) return "N/A";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

// ---------------------- SENTIMENT EXTRACTION ----------------------

function getSentimentDetails(item) {
  const s = item.sentiment || {};

  let label =
    s.label ||
    item.sentiment_label ||
    "";

  let polarity =
    s.polarity ||
    item.polarity ||
    null;

  let confidence =
    s.confidence ||
    item.confidence ||
    null;

  let scores =
    s.scores ||
    item.sentiment_scores ||
    null;

  // Infer missing label
  if (!label) {
    if (polarity !== null) {
      if (polarity > 0.05) label = "positive";
      else if (polarity < -0.05) label = "negative";
      else label = "neutral";
    } else {
      label = "neutral";
    }
  }

  return {
    label: label.toLowerCase(),
    polarity,
    confidence,
    scores,
  };
}

// ---------------------- MAIN COMPONENT ----------------------

export default function RedditList({
  coin = "ALL",
  pageSize = 25,
  maxItems = 600,
  sentimentFilter = "all", // 🎯 new prop from your frontend
}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const idsRef = useRef(new Set());
  const inFlightRef = useRef(false);
  const sentinelRef = useRef(null);

  // UI controls
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [compact, setCompact] = useState(false);

  // ---------------------- FETCH PAGE ----------------------

  const fetchPage = useCallback(
    async (limit) => {
      if (inFlightRef.current) return;
      if (idsRef.current.size >= maxItems) return;

      setLoading(true);
      setError(null);
      inFlightRef.current = true;

      try {
        const res = await getReddit(limit, coin === "ALL" ? null : coin);

        const unified = (res || []).map((it) => {
          const created_raw =
            it.created_at ||
            it.created_utc ||
            it.date ||
            it.time;

          return {
            ...it,
            title: it.title || it.text || "",
            text:
              it.text ||
              it.selftext ||
              it.content ||
              "",
            created_at: parseCreated(created_raw),
            id:
              it.id ||
              it._id ||
              it.permalink ||
              it.url ||
              (it.title || it.text).slice(0, 40),
          };
        });

        const newItems = [];
        for (const u of unified) {
          if (!u.id) continue;
          if (!idsRef.current.has(u.id)) {
            idsRef.current.add(u.id);
            newItems.push(u);
            if (idsRef.current.size >= maxItems) break;
          }
        }

        setItems((prev) => [...prev, ...newItems]);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [coin, maxItems]
  );

  // Reset on coin change
  useEffect(() => {
    idsRef.current = new Set();
    setItems([]);
    setPage(1);
  }, [coin]);

  useEffect(() => {
    fetchPage(page * pageSize);
  }, [page, pageSize, fetchPage]);

  // ---------------------- INFINITE SCROLL ----------------------

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            entry.isIntersecting &&
            !inFlightRef.current &&
            idsRef.current.size < maxItems
          ) {
            setPage((p) => p + 1);
          }
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [maxItems]);

  // ---------------------- FILTER & SORT ----------------------

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();

    let arr = items.slice();

    arr = arr.filter((it) => {
      const { label } = getSentimentDetails(it);

      // Search filter
      if (q) {
        const t = (it.title || "").toLowerCase();
        const txt = (it.text || "").toLowerCase();
        if (!t.includes(q) && !txt.includes(q)) return false;
      }

      // Sentiment filter
      if (sentimentFilter !== "all" && label !== sentimentFilter)
        return false;

      return true;
    });

    // Sorting
    if (sortKey === "date") {
      arr.sort((a, b) => {
        const va = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;
        const vb = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;
        return sortDirection === "asc" ? va - vb : vb - va;
      });
    }

    return arr;
  }, [items, query, sortKey, sortDirection, sentimentFilter]);

  // ---------------------- RENDER ----------------------

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          placeholder="Search reddit..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-2 py-1 rounded bg-cp-bg border border-white/10 text-sm w-full sm:w-44"
        />

        <select
          value={`${sortKey}-${sortDirection}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split("-");
            setSortKey(k);
            setSortDirection(d);
          }}
          className="px-2 py-1 rounded bg-cp-bg border border-white/10 text-sm"
        >
          <option value="date-desc">Newest</option>
          <option value="date-asc">Oldest</option>
        </select>

        <button
          onClick={() => setCompact((p) => !p)}
          className="px-2 py-1 rounded border border-white/10 text-xs"
        >
          {compact ? "Expand" : "Compact"}
        </button>
      </div>

      {/* LIST */}
      <div
        className={`space-y-3 ${
          compact ? "max-h-[300px]" : "max-h-[520px]"
        } overflow-auto pr-2`}
      >
        {error && (
          <div className="text-cp-magenta text-sm py-2">
            Error: {error}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-gray-400 text-sm py-4">
            No posts found.
          </div>
        )}

        {filtered.map((p) => {
          const { label } = getSentimentDetails(p);

          return (
            <div
              key={p.id}
              className="p-3 rounded border border-white/8 bg-cp-bg/40"
            >
              <a
                href={p.url || p.permalink || "#"}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-gray-100 block hover:text-cp-neon"
              >
                {p.title || "Untitled"}
              </a>

              <div className="flex items-center gap-2 text-sm mt-2">
                <span className="px-2 py-0.5 rounded-full bg-cp-orange/20 text-cp-orange text-xs">
                  Reddit
                </span>

                <span
                  className={`text-xs font-semibold ${
                    label === "positive"
                      ? "text-cp-neon"
                      : label === "negative"
                      ? "text-cp-magenta"
                      : "text-gray-300"
                  }`}
                >
                  {label}
                </span>

                <span className="text-gray-400 ml-auto">
                  {p.created_at
                    ? timeSince(p.created_at)
                    : "Date N/A"}
                </span>
              </div>

              {!compact && p.text && (
                <p className="text-gray-300 mt-2 text-sm line-clamp-2">
                  {p.text}
                </p>
              )}
            </div>
          );
        })}

        {/* sentinel */}
        <div ref={sentinelRef} className="h-6" />

        {loading && (
          <div className="text-gray-400 text-center py-2">
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}
