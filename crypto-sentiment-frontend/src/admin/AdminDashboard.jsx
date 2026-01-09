import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminAlerts from "./AdminAlerts";
import AdminModelAccuracy from "./AdminModelAccuracy";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function AdminDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await axios.get(`${API_BASE}/api/admin/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setStatus(res.data);
      } catch (err) {
        console.error("Admin status error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [token]);

  if (loading) {
    return <div className="text-gray-400">Loading admin metrics…</div>;
  }

  if (!status) {
    return <div className="text-red-500">Failed to load admin data</div>;
  }

  const stats = status.data_stats || {};
  const last = status.last_scrape || {};

  const twitterCount = stats.tweet_count || 0;
  const redditCount = stats.reddit_count || 0;
  const newsCount = stats.news_count || 0;

  const totalRecords = twitterCount + redditCount + newsCount;

  const apiStatus =
    twitterCount || redditCount || newsCount ? "Online" : "Unknown";

return (
  <div className="space-y-8 text-white">
    <h1 className="text-2xl font-bold">Admin Dashboard</h1>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card title="Total Records" value={totalRecords} />
      <Card title="API Status" value={apiStatus} />
      <Card
        title="Last Twitter Scrape"
        value={last.twitter ? formatDate(last.twitter) : "N/A"}
      />
      <Card
        title="Last News Scrape"
        value={last.news ? formatDate(last.news) : "N/A"}
      />
      <Card
        title="Last Reddit Scrape"
        value={last.reddit ? formatDate(last.reddit) : "N/A"}
      />
    </div>

    {/* 🔔 SYSTEM ALERTS */}
    <AdminAlerts lastScrape={last} />

    {/* 📊 SENTIMENT VOLUME */}
    <div className="bg-cp-panel p-6 rounded-xl border border-white/10">
      <h3 className="font-semibold mb-3">
        Sentiment Volume per Source
      </h3>
      <ul className="text-sm text-gray-300 space-y-1">
        <li>Twitter: {twitterCount}</li>
        <li>Reddit: {redditCount}</li>
        <li>News: {newsCount}</li>
      </ul>
    </div>

    {/* 📈 MODEL ACCURACY */}
    <AdminModelAccuracy />
  </div>
);
}

function Card({ title, value }) {
  return (
    <div className="bg-cp-panel p-4 rounded-lg border border-white/10 min-w-0">
      <div className="text-xs text-gray-400 truncate">{title}</div>
      <div className="text-lg md:text-xl font-bold mt-1 truncate">{value}</div>
    </div>
  );
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "Invalid date";
  }
}

