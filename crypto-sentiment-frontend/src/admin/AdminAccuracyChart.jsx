import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function AdminAccuracyChart({ data }) {
  return (
    <div className="bg-cp-panel border border-white/10 rounded-xl p-4 h-[300px]">
      <h3 className="text-sm font-semibold mb-3">
        Prediction Accuracy Over Time
      </h3>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="time" tick={{ fill: "#9CA3AF" }} />
          <YAxis tick={{ fill: "#9CA3AF" }} />
          <Tooltip />
          <Legend />
          <Line dataKey="short" stroke="#10b981" strokeWidth={2} />
          <Line dataKey="mid" stroke="#60a5fa" strokeWidth={2} />
          <Line dataKey="long" stroke="#f59e0b" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
