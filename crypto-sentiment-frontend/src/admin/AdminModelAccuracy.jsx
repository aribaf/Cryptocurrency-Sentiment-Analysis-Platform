import AdminAccuracyChart from "./AdminAccuracyChart";

export default function AdminModelAccuracy() {
  // TEMP STATIC DATA (to confirm rendering)
  const data = [
    { time: "Day 1", short: 0.72, mid: 0.68, long: 0.61 },
    { time: "Day 2", short: 0.75, mid: 0.70, long: 0.65 },
    { time: "Day 3", short: 0.78, mid: 0.73, long: 0.69 },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-cp-panel p-6 rounded-xl border border-white/10">
        <h3 className="font-semibold mb-3">Model Accuracy</h3>

        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-gray-400">Short-term</div>
            <div className="text-xl font-bold">78%</div>
          </div>
          <div>
            <div className="text-gray-400">Mid-term</div>
            <div className="text-xl font-bold">73%</div>
          </div>
          <div>
            <div className="text-gray-400">Long-term</div>
            <div className="text-xl font-bold">69%</div>
          </div>
        </div>
      </div>

      <AdminAccuracyChart data={data} />
    </div>
  );
}
