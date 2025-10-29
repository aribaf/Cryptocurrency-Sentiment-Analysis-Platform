import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";

export default function SentimentCard({ title, label, score }) {
  // --- Determine Displayed Score ---
  let scoreDisplay = "—";
  if (score !== undefined && score !== null) {
    if (score > 1.0 || score < -1.0) scoreDisplay = Math.round(score * 10) / 10;
    else scoreDisplay = Math.round(score * 100) / 100;
  }

  // --- Mood Color Logic ---
  const moodColor = (s) => {
    if (typeof s === "number") {
      if (s >= 50 || s > 0.05) return "text-green-600";
      if (s <= 30 || s < -0.05) return "text-red-600";
      return "text-yellow-600";
    }
    return "text-gray-700";
  };

  // --- Choose Arrow Icon ---
  const getArrow = (label) => {
    if (label === "Positive") return <ArrowUp className="text-green-500" size={18} />;
    if (label === "Negative") return <ArrowDown className="text-red-500" size={18} />;
    return <ArrowRight className="text-gray-400" size={18} />;
  };

  // --- JSX Return ---
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-300 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-center">
        {/* Card Title */}
        <p className="text-sm font-medium text-gray-600">{title}</p>

        {/* Arrow Icon (based on sentiment) */}
        {getArrow(label)}
      </div>

      <div className="mt-2">
        {/* Sentiment Label */}
        <h3 className={`text-lg font-semibold ${moodColor(score)}`}>
          {label || "Loading..."}
        </h3>

        {/* Sentiment Score */}
        <p className="text-gray-700 text-sm mt-1">
          Score: <span className="font-semibold">{scoreDisplay}</span>
        </p>
      </div>
    </div>
  );
}
