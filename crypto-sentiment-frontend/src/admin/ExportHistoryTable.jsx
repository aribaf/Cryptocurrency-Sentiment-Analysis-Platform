// src/admin/ExportHistoryTable.jsx
import React, { useState } from "react";
import { retryExport, cancelExport, deleteExport } from "../api/adminExports";
import { TrashIcon, ArrowPathIcon, XMarkIcon, CloudArrowDownIcon } from "@heroicons/react/24/outline";

export default function ExportHistoryTable({ jobs = [], onRefresh }) {
  const [actionLoading, setActionLoading] = useState(null);

  const handleRetry = async (jobId) => {
    setActionLoading(jobId);
    await retryExport(jobId);
    onRefresh();
    setActionLoading(null);
  };

  const handleCancel = async (jobId) => {
    setActionLoading(jobId);
    await cancelExport(jobId);
    onRefresh();
    setActionLoading(null);
  };

  const handleDelete = async (jobId) => {
    if (confirm("Delete this export job?")) {
      setActionLoading(jobId);
      await deleteExport(jobId);
      onRefresh();
      setActionLoading(null);
    }
  };

  if (jobs.length === 0) {
    return <div className="text-gray-400 text-center py-8">No export jobs yet</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs md:text-sm text-gray-200">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Job ID</th>
            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Dataset</th>
            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Format</th>
            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Status</th>
            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Size</th>
            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Created</th>
            <th className="px-3 py-2 text-center text-gray-400 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="px-3 py-2 font-mono text-xs text-gray-300 truncate">
                {job.id?.slice(0, 8)}...
              </td>
              <td className="px-3 py-2 text-gray-300 capitalize">{job.dataset}</td>
              <td className="px-3 py-2 text-gray-300 uppercase">{job.format}</td>
              <td className="px-3 py-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    job.status === "completed"
                      ? "bg-green-900/40 text-green-300"
                      : job.status === "failed"
                      ? "bg-red-900/40 text-red-300"
                      : job.status === "running"
                      ? "bg-blue-900/40 text-blue-300"
                      : "bg-gray-900/40 text-gray-300"
                  }`}
                >
                  {job.status || "queued"}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-300">
                {job.file_size ? `${(job.file_size / 1024 / 1024).toFixed(2)} MB` : "—"}
              </td>
              <td className="px-3 py-2 text-gray-400 text-xs">
                {job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}
              </td>
              <td className="px-3 py-2 text-center">
                <div className="flex justify-center gap-2">
                  {job.status === "completed" && job.id && (
                    <a
                      href={`${import.meta.env.VITE_API_BASE || localStorage.getItem("API_BASE_HOST") || "http://localhost:8000"}/api/admin/exports/${job.id}/download?token=${localStorage.getItem("access_token")}`}
                      download
                      className="p-1 text-cp-neon hover:bg-white/10 rounded transition"
                      title="Download"
                    >
                      <CloudArrowDownIcon className="w-4 h-4" />
                    </a>
                  )}
                  {job.status === "failed" && (
                    <button
                      onClick={() => handleRetry(job.id)}
                      disabled={actionLoading === job.id}
                      className="p-1 text-yellow-400 hover:bg-white/10 rounded transition disabled:opacity-50"
                      title="Retry"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                    </button>
                  )}
                  {(job.status === "running" || job.status === "queued") && (
                    <button
                      onClick={() => handleCancel(job.id)}
                      disabled={actionLoading === job.id}
                      className="p-1 text-red-400 hover:bg-white/10 rounded transition disabled:opacity-50"
                      title="Cancel"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(job.id)}
                    disabled={actionLoading === job.id}
                    className="p-1 text-red-500 hover:bg-white/10 rounded transition disabled:opacity-50"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
