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

// Overview & trends
export const getOverview = () => handleRequest(api.get("/sentiment/overview"));
export const getRecent = (limit = 30) => handleRequest(api.get(`/recent?limit=${limit}`));
export const getTrends = (coin = "BTC", unit = "day") =>
  handleRequest(api.get(`/trends/${encodeURIComponent(coin)}?unit=${unit}`));

// Per-source endpoints (Twitter / Reddit / News)
export const getTwitter = (limit = 25) => handleRequest(api.get(`/sentiment/twitter?limit=${limit}`));
// In src/api/api.js
export const getReddit = (limit = 25, coin = null, signal = null) => 
  handleRequest(api.get(`/recent/reddit?limit=${limit}${coin ? `&coin=${coin}` : ''}`, { signal }));export const getNews = (limit = 25) => handleRequest(api.get(`/sentiment/news?limit=${limit}`));
// src/api/api.js
// ...existing content...

// src/api/api.js
// ... existing imports and handleRequest ...

export const getHeatmap = (days = 30, unit = "day", source = "all") =>
  handleRequest(api.get(`/sentiment/heatmap?days=${days}&unit=${unit}&source=${source}`));

// Convenience: get recent reddit posts (alias to match previous examples)
export const getRecentReddit = (limit = 20) => handleRequest(api.get(`/recent/reddit?limit=${limit}`));
export const getBreakdown = (source = "twitter", coin = "BTC", top_n = 10) =>
  handleRequest(api.get(`/sentiment/breakdown`, { params: { source, coin, top_n } }));

export default api;
