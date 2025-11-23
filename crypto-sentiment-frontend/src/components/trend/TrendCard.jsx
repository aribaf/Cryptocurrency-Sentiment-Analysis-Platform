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

function Bar({ pct, color = "bg-blue-500" }) {
  const safe = clamp(pct, 0, 100);
  return (
    <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
      <div className={`${color} h-3`} style={{ width: `${safe}%` }} />
    </div>
  );
}

export default function TrendCard({ item = {}, onViewHistory }) {
  // item: { cryptocurrency, current_price, predicted_next_price, market_trend, confidence, twitter_score, reddit_score, news_score, overall_acc, short_term_acc, mid_term_acc, long_term_acc }
  const name = item.cryptocurrency ?? item.name ?? "Unknown";
  const current_price = safeNumber(item.current_price, null);
  const predicted_next_price = safeNumber(item.predicted_next_price, null);

  // parse confidence & overall accuracy (accept either number or "85.71%")
  const confidencePct = parsePercent(item.confidence ?? item.confidence_pct ?? item.confidence_percent ?? 0);
  const overallPct = parsePercent(item.overall_acc ?? item.overall_accuracy ?? item.overall ?? 0);

  const twitter = (item.twitter_score !== undefined && item.twitter_score !== null) ? item.twitter_score : 0;
  const reddit = (item.reddit_score !== undefined && item.reddit_score !== null) ? item.reddit_score : 0;
  const news = (item.news_score !== undefined && item.news_score !== null) ? item.news_score : 0;

  const prettyPrice = (v) => (v === null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 6 }));

  return (
    <div className="bg-black/30 border border-gray-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{name}</div>
            <div className="text-sm text-gray-400">{item.market_trend ?? "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Current</div>
            <div className="font-medium">{prettyPrice(current_price)}</div>
            <div className="text-sm text-gray-400">Predicted</div>
            <div className="font-medium">{prettyPrice(predicted_next_price)}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-400">Confidence</div>
            <Bar pct={confidencePct} color="bg-emerald-500" />
            <div className="text-xs text-gray-400 mt-1">{confidencePct}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Overall Accuracy</div>
            <Bar pct={overallPct} color="bg-sky-500" />
            <div className="text-xs text-gray-400 mt-1">{overallPct}%</div>
          </div>
        </div>
      </div>

      <div className="w-48 flex flex-col gap-2">
        <div className="text-xs text-gray-400">Social / News</div>
        <div className="flex gap-2 text-xs">
          <div className="flex-1">
            <div className="text-[10px] text-gray-400">Twitter</div>
            <div className="font-medium">{String(twitter)}</div>
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-gray-400">Reddit</div>
            <div className="font-medium">{String(reddit)}</div>
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-gray-400">News</div>
            <div className="font-medium">{String(news)}</div>
          </div>
        </div>

        <button
          onClick={() => onViewHistory && onViewHistory(name)}
          className="mt-2 px-3 py-1 bg-blue-600 rounded text-white text-sm"
        >
          View History
        </button>
      </div>
    </div>
  );
}
