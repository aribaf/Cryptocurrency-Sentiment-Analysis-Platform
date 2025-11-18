// src/api/transactions.js
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => null);
  // backend sometimes returns { data: [...] } or just [...]
  if (!j) return null;
  if (Array.isArray(j)) return j;
  if (j && j.data && Array.isArray(j.data)) return j.data;
  return j;
}

export async function fetchTransactions(params = {}) {
  const url = new URL(`${API_BASE}/api/transactions`);
  Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.append(k, v));
  return await fetchJson(url.toString());
}

export async function fetchAlerts(min_value_usd = 100000) {
  const url = new URL(`${API_BASE}/api/transactions/alerts`);
  url.searchParams.append("min_value_usd", String(min_value_usd));
  return await fetchJson(url.toString());
}

export async function fetchWalletHistory(address, limit = 100) {
  const url = new URL(`${API_BASE}/api/transactions/wallet/${encodeURIComponent(address)}`);
  url.searchParams.append("limit", String(limit));
  return await fetchJson(url.toString());
}

export async function ingestTransaction(payload) {
  const r = await fetch(`${API_BASE}/api/transactions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return r.json();
}
