export default function AdminStatCard({ title, value, subtitle }) {
  return (
    <div className="bg-cp-panel border border-white/10 rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}
