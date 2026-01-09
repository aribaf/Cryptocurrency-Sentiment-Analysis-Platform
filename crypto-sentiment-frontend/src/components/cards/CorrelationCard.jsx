export default function CorrelationCard({ value }) {
  const strength =
    value > 0.6 ? "Strong" : value > 0.3 ? "Moderate" : "Weak";

  return (
    <div className="bg-cp-panel rounded-xl p-4 border border-white/5">
      <h4 className="text-sm font-semibold mb-1">
        Sentiment–Price Correlation
      </h4>
      <p className="text-2xl font-bold text-cp-neon">
        {value.toFixed(2)}
      </p>
      <p className="text-xs text-gray-400">
        {strength} relationship
      </p>
    </div>
  );
}
