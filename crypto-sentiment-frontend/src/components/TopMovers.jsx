// src/components/TopMovers.jsx
import React, { useEffect, useState } from 'react';

/**
 * TopMovers
 * - Polls `/api/market/movers?limit=8` (or similar) to display top gainers / losers
 * - Expected response: [{ symbol: 'BTC', name: 'Bitcoin', change: 0.023, volume: 12345678 }, ...]
 *
 * Usage:
 * <TopMovers limit={8} refreshInterval={15000} />
 */

const formatVolume = (v) => {
  if (v === null || v === undefined) return '—';
  try {
    return '$' + Number(v).toLocaleString();
  } catch {
    return String(v);
  }
};

export default function TopMovers({ limit = 8, refreshInterval = 15000 }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let timer = null;

    const fetchMovers = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/market/movers?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch movers');
        const data = await res.json();
        if (mounted) {
          setList(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load movers');
          setLoading(false);
        }
      }
    };

    fetchMovers();
    timer = setInterval(fetchMovers, refreshInterval);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [limit, refreshInterval]);

  return (
    <div className="bg-cp-panel rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold">Top Movers</h4>
        <div className="text-xs text-gray-400">Live</div>
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading movers…</div>}
      {error && <div className="text-cp-magenta text-sm">{error}</div>}

      {!loading && !error && list.length === 0 && (
        <div className="text-gray-400 text-sm">No movers available.</div>
      )}

      {!loading && !error && list.length > 0 && (
        <ul className="space-y-2 text-sm">
          {list.map((it) => {
            const up = typeof it.change === 'number' ? it.change >= 0 : null;
            return (
              <li key={it.symbol} className="flex items-center justify-between py-2 px-2 rounded hover:bg-cp-bg/60 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="font-medium">{it.symbol}</div>
                  <div className="text-xs text-gray-400">{it.name}</div>
                </div>
                <div className="text-right">
                  <div className={up ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {typeof it.change === 'number' ? `${(it.change * 100).toFixed(1)}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-400">{formatVolume(it.volume)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}