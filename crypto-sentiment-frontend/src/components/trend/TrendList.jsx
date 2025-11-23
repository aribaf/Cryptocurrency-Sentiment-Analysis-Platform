// uploaded:TrendList.jsx

// ...
import TrendCard from "./TrendCard";

export default function TrendList({ trends = [] }) {
  const sorted = [...trends].sort(
    (a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0)
  );
  // FIX: Change 'data={t}' to 'item={t}'
  return (
    <div className="space-y-3">
      {sorted.map((t) => (
        <TrendCard key={t.cryptocurrency} item={t} />
      ))}
    </div>
  );
}