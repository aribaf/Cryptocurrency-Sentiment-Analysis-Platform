import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminSentimentBar({ stats }) {
  const data = [
    { source: "Twitter", count: stats.tweet_count || 0 },
    { source: "Reddit", count: stats.reddit_count || 0 },
    { source: "News", count: stats.news_count || 0 },
  ];

  return (
    <div className="bg-cp-panel p-6 rounded-xl border border-white/10">
      <h3 className="font-semibold mb-4">Sentiment Volume per Source</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="source" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip />
            <Bar dataKey="count" fill="#C8F902" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
