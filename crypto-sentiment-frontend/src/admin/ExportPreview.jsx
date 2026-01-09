// src/admin/ExportPreview.jsx
import React from "react";

export default function ExportPreview({ data }) {
  // Mock preview data
  const mockRows = [
    { id: "1", text: "Sample tweet 1", timestamp: "2026-01-09T10:00:00Z" },
    { id: "2", text: "Sample tweet 2", timestamp: "2026-01-09T11:00:00Z" },
    { id: "3", text: "Sample tweet 3", timestamp: "2026-01-09T12:00:00Z" },
  ];

  const visibleColumns = data?.columns || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs md:text-sm text-gray-200">
        <thead>
          <tr className="border-b border-white/10">
            {visibleColumns.map((col) => (
              <th key={col} className="px-3 py-2 text-left text-gray-400 font-semibold">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mockRows.map((row, idx) => (
            <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
              {visibleColumns.map((col) => (
                <td key={col} className="px-3 py-2 text-gray-300 truncate">
                  {row[col] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-xs text-gray-400">
        Format: {data?.format?.toUpperCase()} | Showing 3 sample rows | Total may be different after applying filters
      </div>
    </div>
  );
}
