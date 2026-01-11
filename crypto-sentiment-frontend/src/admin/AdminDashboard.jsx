import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminAlerts from "./AdminAlerts";
import AdminModelAccuracy from "./AdminModelAccuracy";
import {
  UsersIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  ChartBarIcon,
  NewspaperIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

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
  const userStats = status.user_stats || {};
  const last = status.last_scrape || {};

  const twitterCount = stats.tweet_count || 0;
  const redditCount = stats.reddit_count || 0;
  const newsCount = stats.news_count || 0;

  const totalRecords = twitterCount + redditCount + newsCount;
  
  const totalUsers = userStats.total_users || 0;
  const activeUsers = userStats.active_users || 0;
  const adminUsers = userStats.admin_users || 0;
  const recentUsers = userStats.recent_users_7d || 0;

  const apiStatus =
    twitterCount || redditCount || newsCount ? "Online" : "Unknown";

return (
  <div className="space-y-8 text-white">
    <h1 className="text-2xl font-bold">Admin Dashboard</h1>

    {/* User Stats Grid */}
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <UsersIcon className="w-5 h-5" />
        User Statistics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={<UsersIcon className="w-6 h-6 text-blue-400" />}
          bgColor="bg-blue-500/10"
        />
        <StatCard
          title="Active Users"
          value={activeUsers}
          icon={<CheckCircleIcon className="w-6 h-6 text-green-400" />}
          bgColor="bg-green-500/10"
        />
        <StatCard
          title="Admin Users"
          value={adminUsers}
          icon={<ShieldCheckIcon className="w-6 h-6 text-purple-400" />}
          bgColor="bg-purple-500/10"
        />
        <StatCard
          title="New Users (7d)"
          value={recentUsers}
          icon={<UserPlusIcon className="w-6 h-6 text-cp-neon" />}
          bgColor="bg-cp-neon/10"
        />
      </div>
    </div>

    {/* System Stats Grid */}
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ChartBarIcon className="w-5 h-5" />
        System Metrics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card title="Total Records" value={totalRecords.toLocaleString()} />
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
    </div>

    {/* 🔔 SYSTEM ALERTS */}
    <AdminAlerts lastScrape={last} />

    {/* 📊 DATA SOURCES */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DataSourceCard
        title="Twitter"
        count={twitterCount}
        icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
        color="text-blue-400"
      />
      <DataSourceCard
        title="Reddit"
        count={redditCount}
        icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
        color="text-orange-400"
      />
      <DataSourceCard
        title="News"
        count={newsCount}
        icon={<NewspaperIcon className="w-8 h-8" />}
        color="text-green-400"
      />
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

function StatCard({ title, value, icon, bgColor }) {
  return (
    <div className="bg-cp-panel p-5 rounded-xl border border-white/10 hover:border-white/20 transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400 mb-1">{title}</div>
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function DataSourceCard({ title, count, icon, color }) {
  return (
    <div className="bg-cp-panel p-6 rounded-xl border border-white/10 hover:border-white/20 transition">
      <div className="flex items-center gap-4">
        <div className={color}>
          {icon}
        </div>
        <div>
          <div className="text-sm text-gray-400">{title}</div>
          <div className="text-2xl font-bold mt-1">{count.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">records</div>
        </div>
      </div>
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

