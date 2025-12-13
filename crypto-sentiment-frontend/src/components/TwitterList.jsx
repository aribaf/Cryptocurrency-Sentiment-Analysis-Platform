// TwitterList.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTwitter } from "../api/api"; // adjust path if your api module is elsewhere

/* -----------------------
   Helpers
------------------------*/
const parseCreated = (created) => {
  if (!created) return null;
  try {
    const s = String(created).trim();
    if (/^\d+$/.test(s)) {
      let ts = Number(s);
      if (ts < 1e12) ts *= 1000;
      const d = new Date(ts);
      if (!isNaN(d)) return d.toISOString();
    }
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

// Normalizes sentiment info across possible shapes from backend
const normalizeSentiment = (it) => {
  // possible fields: sentiment_label, label, sentiment.label, sentiment.scores, sentiment.scores.pos/neg
  let label =
    it.sentiment_label ||
    it.label ||
    (it.sentiment && it.sentiment.label) ||
    "";
  label = String(label || "").toLowerCase();

  // try to derive polarity from fields if present
  let polarity = null;
  const tryNum = (v) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const pos =
    tryNum(it.sentiment?.scores?.pos) ??
    tryNum(it.sentiment?.scores?.positive) ??
    tryNum(it.pos) ??
    tryNum(it.positive);
  const neg =
    tryNum(it.sentiment?.scores?.neg) ??
    tryNum(it.sentiment?.scores?.negative) ??
    tryNum(it.neg) ??
    tryNum(it.negative);

  if (pos !== null && neg !== null) {
    polarity = pos - neg;
  } else if (typeof label === "string" && label) {
    if (label.includes("pos")) polarity = 0.5;
    else if (label.includes("neg")) polarity = -0.5;
    else if (label.includes("neu")) polarity = 0;
  }

  const finalLabel =
    label ||
    (polarity !== null ? (polarity < 0 ? "negative" : polarity > 0 ? "positive" : "neutral") : "neutral");

  return { label: finalLabel.toLowerCase(), polarity };
};

/* -----------------------
   Component
------------------------*/
export default function TwitterList({
  coin = "ALL",
  pageSize = 25,
  maxItems = 600,
}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchingRef = useRef(false);
  const idsRef = useRef(new Set());
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  // Filters & UI state
  const [query, setQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all"); // all, positive, neutral, negative
  const [dateFilter, setDateFilter] = useState("all"); // all, last24, yesterday, last7
  const [sortKey, setSortKey] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [compact, setCompact] = useState(false);

  // optional debug file (developer-provided local path)
  const UPLOADED_SCREENSHOT = "/mnt/data/cf317145-e8c6-48d4-a48e-b5ad34a00e8b.png";

  // Fetch function - append-only behavior
  const fetchPage = useCallback(
    async (reqLimit) => {
      if (fetchingRef.current) return;
      if (idsRef.current.size >= maxItems) return;

      setLoading(true);
      setError(null);
      fetchingRef.current = true;

      try {
        // getTwitter(limit, coin) - pass null for ALL coin
        const res = await getTwitter(reqLimit, coin === "ALL" ? null : coin);

        const unified = (res || []).map((it) => {
          const createdRaw = it.created_at || it.created_utc || it.date || it.published_at || it.time;
          const norm = normalizeSentiment(it);
          return {
            ...it,
            title: it.title || it.text || it.content || it.tweet || "",
            text: it.text || it.title || it.content || "",
            created_at: parseCreated(createdRaw),
            id: it.id || it._id || it.tweet_id || it.url || (it.title || it.text || "").slice(0, 40),
            sentiment_label: norm.label,
            polarity: norm.polarity,
          };
        });

        // append only new IDs to avoid re-rendering huge superset
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
        console.error("Twitter fetch error:", e);
        setError(e?.message || String(e) || "Failed to load tweets.");
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [coin, maxItems]
  );

  // Reset when coin changes
  useEffect(() => {
    idsRef.current = new Set();
    setItems([]);
    setPage(1);
    setError(null);
  }, [coin]);

  // Fetch when page changes (page -> requestLimit = page * pageSize)
  useEffect(() => {
    const reqLimit = Math.min(page * pageSize, maxItems);
    fetchPage(reqLimit);
  }, [page, pageSize, fetchPage, maxItems]);

  // IntersectionObserver sentinel
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

  // Client-side filter & sort
  const filtered = useMemo(() => {
    let arr = [...items];
    const q = (query || "").toLowerCase().trim();

    if (q) {
      arr = arr.filter(
        (it) =>
          (it.title || "").toLowerCase().includes(q) ||
          (it.text || "").toLowerCase().includes(q) ||
          (String(it.coin || "")).toLowerCase().includes(q)
      );
    }

    // sentiment filter
    if (sentimentFilter !== "all") {
      arr = arr.filter((it) => {
        const lab = (it.sentiment_label || "").toLowerCase();
        if (sentimentFilter === "positive") return lab.includes("pos") || (it.polarity !== null && it.polarity > 0);
        if (sentimentFilter === "negative") return lab.includes("neg") || (it.polarity !== null && it.polarity < 0);
        if (sentimentFilter === "neutral") return lab.includes("neu") || (it.polarity === 0);
        return true;
      });
    }

    // date filter
    if (dateFilter !== "all") {
      const now = Date.now();
      arr = arr.filter((it) => {
        if (!it.created_at) return false;
        const t = new Date(it.created_at).getTime();

        if (dateFilter === "last24") return now - t <= 24 * 60 * 60 * 1000;
        if (dateFilter === "last7") return now - t <= 7 * 24 * 60 * 60 * 1000;
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

    // sorting
    arr.sort((a, b) => {
      let va = 0,
        vb = 0;
      if (sortKey === "date") {
        va = a.created_at ? new Date(a.created_at).getTime() : 0;
        vb = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else {
        va = a.polarity ?? 0;
        vb = b.polarity ?? 0;
      }
      if (va < vb) return sortDirection === "asc" ? -1 : 1;
      if (va > vb) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [items, query, sentimentFilter, dateFilter, sortKey, sortDirection]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tweets..."
          className="px-2 py-1 rounded bg-cp-bg border border-white/10 text-sm w-full sm:w-44"
        />

      

        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          className="px-2 py-1 rounded bg-cp-bg border border-white/10 text-sm"
        >
          <option value="all">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>

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
          <option value="polarity-desc">Highest Polarity</option>
          <option value="polarity-asc">Lowest Polarity</option>
        </select>

        <button
          onClick={() => setCompact((p) => !p)}
          className="px-2 py-1 rounded border border-white/10 text-xs"
        >
          {compact ? "Expand" : "Compact"}
        </button>

        
      </div>

      {/* List */}
      <div className={`space-y-3 ${compact ? "max-h-[300px]" : "max-h-[520px]"} overflow-auto pr-2`}>
        {error && <div className="text-cp-magenta text-sm py-2">Error: {error}</div>}
        {!loading && filtered.length === 0 && <div className="text-gray-400 text-sm py-4">No tweets found.</div>}

        {filtered.map((p) => (
          <div key={p.id || Math.random()} className="p-3 rounded border border-white/8 bg-cp-bg/40">
            <a href={p.url || "#"} target="_blank" rel="noreferrer" className="font-medium text-gray-100 block">
              {p.title || p.text || "No title"}
            </a>

            <div className="flex items-center gap-2 text-sm mt-2">
              <span className="px-2 py-0.5 rounded-full bg-cp-purple/20 text-cp-purple text-xs">Twitter</span>

              <span className={`text-xs font-semibold ${p.sentiment_label === "positive" ? "text-cp-neon" : p.sentiment_label === "negative" ? "text-cp-magenta" : "text-amber-300"}`}>
                {p.sentiment_label}
              </span>

              <span className="text-gray-400 ml-auto">{p.created_at ? timeSince(p.created_at) : "Date N/A"}</span>
            </div>

            {!compact && p.text && <p className="text-gray-300 mt-2 text-sm line-clamp-2">{p.text}</p>}
          </div>
        ))}

        {/* sentinel */}
        <div ref={sentinelRef} className="h-6" />

        {loading && <div className="text-gray-400 text-center py-2">Loading…</div>}
        {idsRef.current.size >= maxItems && <div className="text-gray-400 text-center py-2">Reached max items ({maxItems}).</div>}

        {/* debug: uploaded screenshot path (local) */}
        <div className="text-xs text-gray-400 mt-2">Debug file: <code className="break-all">{UPLOADED_SCREENSHOT}</code></div>
      </div>
    </div>
  );
}
