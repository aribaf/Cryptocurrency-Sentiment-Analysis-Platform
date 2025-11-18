// src/components/TransactionsPreview.jsx
import React, { useEffect, useState } from "react";

function TxRow({ tx }) {
  return (
    <div
      className="
        flex flex-col sm:flex-row sm:items-center justify-between
        gap-3 px-4 py-3
        border-t border-white/5
        hover:bg-cp-bg/60
        transition-colors
      "
    >
      {/* Left: chain + amount + addresses */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="
            w-9 h-9 sm:w-10 sm:h-10
            rounded-xl
            bg-cp-bg
            flex items-center justify-center
            text-[10px] sm:text-xs font-semibold
            text-cp-neon
            border border-white/10
          "
        >
          {tx.chain || "ETH"}
        </div>

        <div className="min-w-0">
          <div className="text-sm sm:text-base text-gray-100 truncate">
            <span className="font-semibold">{tx.amount}</span>{" "}
            <span className="text-gray-300">{tx.token}</span>
          </div>
          <div className="text-[11px] text-gray-400 truncate">
            {tx.fromShort} <span className="text-gray-500">→</span>{" "}
            {tx.toShort}
          </div>
        </div>
      </div>

      {/* Right: time (and future status if needed) */}
      <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-gray-400">
        <span className="whitespace-nowrap">{tx.timeAgo}</span>
      </div>
    </div>
  );
}

export default function TransactionsPreview() {
  const [txs, setTxs] = useState(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/transactions?limit=6")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!mounted) return;
        setTxs(
          data.map((tx) => ({
            ...tx,
            fromShort: tx.from?.slice(0, 8) ?? "0x1234",
            toShort: tx.to?.slice(0, 8) ?? "0xabcd",
            timeAgo: tx.time
              ? new Date(tx.time).toLocaleTimeString()
              : "just now",
          }))
        );
      })
      .catch(() => {
        if (!mounted) return;
        // fallback mock data so UI works locally
        setTxs([
          {
            txHash: "1",
            chain: "ETH",
            amount: "12.5",
            token: "ETH",
            fromShort: "0x12a3",
            toShort: "0x9f8b",
            timeAgo: "2m ago",
          },
          {
            txHash: "2",
            chain: "BTC",
            amount: "4.2",
            token: "BTC",
            fromShort: "1A2b",
            toShort: "3C4d",
            timeAgo: "5m ago",
          },
          {
            txHash: "3",
            chain: "SOL",
            amount: "1200",
            token: "SOL",
            fromShort: "Xc12",
            toShort: "Yz34",
            timeAgo: "9m ago",
          },
        ]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      className="
        rounded-2xl
        bg-cp-panel/95
        border border-white/5
        shadow-md
        flex flex-col
      "
    >
      {/* Header */}
      <div
        className="
          px-4 py-3
          flex flex-col sm:flex-row
          sm:items-center sm:justify-between
          gap-2
        "
      >
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">
            Latest Large Transactions
          </p>
          <p className="text-sm sm:text-base text-gray-100 font-medium">
            Monitoring wallet & token flows
          </p>
        </div>
        <a
          href="/transactions"
          className="
            inline-flex items-center justify-center
            text-xs sm:text-sm font-semibold
            px-3 py-1.5 rounded-full
            border border-cp-neon/70
            text-black
            bg-cp-neon
            hover:bg-cp-neon/90
            hover:shadow-[0_0_16px_rgba(217,255,47,0.4)]
            transition
          "
        >
          View all
        </a>
      </div>

      {/* Content */}
      <div className="divide-y divide-white/5">
        {!txs ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            Loading transactions…
          </div>
        ) : txs.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            No recent transactions
          </div>
        ) : (
          txs.map((tx) => <TxRow key={tx.txHash || tx.id} tx={tx} />)
        )}
      </div>
    </div>
  );
}
