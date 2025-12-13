// src/components/SearchFilter.jsx
import React, { useState, useEffect, useCallback } from "react";
import { getTwitter, getReddit, getNews } from "../api/api";

/*
  Functional SearchFilter:
  - applies q, period (days), source
  - fetches data from getTwitter/getReddit/getNews
  - normalizes and displays results under the filters
  - shows uploaded file preview using local path (your environment will convert to URL)
*/

// Local uploaded file (developer-provided local path; your env will transform to a URL)
const UPLOADED_FILE = "/mnt/data/eef2108f-5f32-4f85-9381-88a99e2ae7b8.png";

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

const normalize = (raw, source) => {
  // Normalize different shapes from APIs to unified item
  const title = raw.title || raw.text || raw.content || raw.tweet || "";
  const text = raw.text || raw.selftext || raw.content || raw.description || "";
  const url = raw.url || raw.permalink || raw.tweet_url || raw.link || "#";
  const id = raw.id || raw._id || raw.tweet_id || url || (title || text).slice(0, 40);
  const created_at =
    raw.created_at || raw.created_utc || raw.published_at || raw.date || raw.time || null;
  // sentiment might be in different fields
  const label =
    (raw.sentiment_label && String(raw.sentiment_label)) ||
    (raw.label && String(raw.label)) ||
    (raw.sentiment && raw.sentiment.label && String(raw.sentiment.label)) ||
    "";
  const sentiment_label = String(label || "").toLowerCase();
  return {
    id,
    source,
    title,
    text,
    url,
    created_at: parseCreated(created_at),
    sentiment_label,
    raw,
  };
};

export default function SearchFilter({
  onApply,
  initialCoin = "",
  initialPeriod = 30,
  initialSource = "all",
}) {
  const [q, setQ] = useState(initialCoin);
  const [period, setPeriod] = useState(String(initialPeriod));
  const [source, setSource] = useState(initialSource);

  // results
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setQ(initialCoin);
  }, [initialCoin]);

  // apply payload to parent (existing behavior)
  const applyParent = () => {
    const payload = {
      q: q.trim(),
      period: Number(period),
      source,
    };
    onApply && onApply(payload);
  };

  // NEW: fetch concrete posts and display them
  const fetchAndShow = useCallback(
  async (opts = {}) => {
    const {
      q: kw = q,
      periodDays = Number(period),
      source: src = source,
      limit = 200,
    } = opts;

    setLoading(true);
    setError(null);
    setResults([]);

    // choose sources to request
    const sourcesToCall =
      src === "all" ? ["twitter", "reddit", "news"] : [src];

    // safety limits (per-source)
    const perSourceLimit = limit;


      try {
        const promises = sourcesToCall.map(async (s) => {
          if (s === "twitter") {
            const resp = await getTwitter(perSourceLimit, null); // pass coin filtering at client side
            return (resp || []).map((r) => normalize(r, "twitter"));
          }
          if (s === "reddit") {
            const resp = await getReddit(perSourceLimit, null);
            return (resp || []).map((r) => normalize(r, "reddit"));
          }
          if (s === "news") {
            const resp = await getNews(perSourceLimit, null);
            return (resp || []).map((r) => normalize(r, "news"));
          }
          return [];
        });

        const sets = await Promise.all(promises);
        // flat array
        let unified = sets.flat();

        // client-side filters
        const now = Date.now();
        const periodMs = Number(period) * 24 * 60 * 60 * 1000;

        unified = unified.filter((it) => {
          // filter by q if provided: match coin ticker or title/text
          if (kw && kw.trim()) {
            const t = kw.trim().toLowerCase();
            const coinMatch =
              (it.raw && (it.raw.coin || it.raw.ticker || it.raw.symbol)) ||
              "";
            if (
              !(
                String(coinMatch || "").toLowerCase().includes(t) ||
                (it.title || "").toLowerCase().includes(t) ||
                (it.text || "").toLowerCase().includes(t)
              )
            ) {
              return false;
            }
          }

          // date filter by periodDays (if specified)
          if (periodDays && periodDays > 0) {
            if (!it.created_at) return false;
            const t = new Date(it.created_at).getTime();
            if (now - t > periodDays * 24 * 60 * 60 * 1000) return false;
          }

          return true;
        });

        // dedupe by id (keep first occurrence)
        const seen = new Set();
        const deduped = [];
        for (const u of unified) {
          if (!u.id) continue;
          if (!seen.has(u.id)) {
            seen.add(u.id);
            deduped.push(u);
          }
        }

        // simple sort: newest first
        deduped.sort((a, b) => {
          const va = a.created_at ? new Date(a.created_at).getTime() : 0;
          const vb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return vb - va;
        });

        setResults(deduped);
      } catch (err) {
        console.error("SearchFilter fetch error:", err);
        setError(err?.message || String(err) || "Failed to fetch results");
      } finally {
        setLoading(false);
      }
    },
    [period]
  );

  // User pressed Apply: call both parent (existing flow) and fetch+show
 const apply = () => {
  applyParent();
  fetchAndShow({ q, periodDays: Number(period), source, limit: 200 });
};


  const reset = () => {
    setQ(initialCoin || "");
    setPeriod(String(initialPeriod || 30));
    setSource(initialSource || "all");
    setResults([]);
    setError(null);
    onApply &&
      onApply({
        q: initialCoin || "",
        period: Number(initialPeriod || 30),
        source: initialSource || "all",
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") apply();
  };

  const isModified =
    q.trim() !== (initialCoin || "") ||
    Number(period) !== Number(initialPeriod || 30) ||
    source !== (initialSource || "all");

  return (
    <div className="bg-cp-panel/90 rounded-xl p-6 shadow-md border border-white/5 text-white">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-lg font-semibold text-white">Search</h4>
        {isModified && (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] text-cp-neon hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Filter sentiment by coin/keyword, time period, and data source. Results
        from the backend are displayed below.
      </p>

      {/* Preview uploaded file (local path) */}
      <div className="mb-3">
        <img
          src={UPLOADED_FILE}
          alt="uploaded preview"
          className="w-full max-w-xs rounded-md border border-white/10 mb-2"
          onError={(e) => {
            // hide broken image if path not mapped by env
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      {/* Active filter summary */}
      <div className="flex flex-wrap gap-2 mb-4 text-[11px]">
        {q.trim() && (
          <span className="px-2 py-1 rounded-full bg-cp-bg/80 border border-white/10 text-gray-200">
            Coin: <span className="text-cp-neon">{q.trim()}</span>
          </span>
        )}
        <span className="px-2 py-1 rounded-full bg-cp-bg/80 border border-white/10 text-gray-200">
          Period:{" "}
          <span className="text-cp-neon">
            {period === "7"
              ? "Last 7 days"
              : period === "90"
              ? "Last 90 days"
              : `Last ${period} days`}
          </span>
        </span>
        <span className="px-2 py-1 rounded-full bg-cp-bg/80 border border-white/10 text-gray-200">
          Source:{" "}
          <span className="text-cp-neon">
            {source === "all" ? "All" : source.charAt(0).toUpperCase() + source.slice(1)}
          </span>
        </span>
      </div>

      <div className="space-y-4">
        {/* Crypto search input */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1 uppercase tracking-wide">
            Cryptocurrency / Keyword
          </label>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              type="text"
              placeholder="e.g. bitcoin, BTC, ethereum, nft"
              className="
                flex-1 px-3 py-2
                rounded-md
                text-sm
                bg-cp-bg/80
                border border-white/10
                text-gray-100
                placeholder:text-gray-500
                focus:outline-none
                focus:border-cp-neon
                focus:ring-1
                focus:ring-cp-neon
              "
            />
            <button
              type="button"
              onClick={apply}
              className="
                px-4 py-2
                rounded-md
                text-sm font-medium
                bg-cp-neon text-black
                hover:bg-cp-neon/90
                transition
                shadow-[0_0_18px_rgba(217,255,47,0.35)]
              "
            >
              Search
            </button>
          </div>
        </div>

        {/* Time period */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1 uppercase tracking-wide">
            Time Period (days)
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="
              w-full px-3 py-2
              rounded-md
              text-sm
              bg-cp-bg/80
              border border-white/10
              text-gray-100
              focus:outline-none
              focus:border-cp-neon
              focus:ring-1
              focus:ring-cp-neon
            "
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {/* Data source */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1 uppercase tracking-wide">
            Data Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="
              w-full px-3 py-2
              rounded-md
              text-sm
              bg-cp-bg/80
              border border-white/10
              text-gray-100
              focus:outline-none
              focus:border-cp-neon
              focus:ring-1
              focus:ring-cp-neon
            "
          >
            <option value="all">All Sources</option>
            <option value="reddit">Reddit</option>
            <option value="twitter">Twitter</option>
            <option value="news">News</option>
          </select>
        </div>

        <button
          type="button"
          onClick={apply}
          disabled={!isModified}
          className={`
            w-full mt-3 py-2
            rounded-md
            text-sm font-semibold
            transition
            shadow-[0_0_20px_rgba(217,255,47,0.35)]
            ${isModified ? "bg-cp-neon text-black hover:bg-cp-neon/90" : "bg-gray-700 text-gray-400 cursor-not-allowed shadow-none"}
          `}
        >
          Apply Filters & Fetch
        </button>
      </div>

      {/* Results */}
      <div className="mt-4">
        <h5 className="text-sm font-semibold mb-2 text-white">Results</h5>

        {loading && <div className="text-gray-300 text-sm py-2">Loading results…</div>}
        {error && <div className="text-cp-magenta text-sm py-2">Error: {error}</div>}

        {!loading && !error && results.length === 0 && (
          <div className="text-gray-400 text-sm py-4">No results yet. Use the filters above and click "Apply".</div>
        )}

        <div className="space-y-3 max-h-[320px] overflow-auto pr-2">
          {results.map((r) => (
            <a
              key={r.id}
              href={r.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="block p-3 rounded-lg border border-white/8 bg-cp-bg/40 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-100 truncate">{r.title || "No title"}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                      {r.source}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{r.created_at ? timeSince(r.created_at) : "N/A"}</span>
                  </div>
                  {r.sentiment_label && (
                    <div className="mt-1 text-xs">
                      <span className={`font-semibold ${r.sentiment_label.includes("pos") ? "text-cp-neon" : r.sentiment_label.includes("neg") ? "text-cp-magenta" : "text-amber-300"}`}>
                        {r.sentiment_label}
                      </span>
                    </div>
                  )}
                  {r.text && <p className="mt-2 text-gray-300 text-sm line-clamp-2">{r.text}</p>}
                </div>
              </div>
            </a>
          ))}
        </div>
        {!loading && results.length > 0 && (
  <button
    type="button"
    onClick={() =>
      fetchAndShow({
        q,
        periodDays: Number(period),
        source,
        // ask backend for more than we already have
        limit: results.length + 200,
      })
    }
    className="
      mt-3 w-full py-2
      rounded-md text-sm font-semibold
      bg-cp-bg border border-white/10 text-gray-100
      hover:border-cp-neon hover:text-cp-neon
      transition
    "
  >
    Load more results
  </button>
)}

      </div>
    </div>
  );
}
