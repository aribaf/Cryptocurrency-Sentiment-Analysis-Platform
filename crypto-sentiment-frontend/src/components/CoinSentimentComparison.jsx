import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

/**
 * Props:
 *  - data: [{ coin: 'BTC', overall: 0.1, twitter: 0.05, reddit: 0.02, news: 0.03 }, ...]
 *  - onCoinClick(coinKey) optional: called when user clicks a coin name in the legend
 */

const DEFAULT_COLORS = {
  BTC: '#10b981',   // green
  ETH: '#60a5fa',   // blue
  SOLANA: '#f59e0b' // amber
};

function buildSeries(data) {
  const sources = ['overall', 'twitter', 'reddit', 'news'];
  // create rows: { source: 'overall', BTC: 0.1, ETH: 0.05, SOLANA: 0.02 }
  return sources.map((src) => {
    const row = { source: src };
    data.forEach((coinObj) => {
      const coinKey = (coinObj.coin || '').toUpperCase();
      row[coinKey] = Number(
        coinObj[src] ??
        coinObj[`by_source_${src}`] ??
        (coinObj.by_source && coinObj.by_source[src]) ??
        0
      );
    });
    return row;
  });
}

export default function CoinSentimentComparison({ data = [], onCoinClick }) {
  const [visible, setVisible] = useState({});
  const coins = useMemo(() => data.map((d) => (d.coin || '').toUpperCase()).filter(Boolean), [data]);
  const series = useMemo(() => buildSeries(data), [data]);

  // ensure all coins have a visibility entry
  useEffect(() => {
    if (coins.length === 0) return;
    setVisible((prev) => {
      const next = { ...prev };
      coins.forEach((c) => { if (!(c in next)) next[c] = true; });
      // remove keys not present any more
      Object.keys(next).forEach((k) => { if (!coins.includes(k)) delete next[k]; });
      return next;
    });
  }, [coins]);

  // check if all series values are zero -> show friendly message
  const totalPoints = series.reduce((acc, r) => acc + Object.keys(r).reduce((s, k) => (k === 'source' ? s : s + Math.abs(Number(r[k] || 0))), 0), 0);
  if (!data || data.length === 0 || totalPoints === 0) {
    return (
      <div className="bg-cp-panel rounded-xl p-4 border border-white/5 h-48 flex items-center justify-center text-gray-400">
        No comparison data available.
      </div>
    );
  }

  const toggle = (coin) => setVisible((p) => ({ ...p, [coin]: !p[coin] }));

  return (
    <div className="bg-cp-panel rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold">Coin Sentiment Comparison</h4>

        {/* Custom legend (click name to focus, click dot to toggle) */}
        <div className="flex items-center space-x-4">
          {coins.map((coinKey) => {
            const isVisible = visible[coinKey];
            return (
              <div key={coinKey} className="flex items-center space-x-2 cursor-pointer select-none">
                <button
                  onClick={() => { if (onCoinClick) onCoinClick(coinKey); }}
                  className="text-xs font-medium"
                  title={`Focus ${coinKey}`}
                >
                  <span style={{ color: DEFAULT_COLORS[coinKey] || '#c084fc' }} className="inline-block w-3 h-3 mr-1 rounded-full align-middle" />
                  <span className={`mr-1 ${isVisible ? 'text-white' : 'text-gray-500'}`}>{coinKey}</span>
                </button>

                <button
                  onClick={() => toggle(coinKey)}
                  aria-label={`toggle-${coinKey}`}
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${isVisible ? 'bg-white/10' : 'bg-white/5'}`}
                  title={`${isVisible ? 'Hide' : 'Show'} ${coinKey}`}
                >
                  <span className="text-xs" style={{ color: isVisible ? (DEFAULT_COLORS[coinKey] || '#fff') : '#9CA3AF' }}>
                    {isVisible ? '●' : '○'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
            <XAxis dataKey="source" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis tickFormatter={(v) => (v * 100).toFixed(0) + '%'} tick={{ fill: '#9CA3AF' }} />
            <Tooltip formatter={(value) => (Number(value) * 100).toFixed(2) + '%'} />

            {coins.map((coinKey) => {
              const color = DEFAULT_COLORS[coinKey] || '#c084fc';
              if (!visible[coinKey]) return null;
              return (
                <Line
                  key={coinKey}
                  type="monotone"
                  dataKey={coinKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
