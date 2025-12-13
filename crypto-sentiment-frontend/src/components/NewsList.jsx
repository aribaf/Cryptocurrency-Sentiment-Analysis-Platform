// NewsList.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { getNews } from "../api/api";

/* ----------------------------------------------------
   Helpers
---------------------------------------------------- */

const parseCreated = (created) => {
  if (!created) return null;
  try {
    const s = String(created).trim();

    // UNIX timestamp (seconds or ms)
    if (/^\d+$/.test(s)) {
      let ts = Number(s);
      if (ts < 1e12) ts *= 1000; // convert sec → ms
      const d = new Date(ts);
      if (!isNaN(d)) return d.toISOString();
    }

    // ISO date string
    const d = new Date(s);
    if (!isNaN(d)) return d.toISOString();
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

/* ----------------------------------------------------
   Component
---------------------------------------------------- */

export default function NewsList({
  coin = "ALL",
  pageSize = 25,
  maxItems = 600,            // safe cap
}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchingRef = useRef(false);
  const idsRef = useRef(new Set());
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  /* ------------------------------
     UI Filters
  ------------------------------ */
  const [query, setQuery] = useState("");

  const [sentiment, setSentiment] = useState("all");
  // sentiments: positive | neutral | negative | all

  const [dateFilter, setDateFilter] = useState("all");
  // all | last24 | yesterday | last7

  const [sortKey, setSortKey] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  const [compact, setCompact] = useState(false);

  /* ------------------------------
     Fetch items (append-only)
  ------------------------------ */
  const fetchPage = useCallback(
    async (reqLimit) => {
      if (fetchingRef.current) return;
      if (idsRef.current.size >= maxItems) return;

      setLoading(true);
      setError(null);
      fetchingRef.current = true;

      try {
        const res = await getNews(reqLimit, coin === "ALL" ? null : coin);

        const unified = (res || []).map((it) => {
          const createdRaw =
            it.created_at ||
            it.published_at ||
            it.date ||
            it.time ||
            it.created_utc;

          let label =
            it.sentiment_label ||
            it.label ||
            it.sentiment?.label ||
            "neutral";

          label = label.toLowerCase();

          return {
            ...it,
            title: it.title || it.text || it.content || "",
            text: it.text || it.title || it.content || "",
            sentiment_label: label,
            created_at: parseCreated(createdRaw),
            id: it.id || it._id || it.url || (it.title || "").slice(0, 40),
          };
        });

        const newItems = [];
        for (const u of unified) {
          if (!u.id) continue;
          if (!idsRef.current.has(u.id)) {
            idsRef.current.add(u.id);
            newItems.push(u);
          }
          if (idsRef.current.size >= maxItems) break;
        }

        setItems((prev) => [...prev, ...newItems]);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [coin, maxItems]
  );

  /* ------------------------------
     Reset on coin change
  ------------------------------ */
  useEffect(() => {
    idsRef.current = new Set();
    setItems([]);
    setPage(1);
    setError(null);
  }, [coin]);

  /* ------------------------------
     Fetch when page increments
  ------------------------------ */
  useEffect(() => {
    const reqLimit = Math.min(page * pageSize, maxItems);
    fetchPage(reqLimit);
  }, [page, pageSize, fetchPage, maxItems]);

  /* ------------------------------
     IntersectionObserver
  ------------------------------ */
  useEffect(() => {
    if (!sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            entry.isIntersecting &&
            !fetchingRef.current &&
            idsRef.current.size < maxItems
          ) {
            setPage((p) => p + 1);
          }
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [maxItems]);

  /* ----------------------------------------------------
     Filtering
  ---------------------------------------------------- */

  const filtered = useMemo(() => {
    let arr = [...items];

    const q = query.toLowerCase().trim();
    if (q) {
      arr = arr.filter(
        (it) =>
          (it.title || "").toLowerCase().includes(q) ||
          (it.text || "").toLowerCase().includes(q)
      );
    }

    // SENTIMENT FILTER
    if (sentiment !== "all") {
      arr = arr.filter((it) => it.sentiment_label === sentiment);
    }

    // DATE FILTER
    if (dateFilter !== "all") {
      const now = Date.now();

      arr = arr.filter((it) => {
        if (!it.created_at) return false;
        const t = new Date(it.created_at).getTime();

        if (dateFilter === "last24") {
          return now - t <= 24 * 60 * 60 * 1000;
        }

        if (dateFilter === "last7") {
          return now - t <= 7 * 24 * 60 * 60 * 1000;
        }

        if (dateFilter === "yesterday") {
          const start = new Date();
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);

          const end = new Date();
          end.setDate(end.getDate() - 1);
          end.setHours(23, 59, 59, 999);

          return t >= start.getTime() && t <= end.getTime();
        }

        return true;
      });
    }

    // SORTING
    arr.sort((a, b) => {
      let va = 0,
        vb = 0;

      if (sortKey === "date") {
        va = a.created_at ? new Date(a.created_at).getTime() : 0;
        vb = b.created_at ? new Date(b.created_at).getTime() : 0;
      }

      if (va < vb) return sortDirection === "asc" ? -1 : 1;
      if (va > vb) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [items, query, sentiment, dateFilter, sortKey, sortDirection]);

  /* ------------------------------
     RENDER
  ------------------------------ */

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        {/* Search */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search news..."
          className="px-2 py-1 rounded bg-cp-bg border border-white/10 text-sm w-full sm:w-44"
        />


        {/* Sentiment Filter */}
        <select
          value={sentiment}
          onChange={(e) => setSentiment(e.target.value)}
          className="px-2 py-1 rounded bg-cp-bg border border-white/10 text-sm"
        >
          <option value="all">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>

        {/* Sort */}
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
          <div className="text-cp-magenta text-sm py-2">Error: {error}</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-gray-400 text-sm py-4">No news found.</div>
        )}

        {filtered.map((p) => (
          <div
            key={p.id}
            className="p-3 rounded border border-white/8 bg-cp-bg/40"
          >
            <a
              href={p.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-gray-100 block"
            >
              {p.title || p.text || "No title"}
            </a>

            <div className="flex items-center gap-2 text-sm mt-2">
              <span className="px-2 py-0.5 rounded-full bg-cp-magenta/20 text-cp-magenta text-xs">
                News
              </span>

              {/* sentiment */}
              <span
                className={`text-xs font-semibold ${
                  p.sentiment_label === "positive"
                    ? "text-cp-neon"
                    : p.sentiment_label === "negative"
                    ? "text-cp-magenta"
                    : "text-amber-300"
                }`}
              >
                {p.sentiment_label}
              </span>

              <span className="text-gray-400 ml-auto">
                {p.created_at ? timeSince(p.created_at) : "Date N/A"}
              </span>
            </div>

            {!compact && p.text && (
              <p className="text-gray-300 mt-2 text-sm line-clamp-2">
                {p.text}
              </p>
            )}
          </div>
        ))}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-6" />

        {loading && (
          <div className="text-gray-400 text-center py-2">Loading…</div>
        )}
      </div>
    </div>
  );
}
