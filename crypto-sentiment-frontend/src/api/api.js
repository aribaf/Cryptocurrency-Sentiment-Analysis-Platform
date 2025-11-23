// src/api/api.js
import axios from "axios";

const rawBase = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
// Ensure base ends with "/api" (so callers below use paths like "/sentiment/overview")
const API_BASE = rawBase.endsWith("/api") ? rawBase : rawBase.replace(/\/$/, "") + "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

// helper to unwrap axios responses and return the most useful payload
async function handleRequest(promise) {
  try {
    const res = await promise;
    // Prefer res.data.data if present (your FastAPI returns { data: ... })
    return res.data && res.data.data !== undefined ? res.data.data : res.data;
  } catch (err) {
    // Normalize error message for callers
    const msg =
      err?.response?.data?.detail ||
      err?.response?.data?.error ||
      err?.message ||
      "Network or server error";
    // Re-throw so pages/components can catch and handle it
    throw new Error(msg);
  }
}

/* =========================
   Trend endpoints
   Backend routes assumed:
     GET  /trends                   -> list available trends (coins / items)
     GET  /trends/:coin             -> current trend info for coin
     GET  /trends/:coin/history?days=90 -> history
   NOTE: baseURL already includes /api so we use paths like "/trends"
   ========================= */

export async function fetchTrends() {
  // returns array of trend items (e.g. coins)
  return await handleRequest(api.get("/trends"));
}

export async function fetchTrendForCoin(coin) {
  return await handleRequest(api.get(`/trends/${encodeURIComponent(coin)}`));
}

export async function fetchTrendHistory(coin, days = 90) {
  return await handleRequest(
    api.get(`/trends/${encodeURIComponent(coin)}/history`, { params: { days } })
  );
}

/* =========================
   Overview & sentiment endpoints
   (legacy / existing endpoints)
   ========================= */

export const getOverview = () => handleRequest(api.get("/sentiment/overview"));

export const getRecent = (limit = 30) =>
  handleRequest(api.get("/recent", { params: { limit } }));

// getTrends here is different from fetchTrends:
// getTrends(coin, unit) -> sentiment time-series for a specific coin
// in src/api/api.js — replace the existing getTrends line with this function

// helper: safe numeric parse & normalization to -1..1
function parseAndNormalizeValue(v) {
  if (v === null || v === undefined || v === "") return NaN;

  // remove percent sign and commas if present
  if (typeof v === "string") {
    const s = v.replace(/%/g, "").replace(/,/g, "").trim();
    if (s === "") return NaN;
    const n = Number(s);
    if (!Number.isFinite(n)) return NaN;
    // if looks like 0..100, treat as percent
    if (Math.abs(n) > 1 && Math.abs(n) <= 100) {
      return n / 100; // convert percent to 0..1
    }
    // otherwise assume already -1..1 or raw decimal
    return n;
  }

  if (typeof v === "number") {
    // if number is in 0..100 range (likely percent) -> normalize
    if (Math.abs(v) > 1 && Math.abs(v) <= 100) {
      return v / 100;
    }
    return v;
  }

  return NaN;
}

export const getTrends = async (coin = "BTC", unit = "day") => {
  const raw = await handleRequest(api.get(`/trends/${encodeURIComponent(coin)}`, { params: { unit } }));

  // If backend already returns the right shape, just return it
  // But be defensive: produce array of { time_bucket, twitter, reddit, news, overall }
  const rows = (Array.isArray(raw) ? raw : raw?.data || raw?.rows || raw?.items || []).map((r) => {
    // accept many possible time field names
    const timeRaw = r.time_bucket || r.time || r.time_iso || r.created_at || r.timestamp || r.date;

    // scores can be under per-source keys or in nested objects
    const twitterRaw = r.twitter ?? (r.by_source && r.by_source.twitter) ?? r.twitter_score ?? r.twitter_polarity ?? r.twitter_sentiment;
    const redditRaw  = r.reddit  ?? (r.by_source && r.by_source.reddit)  ?? r.reddit_score  ?? r.reddit_polarity  ?? r.reddit_sentiment;
    const newsRaw    = r.news    ?? (r.by_source && r.by_source.news)    ?? r.news_score    ?? r.news_polarity    ?? r.news_sentiment;
    const overallRaw = r.overall ?? r.mean_sentiment_score ?? r.time_weighted_polarity ?? r.avg_polarity ?? r.polarity ?? r.score;

    const twitter = parseAndNormalizeValue(twitterRaw);
    const reddit  = parseAndNormalizeValue(redditRaw);
    const news    = parseAndNormalizeValue(newsRaw);
    const overall = parseAndNormalizeValue(overallRaw);

    return {
      time_bucket: timeRaw,
      twitter: Number.isFinite(twitter) ? twitter : 0,
      reddit:  Number.isFinite(reddit)  ? reddit  : 0,
      news:    Number.isFinite(news)    ? news    : 0,
      overall: Number.isFinite(overall) ? overall : 0,
      __raw: r,
    };
  });

  // optional: quick sanity check log (dev only)
  try {
    const allTwitterZero = rows.every((row) => Math.abs(row.twitter) < 1e-6);
    if (allTwitterZero) {
      console.warn(`[getTrends] twitter series all zero for coin=${coin}. Check backend response shape or values. Sample raw:`, rows.slice(0,3).map(r=>r.__raw));
    }
  } catch (e) {
    // ignore logging errors
  }

  return rows;
};

// Per-source endpoints (Twitter / Reddit / News)
export const getTwitter = (limit = 25) =>
  handleRequest(api.get("/sentiment/twitter", { params: { limit } }));

// getReddit supports optional coin and optional AbortSignal `signal`
export const getReddit = (limit = 25, coin = null, signal = null) => {
  const params = { limit };
  if (coin) params.coin = coin;
  const config = { params };
  if (signal) config.signal = signal;
  return handleRequest(api.get("/recent/reddit", config));
};

export const getNews = (limit = 25) =>
  handleRequest(api.get("/sentiment/news", { params: { limit } }));

export const getHeatmap = (days = 30, unit = "day", source = "all") =>
  handleRequest(api.get("/sentiment/heatmap", { params: { days, unit, source } }));

export const getRecentReddit = (limit = 20) =>
  handleRequest(api.get("/recent/reddit", { params: { limit } }));

export const getBreakdown = (source = "twitter", coin = "BTC", top_n = 10) =>
  handleRequest(api.get("/sentiment/breakdown", { params: { source, coin, top_n } }));

export default api;
