// src/components/sentiment_card.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";

/**
 * Props:
 * - title (string)
 * - label (string) like "Positive" / "Neutral" / "Negative"
 * - score (number) either in 0-100 percent or -1..1 range
 * - sourceKey (string) required: "twitter" | "reddit" | "news" | "overall"
 * - coin (string) optional: current coin like "BTC"
 * - onClick (function) optional: custom click handler (overrides navigation)
 */
export default function SentimentCard({
  title,
  label,
  score,
  sourceKey,
  coin = "BTC",
  onClick,
}) {
  const navigate = useNavigate();

  // --- Determine Displayed Score ---
  let scoreDisplay = "—";
  if (score !== undefined && score !== null && !Number.isNaN(score)) {
    if (Math.abs(score) > 1) {
      // likely percent (0–100)
      scoreDisplay = Math.round(score * 10) / 10;
    } else {
      // -1..1 range
      scoreDisplay = Math.round(score * 100) / 100;
    }
  }

  // --- Mood Color Logic ---
  const moodColor = (s) => {
    if (typeof s === "number") {
      if (s >= 50 || s > 0.05) return "text-cp-neon";
      if (s <= 30 || s < -0.05) return "text-cp-magenta";
      return "text-amber-300";
    }
    return "text-gray-300";
  };

  // --- Choose Arrow Icon ---
  const getArrow = (lbl) => {
    if (lbl === "Positive") {
      return <ArrowUp className="text-cp-neon" size={18} />;
    }
    if (lbl === "Negative") {
      return <ArrowDown className="text-cp-magenta" size={18} />;
    }
    return <ArrowRight className="text-gray-400" size={18} />;
  };

  // --- Navigation handler (default) ---
  function handleActivate(e) {
    if (typeof onClick === "function") {
      onClick(e);
      return;
    }
    if (!sourceKey) {
      console.warn("SentimentCard: sourceKey prop missing.");
      return;
    }
    e?.preventDefault?.();
    navigate(
      `/breakdown/${encodeURIComponent(sourceKey)}?coin=${encodeURIComponent(
        coin
      )}`
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleActivate(e);
      }}
      aria-label={`Open ${title} breakdown`}
      className="
        bg-cp-panel/90
        rounded-xl
        p-4
        shadow-sm
        border border-white/5
        hover:border-cp-neon/80
        hover:shadow-[0_0_30px_rgba(217,255,47,0.25)]
        transition
        duration-200
        cursor-pointer
        select-none
        focus:outline-none
        focus:ring-2
        focus:ring-cp-neon/70
        focus:ring-offset-2
        focus:ring-offset-cp-bg
      "
    >
      <div className="flex justify-between items-start gap-2">
        {/* Card Title */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            {sourceKey && (
              <>
                Source:{" "}
                <span className="font-mono text-gray-300">
                  {sourceKey.toUpperCase()}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Arrow Icon (based on sentiment) */}
        <div className="shrink-0 flex items-center justify-center rounded-full bg-cp-bg/70 p-1.5">
          {getArrow(label)}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        {/* Sentiment Label */}
        <h3 className={`text-lg font-semibold ${moodColor(score)}`}>
          {label || "Loading..."}
        </h3>

        {/* Sentiment Score */}
        <p className="text-xs text-gray-400">
          Score:{" "}
          <span className="font-semibold text-gray-100">{scoreDisplay}</span>
        </p>
      </div>
    </div>
  );
}
