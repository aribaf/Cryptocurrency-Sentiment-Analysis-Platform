// src/components/trend/TrendCard.jsx
import React from "react";

function clamp(n, a = 0, b = 100) {
  const num = Number(n) || 0;
  return Math.max(a, Math.min(b, num));
}

function parsePercent(x) {
  if (x === null || x === undefined) return 0;
  if (typeof x === "string") {
    const trimmed = x.trim();
    if (trimmed.endsWith("%")) {
      return clamp(parseFloat(trimmed.replace("%", "")) || 0);
    }
    return clamp(parseFloat(trimmed) || 0);
  }
  return clamp(Number(x));
}

function safeNumber(x, fallback = 0) {
  if (x === null || x === undefined || x === "") return fallback;
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function Bar({ pct, color = "bg-emerald-500" }) {
  const safe = clamp(pct, 0, 100);
  return (
    <div className="w-full h-2.5 rounded-full bg-gray-800/80 overflow-hidden">
      <div
        className={`${color} h-2.5 rounded-full transition-[width] duration-300`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

export default function TrendCard({ item = {}, onViewHistory }) {
  // item: { cryptocurrency, current_price, predicted_next_price, market_trend, confidence, twitter_score, reddit_score, news_score, overall_acc, short_term_acc, mid_term_acc, long_term_acc }
  const name = item.cryptocurrency ?? item.name ?? "Unknown";
  const current_price = safeNumber(item.current_price, null);
  const predicted_next_price = safeNumber(item.predicted_next_price, null);

  const confidencePct = parsePercent(
    item.confidence ?? item.confidence_pct ?? item.confidence_percent ?? 0
  );
  const overallPct = parsePercent(
    item.overall_acc ?? item.overall_accuracy ?? item.overall ?? 0
  );

  const twitter =
    item.twitter_score !== undefined && item.twitter_score !== null
      ? item.twitter_score
      : 0;
  const reddit =
    item.reddit_score !== undefined && item.reddit_score !== null
      ? item.reddit_score
      : 0;
  const news =
    item.news_score !== undefined && item.news_score !== null
      ? item.news_score
      : 0;

  const prettyPrice = (v) =>
    v === null
      ? "—"
      : Number(v).toLocaleString(undefined, {
          maximumFractionDigits: 6,
        });

  const trend = (item.market_trend || "").toLowerCase();
  const trendColor =
    trend.includes("bull") || trend.includes("up")
      ? "text-emerald-400"
      : trend.includes("bear") || trend.includes("down")
      ? "text-red-400"
      : "text-sky-300";

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:items-stretch hover:border-cp-neon/60 transition-colors">
      {/* Left: name + prices + bars */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-gray-400">
              {name}
            </div>
            <div className={`mt-1 text-lg font-semibold ${trendColor}`}>
              {item.market_trend ?? "—"}
            </div>
          </div>

          {/* Price block */}
          <div className="text-right text-sm">
            <div className="text-[11px] uppercase text-gray-500">Current</div>
            <div className="font-mono text-white text-base">
              {prettyPrice(current_price)}
            </div>
            <div className="mt-1 text-[11px] uppercase text-gray-500">
              Predicted
            </div>
            <div className="font-mono text-gray-100 text-base">
              {prettyPrice(predicted_next_price)}
            </div>
          </div>
        </div>

        {/* Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span>Model confidence</span>
              <span>{confidencePct}%</span>
            </div>
            <Bar pct={confidencePct} color="bg-emerald-500" />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span>Overall accuracy</span>
              <span>{overallPct}%</span>
            </div>
            <Bar pct={overallPct} color="bg-sky-500" />
          </div>
        </div>
      </div>

      {/* Right: social / button */}
      <div className="md:w-52 flex flex-col justify-between gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">Social / News</div>
          <div className="flex gap-3 text-xs">
            <div className="flex-1">
              <div className="text-[10px] uppercase text-gray-500">
                Twitter
              </div>
              <div className="font-mono text-sm text-gray-100">
                {String(twitter)}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase text-gray-500">
                Reddit
              </div>
              <div className="font-mono text-sm text-gray-100">
                {String(reddit)}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase text-gray-500">News</div>
              <div className="font-mono text-sm text-gray-100">
                {String(news)}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => onViewHistory && onViewHistory(name)}
          className="w-full mt-1 inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-cp-neon text-black text-xs sm:text-sm font-semibold hover:brightness-110 transition-colors"
        >
          View history
        </button>
      </div>
    </div>
  );
}
