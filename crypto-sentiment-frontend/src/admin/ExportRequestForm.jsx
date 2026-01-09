// src/admin/ExportRequestForm.jsx
import React, { useState } from "react";
import { createExport } from "../api/adminExports";

export default function ExportRequestForm({ onPreview, onSuccess }) {
  const [dataset, setDataset] = useState("tweets");
  const [format, setFormat] = useState("csv");
  const [compress, setCompress] = useState(true);
  const [limit, setLimit] = useState("100000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedColumns, setSelectedColumns] = useState(["id", "text", "timestamp"]);

  const columnOptions = {
    tweets: ["id", "text", "timestamp", "author", "likes", "retweets", "sentiment"],
    reddit: ["id", "title", "body", "timestamp", "author", "upvotes", "sentiment"],
    news: ["id", "title", "body", "timestamp", "source", "url", "sentiment"],
    transactions: ["id", "user_id", "amount", "timestamp", "status"],
  };

  const handleColumnToggle = (col) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handlePreview = () => {
    onPreview({
      dataset,
      format,
      columns: selectedColumns,
      sampleRows: 5,
    });
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    const params = {
      dataset,
      format,
      compress,
      limit: parseInt(limit) || 100000,
      columns: selectedColumns,
      filters: {
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      },
      delivery: { type: "download" },
    };

    const res = await createExport(params);
    if (res.ok) {
      onSuccess();
    } else {
      setError(res.message || "Export failed");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Dataset selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Dataset</label>
          <select
            value={dataset}
            onChange={(e) => {
              setDataset(e.target.value);
              setSelectedColumns(columnOptions[e.target.value] || []);
            }}
            className="w-full px-3 py-2 bg-cp-bg border border-white/10 rounded text-white text-sm"
          >
            <option value="tweets">Twitter</option>
            <option value="reddit">Reddit</option>
            <option value="news">News</option>
            <option value="transactions">Transactions</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full px-3 py-2 bg-cp-bg border border-white/10 rounded text-white text-sm"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="parquet">Parquet</option>
          </select>
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-cp-bg border border-white/10 rounded text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-cp-bg border border-white/10 rounded text-white text-sm"
          />
        </div>
      </div>

      {/* Row limit and compression */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Row Limit</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-full px-3 py-2 bg-cp-bg border border-white/10 rounded text-white text-sm"
            placeholder="100000"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={compress}
              onChange={(e) => setCompress(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-300">Compress (ZIP)</span>
          </label>
        </div>
      </div>

      {/* Column selector */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">Columns</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {columnOptions[dataset]?.map((col) => (
            <label key={col} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selectedColumns.includes(col)}
                onChange={() => handleColumnToggle(col)}
                className="w-4 h-4"
              />
              <span className="text-gray-300">{col}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handlePreview}
          disabled={loading}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition disabled:opacity-50 text-sm"
        >
          Preview
        </button>
        <button
          onClick={handleExport}
          disabled={loading || selectedColumns.length === 0}
          className="px-4 py-2 bg-cp-neon hover:bg-cp-neon/90 text-black rounded font-semibold transition disabled:opacity-50 text-sm"
        >
          {loading ? "Exporting..." : "Export Now"}
        </button>
      </div>
    </div>
  );
}
