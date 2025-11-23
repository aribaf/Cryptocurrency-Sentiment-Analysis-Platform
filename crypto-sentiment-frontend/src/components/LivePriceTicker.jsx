// src/components/LivePriceTicker.jsx
import React, { useEffect, useState } from 'react';

/**
 * LivePriceTicker
 * - Polls a simple `/api/prices?symbols=BTC,ETH` endpoint every 5s (adjustable)
 * - Expects API response shape: { BTC: { price: 12345.67, chg24h: 0.0123 }, ETH: { price: ..., chg24h: ... } }
 * - If your app exposes a websocket feed, replace the polling logic with a websocket connection.
 *
 * Usage:
 * <LivePriceTicker symbols={['BTC','ETH','SOLANA']} pollInterval={5000} />
 */

const formatPrice = (p) => {
  if (p === null || p === undefined || Number.isNaN(Number(p))) return '—';
  const n = Number(p);
  if (n >= 1000) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return '$' + n.toFixed(2);
};

export default function LivePriceTicker({ symbols = ['BTC', 'ETH'], pollInterval = 5000 }) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let timer = null;

    const fetchPrices = async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = symbols.join(',');
        // Replace this with your real API endpoint if needed
        const res = await fetch(`/api/prices?symbols=${encodeURIComponent(qs)}`);
        if (!res.ok) throw new Error('Failed to fetch prices');
        const data = await res.json();
        // Expecting object keyed by symbol
        if (mounted) {
          setPrices(data || {});
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load prices');
          setLoading(false);
        }
      }
    };

    // initial fetch
    fetchPrices();

    // poll
    timer = setInterval(fetchPrices, pollInterval);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [symbols.join(','), pollInterval]);

  return (
    <div className="bg-cp-panel rounded-xl p-3 flex items-center space-x-4 text-sm">
      <div className="font-semibold text-gray-300 mr-2">Markets</div>
      <div className="flex items-center space-x-3 overflow-x-auto">
        {loading && <div className="text-gray-400">Loading...</div>}
        {error && <div className="text-cp-magenta">{error}</div>}
        {!loading &&
          !error &&
          symbols.map((s) => {
            const p = prices[s] || {};
            const price = p.price ?? null;
            const chg = p.chg24h ?? null;
            const up = typeof chg === 'number' ? chg >= 0 : null;
            return (
              <div key={s} className="flex items-center space-x-2 px-3 py-1 rounded-md bg-cp-bg/60 border border-white/5 min-w-[110px]">
                <div className="font-medium">{s}</div>
                <div className="text-sm">{formatPrice(price)}</div>
                <div className={`text-xs font-semibold ${up === null ? 'text-gray-300' : up ? 'text-green-400' : 'text-red-400'}`}>
                  {typeof chg === 'number' ? `${(chg * 100).toFixed(2)}%` : '—'}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}