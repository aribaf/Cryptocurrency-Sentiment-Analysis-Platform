// src/components/SentimentInsight.jsx
import React, { useMemo } from "react";

export default function SentimentInsight({ overview, trendData, coin, filters }) {
  const text = useMemo(() => {
    if (!overview || !trendData || trendData.length === 0) {
      return "Not enough data to generate insights yet.";
    }

    const overallScore = overview?.overall?.score ?? 0;

    const label =
      overallScore > 0.15
        ? "strongly positive"
        : overallScore > 0.05
        ? "moderately positive"
        : overallScore < -0.15
        ? "strongly negative"
        : overallScore < -0.05
        ? "moderately negative"
        : "mostly neutral";

    const bySource = overview.by_source || {};
    const sources = ["twitter", "reddit", "news"].filter(
      (s) => typeof bySource[s] === "number"
    );

    let topSource = null;
    if (sources.length > 0) {
      topSource = sources
        .map((s) => ({ key: s, score: bySource[s] }))
        .sort((a, b) => b.score - a.score)[0];
    }

    const n = trendData.length;
    const window = Math.max(1, Math.floor(n / 3));
    const avg = (arr) =>
      arr.reduce((sum, v) => sum + (v.overall ?? v.mean_sentiment_score ?? 0), 0) /
      (arr.length || 1);

    const earlyAvg = avg(trendData.slice(0, window));
    const recentAvg = avg(trendData.slice(-window));
    const delta = recentAvg - earlyAvg;

    let trendText = "has been relatively stable over the selected period.";
    if (delta > 0.05) {
      trendText = "has been trending upward recently.";
    } else if (delta < -0.05) {
      trendText = "has been trending downward recently.";
    }

    const periodLabel =
      filters?.period === 7
        ? "last 7 days"
        : filters?.period === 90
        ? "last 90 days"
        : "last 30 days";

    const srcLabel =
      !filters?.source || filters.source === "all"
        ? "across all sources"
        : `on ${filters.source.charAt(0).toUpperCase() + filters.source.slice(1)}`;

    const parts = [];

    parts.push(
      `${coin} sentiment is currently **${label}** (${(overallScore * 100).toFixed(
        1
      )}%) over the ${periodLabel} ${srcLabel}.`
    );

    if (topSource) {
      parts.push(
        `${
          topSource.key.charAt(0).toUpperCase() + topSource.key.slice(1)
        } shows the strongest signal at ${(topSource.score * 100).toFixed(1)}%.`
      );
    }

    parts.push(`Overall, sentiment ${trendText}`);

    return parts.join(" ");
  }, [overview, trendData, coin, filters]);

  return (
    <div className="bg-cp-panel/95 border border-white/5 rounded-xl p-4 sm:p-5 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold tracking-wide text-gray-100">
          AI Insight
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cp-bg/80 border border-white/10 text-gray-300">
          Auto-generated
        </span>
      </div>
      <p className="text-xs sm:text-[13px] leading-relaxed text-gray-300">
        {/* simple markdown-ish bold effect */}
        {text.split("**").map((chunk, idx) =>
          idx % 2 === 1 ? (
            <strong key={idx} className="text-cp-neon">
              {chunk}
            </strong>
          ) : (
            <span key={idx}>{chunk}</span>
          )
        )}
      </p>
    </div>
  );
}
