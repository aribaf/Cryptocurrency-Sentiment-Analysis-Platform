// src/components/pages/Transactions.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { fetchTransactions, fetchAlerts, fetchWalletHistory } from "../../api/transactions";

/* ---------- Small helpers ---------- */
function formatUSD(v) {
  return (
    "$" + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
  );
}
function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  // Using short format for better fit on small screens
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
function shortHash(h) {
  if (!h) return "—";
  return (h || "").slice(0, 12) + "...";
}
function explorerUrl(chain, txHash) {
  if (!txHash) return "#";
  if (!chain) return "#";
  const c = chain.toLowerCase();
  if (c.includes("eth") || c === "ethereum") return `https://etherscan.io/tx/${txHash}`;
  if (c.includes("btc") || c === "bitcoin") return `https://www.blockchain.com/btc/tx/${txHash}`;
  if (c.includes("sol") || c === "solana") return `https://solscan.io/tx/${txHash}`;
  return "#";
}

/* ---------- Chain badge component ---------- */
function ChainBadge({ chain }) {
  const lower = (chain || "").toLowerCase();
  const label = chain
    ? lower === "ethereum"
      ? "ETH"
      : lower === "bitcoin"
      ? "BTC"
      : lower === "solana"
      ? "SOL"
      : chain.toUpperCase()
    : "—";

  let colorClasses =
    "bg-cp-bg text-gray-200 border border-white/20 inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap"; // Added whitespace-nowrap
  if (lower === "ethereum")
    colorClasses =
      "bg-cp-bg text-cp-neon border border-cp-neon/60 inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap";
  else if (lower === "bitcoin")
    colorClasses =
      "bg-cp-bg text-cp-orange border border-cp-orange/70 inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap";
  else if (lower === "solana")
    colorClasses =
      "bg-cp-bg text-cp-purple border border-cp-purple/70 inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap";

  return <span className={colorClasses}>{label}</span>;
}

/* ---------- Transaction row with extra controls ---------- */
function TransactionRow({ tx, index }) {
  const value = tx.value_usd ?? tx.value ?? 0;
  const date = tx.timestamp ? new Date(tx.timestamp) : null;

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(tx.tx_hash || tx.id || "");
      // eslint-disable-next-line no-alert
      alert("Copied hash to clipboard");
    } catch (e) {
      // ignore
    }
  }

  const rowBg =
    index % 2 === 0 ? "bg-cp-panel" : "bg-cp-bg";

  return (
    <tr
      className={`
        ${rowBg}
        border-b border-white/5
        text-[10px] sm:text-[11px] md:text-xs // Adjusted text size for smaller screens
        hover:bg-cp-bg/80
        transition-colors
      `}
    >
      <td className="p-2 whitespace-nowrap">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="font-mono text-gray-100">
            {shortHash(tx.tx_hash || tx.id)}
          </span>
          <button
            title="Copy tx hash"
            onClick={copyHash}
            className="
              text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-full
              bg-cp-bg border border-white/15
              text-gray-200
              hover:border-cp-neon/60
              transition-colors
            "
          >
            Copy
          </button>
          <a
            href={explorerUrl(tx.blockchain, tx.tx_hash)}
            target="_blank"
            rel="noreferrer"
            className="
              text-[9px] sm:text-[10px] ml-1
              text-cp-neon
              hover:underline
              whitespace-nowrap
            "
          >
            View
          </a>
        </div>
      </td>

      <td className="p-2 whitespace-nowrap">
        <ChainBadge chain={tx.blockchain} />
      </td>

      <td className="p-2 text-gray-100 whitespace-nowrap">
        {tx.token_symbol ||
          (tx.blockchain === "ethereum"
            ? "ETH"
            : tx.blockchain === "bitcoin"
            ? "BTC"
            : tx.blockchain === "solana"
            ? "SOL"
            : "")}
      </td>

      <td className="p-2 text-gray-300 break-all max-w-[80px] sm:max-w-[120px] overflow-hidden truncate">
        {/* Use truncate and max-width for better address handling */}
        {tx.from_addr || tx.from || "—"}
      </td>
      <td className="p-2 text-gray-300 break-all max-w-[80px] sm:max-w-[120px] overflow-hidden truncate">
        {tx.to_addr || tx.to || "—"}
      </td>

      <td className="p-2 text-gray-100 whitespace-nowrap">
        {formatUSD(value)}
      </td>
      <td className="p-2 text-gray-400 whitespace-nowrap">
        {date ? formatDate(date) : ""}
      </td>
    </tr>
  );
}

/* ---------- Small stacked bar mini-chart ---------- */
function SmallBarChart({ data = [] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const pieces = [];
  let acc = 0;
  for (const d of data) {
    const w = (d.value / total) * 100;
    pieces.push({ x: acc, w, key: d.key });
    acc += w;
  }
  return (
    <svg
      width="100%"
      height="32"
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      className="rounded overflow-hidden"
    >
      {pieces.map((p, i) => {
        const fill =
          p.key === "ethereum"
            ? "#8b5cf6" // cp-purple
            : p.key === "bitcoin"
            ? "#ff5722" // cp-orange
            : p.key === "solana"
            ? "#d9ff2f" // cp-neon
            : "#64748b"; // slate-500
        return (
          <rect
            key={i}
            x={`${p.x}`}
            y="0"
            width={`${p.w}`}
            height="10"
            fill={fill}
          />
        );
      })}
    </svg>
  );
}

/* ---------- Main Transactions page component ---------- */
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [wallet, setWallet] = useState("");
  const [walletQuery, setWalletQuery] = useState("");
  const [walletHistory, setWalletHistory] = useState([]);
  const [minAlert, setMinAlert] = useState(100000);
  const [chainFilter, setChainFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [error, setError] = useState(null);

  // pagination + sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState("timestamp"); // 'timestamp' | 'value_usd'
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'

  // debounce wallet search
  const walletTimer = useRef(null);

  useEffect(() => {
    loadTransactions();
    loadAlerts();
    // poll for live-ish updates
    const id = setInterval(() => loadTransactions(true), 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (walletTimer.current) clearTimeout(walletTimer.current);
    walletTimer.current = setTimeout(() => {
      setWalletQuery(wallet.trim());
      walletTimer.current = null;
    }, 700);
    return () => {
      if (walletTimer.current) clearTimeout(walletTimer.current);
    };
  }, [wallet]);

  useEffect(() => {
    if (walletQuery) onWalletSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletQuery]);

  async function loadTransactions(silent = false) {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchTransactions({ limit: 1000, page: 1 });
      const arr = Array.isArray(data)
        ? data
        : data && data.data
        ? data.data
        : [];
      setTransactions(arr || []);
    } catch (e) {
      console.error("loadTransactions error", e);
      setError("Failed to load transactions");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadAlerts() {
    setLoadingAlerts(true);
    try {
      const data = await fetchAlerts(minAlert);
      const arr = Array.isArray(data)
        ? data
        : data && data.data
        ? data.data
        : [];
      setAlerts(arr || []);
    } catch (e) {
      console.error("loadAlerts error", e);
    } finally {
      setLoadingAlerts(false);
    }
  }

  async function onWalletSearch(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!walletQuery) return;
    try {
      setLoading(true);
      const h = await fetchWalletHistory(walletQuery, 200);
      const arr = Array.isArray(h) ? h : h && h.data ? h.data : [];
      setWalletHistory(arr || []);
    } catch (e) {
      console.error("wallet search error", e);
    } finally {
      setLoading(false);
    }
  }

  // Derived stats
  const stats = useMemo(() => {
    const byChain = { ethereum: 0, bitcoin: 0, solana: 0, other: 0 };
    const byUsd = { ethereum: 0, bitcoin: 0, solana: 0, other: 0 };
    transactions.forEach((tx) => {
      const chain = (tx.blockchain || "other").toLowerCase();
      const key =
        chain.includes("eth") || chain === "ethereum"
          ? "ethereum"
          : chain.includes("bit") || chain === "bitcoin"
          ? "bitcoin"
          : chain.includes("sol") || chain === "solana"
          ? "solana"
          : "other";
      byChain[key] = (byChain[key] || 0) + 1;
      byUsd[key] =
        (byUsd[key] || 0) +
        (Number(tx.value_usd || tx.value || 0) || 0);
    });
    const chartData = [
      { key: "ethereum", value: byChain.ethereum },
      { key: "bitcoin", value: byChain.bitcoin },
      { key: "solana", value: byChain.solana },
      { key: "other", value: byChain.other },
    ];
    return { byChain, byUsd, chartData };
  }, [transactions]);

  // Filter -> Sort -> Paginate
  const filteredTxs = useMemo(() => {
    let arr = transactions || [];
    if (chainFilter !== "all") {
      arr = arr.filter((tx) => {
        const chain = (tx.blockchain || "").toLowerCase();
        if (chainFilter === "ethereum")
          return chain.includes("eth") || chain === "ethereum";
        if (chainFilter === "bitcoin")
          return chain.includes("bit") || chain === "bitcoin";
        if (chainFilter === "solana")
          return chain.includes("sol") || chain === "solana";
        return true;
      });
    }

    arr = arr.slice().sort((a, b) => {
      const aVal =
        sortKey === "value_usd"
          ? Number(a.value_usd || a.value || 0)
          : new Date(a.timestamp || 0).getTime();
      const bVal =
        sortKey === "value_usd"
          ? Number(b.value_usd || b.value || 0)
          : new Date(b.timestamp || 0).getTime();
      if (aVal === bVal) return 0;
      if (sortOrder === "asc") return aVal < bVal ? -1 : 1;
      return aVal > bVal ? -1 : 1;
    });

    return arr;
  }, [transactions, chainFilter, sortKey, sortOrder]);

  // pagination
  const pageCount = Math.max(
    1,
    Math.ceil((filteredTxs.length || 0) / pageSize)
  );
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTxs.slice(start, start + pageSize);
  }, [filteredTxs, page, pageSize]);

  function setSort(k) {
    if (sortKey === k) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(k);
      setSortOrder("desc");
    }
    setPage(1);
  }

  function exportCSV(rows = paginated) {
    if (!rows || rows.length === 0) {
      // eslint-disable-next-line no-alert
      return alert("No transactions to export");
    }
    const header = [
      "tx_hash",
      "blockchain",
      "token_symbol",
      "from",
      "to",
      "value",
      "value_usd",
      "timestamp",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header
          .map((h) => {
            const v =
              r[h] === undefined || r[h] === null ? "" : String(r[h]);
            const escaped = v.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${chainFilter}_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearWalletHistory() {
    setWallet("");
    setWalletQuery("");
    setWalletHistory([]);
  }

  function handleChainClick(chain) {
    setChainFilter(chain);
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-6 text-white"> {/* Adjusted overall padding */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4"> {/* Changed md: to sm: for earlier stacking */}
        <div>
          <h2 className="text-xl font-bold mb-1">Transaction Tracking</h2>
          <div className="text-sm text-gray-400">
            Monitor large & suspicious transactions across chains
          </div>
        </div>

        {/* Controls block - uses flex-wrap to handle overflow on small screens */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
          <label className="text-xs text-gray-300">Chain</label>
          <select
            className="
              px-3 py-2 rounded-md text-xs
              bg-cp-bg/90 border border-white/15 text-gray-100
              focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
              min-w-[100px]
            "
            value={chainFilter}
            onChange={(e) => {
              setChainFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="ethereum">Ethereum</option>
            <option value="bitcoin">Bitcoin</option>
            <option value="solana">Solana</option>
          </select>

          <button
            onClick={() => {
              loadTransactions();
              loadAlerts();
            }}
            className="
              bg-cp-neon text-black
              px-3 py-2 rounded-md text-xs font-semibold
              hover:bg-cp-neon/90
              shadow-[0_0_16px_rgba(217,255,47,0.4)]
              transition-colors
            "
          >
            Refresh
          </button>

          <button
            onClick={() => exportCSV(filteredTxs)}
            className="
              px-3 py-2 rounded-md text-xs font-semibold
              bg-cp-bg border border-white/15 text-gray-100
              hover:border-cp-neon/60
              transition-colors
            "
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* stats - grid stacks on small screens, 3 columns on medium and up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-4">
        <div className="p-3 rounded-xl bg-cp-panel border border-white/5">
          <div className="text-[11px] text-gray-400 uppercase tracking-wide">
            Total events
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-gray-100 mt-1">
            {transactions.length}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-cp-panel border border-white/5">
          <div className="text-[11px] text-gray-400 uppercase tracking-wide">
            Total USD (all chains)
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-gray-100 mt-1">
            {formatUSD(
              Object.values(stats.byUsd).reduce((s, v) => s + v, 0)
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-cp-panel border border-white/5">
          <div className="text-[11px] text-gray-400 uppercase tracking-wide">
            Activity by chain
          </div>
          <div className="mt-2">
            <SmallBarChart data={stats.chartData} />
            {/* Added flex-wrap for buttons in stat card */}
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-[10px] sm:text-[11px]">
              <button
                onClick={() => handleChainClick("ethereum")}
                className="flex items-center gap-1 text-gray-200 hover:text-cp-neon"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#8b5cf6" }}
                />{" "}
                ETH {stats.byChain.ethereum}
              </button>
              <button
                onClick={() => handleChainClick("bitcoin")}
                className="flex items-center gap-1 text-gray-200 hover:text-cp-orange"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#ff5722" }}
                />{" "}
                BTC {stats.byChain.bitcoin}
              </button>
              <button
                onClick={() => handleChainClick("solana")}
                className="flex items-center gap-1 text-gray-200 hover:text-cp-neon"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#d9ff2f" }}
                />{" "}
                SOL {stats.byChain.solana}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* wallet search - stacks on small screens */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          className="
            flex-1 px-3 py-2 rounded-md text-sm
            bg-cp-bg/90 border border-white/15 text-gray-100
            placeholder:text-gray-500
            focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
          "
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Search wallet address (auto-search after typing stops)..."
        />
        <button
          className="
            px-4 py-2 rounded-md text-sm font-semibold
            bg-cp-neon text-black
            hover:bg-cp-neon/90
            shadow-[0_0_14px_rgba(217,255,47,0.4)]
          "
          onClick={onWalletSearch}
        >
          Search
        </button>
        <button
          className="
            px-3 py-2 rounded-md text-sm
            bg-cp-panel border border-white/10 text-gray-200
            hover:border-cp-neon/60
          "
          onClick={clearWalletHistory}
        >
          Clear
        </button>
      </div>

      {/* Main content grid - table (2/3) and sidebar (1/3) stack on non-LG screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions table container */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
            <div className="text-sm text-gray-400">
              {loading
                ? "Loading..."
                : `Showing ${filteredTxs.length} transactions`}
            </div>

            {/* Sorting/Pagination controls - added flex-wrap */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] text-gray-400">Sort</label>
              <button
                onClick={() => setSort("timestamp")}
                className={`
                  text-[11px] px-2 py-1 rounded-full border
                  ${
                    sortKey === "timestamp"
                      ? "bg-cp-neon text-black border-cp-neon"
                      : "bg-cp-bg text-gray-200 border-white/15 hover:border-cp-neon/60"
                  }
                `}
              >
                Time{" "}
                {sortKey === "timestamp"
                  ? sortOrder === "desc"
                    ? "↓"
                    : "↑"
                  : ""}
              </button>
              <button
                onClick={() => setSort("value_usd")}
                className={`
                  text-[11px] px-2 py-1 rounded-full border
                  ${
                    sortKey === "value_usd"
                      ? "bg-cp-neon text-black border-cp-neon"
                      : "bg-cp-bg text-gray-200 border-white/15 hover:border-cp-neon/60"
                  }
                `}
              >
                Value{" "}
                {sortKey === "value_usd"
                  ? sortOrder === "desc"
                    ? "↓"
                    : "↑"
                  : ""}
              </button>

              <label className="text-[11px] ml-1 text-gray-400">
                Page size
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="
                  border border-white/15 rounded-md text-[11px] px-2 py-1
                  bg-cp-bg/90 text-gray-100
                  focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
                "
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Table container: crucial for horizontal scrolling on mobile */}
          <div className="overflow-x-auto border border-white/10 rounded-xl bg-cp-panel">
            <table className="w-full table-auto min-w-[700px]"> {/* Set a min-width for mobile */}
              <thead className="bg-cp-bg">
                <tr>
                  <th className="p-2 text-left text-[11px] font-semibold text-gray-300 border-b border-white/10 whitespace-nowrap">
                    Hash
                  </th>
                  <th className="p-2 text-left text-[11px] font-semibold text-gray-300 border-b border-white/10 whitespace-nowrap">
                    Chain
                  </th>
                  <th className="p-2 text-left text-[11px] font-semibold text-gray-300 border-b border-white/10 whitespace-nowrap">
                    Token
                  </th>
                  <th className="p-2 text-left text-[11px] font-semibold text-gray-300 border-b border-white/10 whitespace-nowrap">
                    From
                  </th>
                  <th className="p-2 text-left text-[11px] font-semibold text-gray-300 border-b border-white/10 whitespace-nowrap">
                    To
                  </th>
                  <th className="p-2 text-left text-[11px] font-semibold text-gray-300 border-b border-white/10 whitespace-nowrap">
                    Value (USD)
                  </th>
                  <th className="p-2 text-left text-[11px] font-semibold text-gray-300 border-b border-white/10 whitespace-nowrap">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr>
                    <td
                      className="p-4 text-sm text-gray-400 bg-cp-panel"
                      colSpan={7}
                    >
                      {loading
                        ? "Loading transactions..."
                        : "No transactions to show for this filter."}
                    </td>
                  </tr>
                )}
                {paginated.map((tx, idx) => (
                  <TransactionRow
                    key={tx.id || tx.tx_hash}
                    tx={tx}
                    index={idx}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination controls - stacks on small screens */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-3 gap-2">
            <div className="text-sm text-gray-400">
              Page {page} of {pageCount}
            </div>
            <div className="flex gap-2">
              <button
                className="
                  px-3 py-1 rounded-md text-xs
                  bg-cp-bg border border-white/15 text-gray-200
                  hover:border-cp-neon/60
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                First
              </button>
              <button
                className="
                  px-3 py-1 rounded-md text-xs
                  bg-cp-bg border border-white/15 text-gray-200
                  hover:border-cp-neon/60
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <button
                className="
                  px-3 py-1 rounded-md text-xs
                  bg-cp-bg border border-white/15 text-gray-200
                  hover:border-cp-neon/60
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
                onClick={() =>
                  setPage((p) => Math.min(pageCount, p + 1))
                }
                disabled={page === pageCount}
              >
                Next
              </button>
              <button
                className="
                  px-3 py-1 rounded-md text-xs
                  bg-cp-bg border border-white/15 text-gray-200
                  hover:border-cp-neon/60
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
                onClick={() => setPage(pageCount)}
                disabled={page === pageCount}
              >
                Last
              </button>
            </div>
          </div>
        </div>

        {/* alerts & settings sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-gray-100">
              Recent Alerts
            </h3>
            <div className="space-y-2">
              {loadingAlerts && (
                <div className="text-sm text-gray-400">
                  Loading alerts...
                </div>
              )}
              {!loadingAlerts && alerts.length === 0 && (
                <div className="text-sm text-gray-400">No alerts</div>
              )}
              {alerts.map((a) => (
                <div
                  key={a.id || a.tx_hash}
                  className="
                    p-3 rounded-xl
                    bg-cp-panel border border-white/10
                    text-xs
                  "
                >
                  <div className="font-mono text-gray-100">
                    Hash: {(a.tx_hash || "").slice(0, 12)}...
                  </div>
                  <div className="mt-1 text-gray-200">
                    Value: {formatUSD(a.value_usd || a.value || 0)}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-400">
                    {a.timestamp ? formatDate(a.timestamp) : ""}
                  </div>
                  <div className="mt-2 text-right">
                    <a
                      href={explorerUrl(a.blockchain, a.tx_hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-cp-neon hover:underline"
                    >
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-200">
              Min alert USD
            </label>
            <input
              className="
                mt-1 w-full px-2 py-1 rounded-md text-sm
                bg-cp-bg/90 border border-white/15 text-gray-100
                focus:outline-none focus:border-cp-neon focus:ring-1 focus:ring-cp-neon
              "
              type="number"
              value={minAlert}
              onChange={(e) => setMinAlert(Number(e.target.value))}
            />
            <button
              className="
                mt-2 px-3 py-1 rounded-md text-xs font-semibold
                bg-cp-neon text-black
                hover:bg-cp-neon/90
                shadow-[0_0_12px_rgba(217,255,47,0.4)]
              "
              onClick={loadAlerts}
            >
              Refresh
            </button>
          </div>

          {walletHistory.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2 text-gray-100">
                Wallet history for {walletQuery}
              </h4>
              {/* Wallet history table: crucial for horizontal scrolling on mobile */}
              <div className="overflow-x-auto border border-white/10 rounded-xl max-h-80 bg-cp-panel">
                <table className="w-full table-auto text-xs min-w-[500px]"> {/* Set min-width for mobile */}
                  <thead className="bg-cp-bg">
                    <tr>
                      <th className="p-2 text-left text-[11px] text-gray-300 border-b border-white/10 whitespace-nowrap">
                        Hash
                      </th>
                      <th className="p-2 text-left text-[11px] text-gray-300 border-b border-white/10 whitespace-nowrap">
                        From
                      </th>
                      <th className="p-2 text-left text-[11px] text-gray-300 border-b border-white/10 whitespace-nowrap">
                        To
                      </th>
                      <th className="p-2 text-left text-[11px] text-gray-300 border-b border-white/10 whitespace-nowrap">
                        Value
                      </th>
                      <th className="p-2 text-left text-[11px] text-gray-300 border-b border-white/10 whitespace-nowrap">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletHistory.map((tx, idx) => (
                      <tr
                        key={tx.id || tx.tx_hash}
                        className={`
                          ${idx % 2 === 0 ? "bg-cp-panel" : "bg-cp-bg"}
                          border-b border-white/5
                          text-[10px] sm:text-xs
                        `}
                      >
                        <td className="p-2 text-gray-100 font-mono whitespace-nowrap">
                          {shortHash(tx.tx_hash || tx.id)}
                        </td>
                        <td className="p-2 text-gray-300 break-all max-w-[50px] overflow-hidden truncate">
                          {tx.from || tx.from_addr}
                        </td>
                        <td className="p-2 text-gray-300 break-all max-w-[50px] overflow-hidden truncate">
                          {tx.to || tx.to_addr}
                        </td>
                        <td className="p-2 text-gray-100 whitespace-nowrap">
                          {formatUSD(tx.value_usd || tx.value || 0)}
                        </td>
                        <td className="p-2 text-gray-400 whitespace-nowrap">
                          {tx.timestamp ? formatDate(tx.timestamp) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-cp-magenta">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}