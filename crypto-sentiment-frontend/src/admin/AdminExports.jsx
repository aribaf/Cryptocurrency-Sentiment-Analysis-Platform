// src/admin/AdminExports.jsx
import React, { useEffect, useState } from "react";
import { listExports } from "../api/adminExports";
import ExportRequestForm from "./ExportRequestForm";
import ExportHistoryTable from "./ExportHistoryTable";
import ExportPreview from "./ExportPreview";

export default function AdminExports() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    const res = await listExports();
    if (res.ok) {
      setJobs(res.data || []);
      setError(null);
    } else {
      setError(res.message || "Failed to load exports");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 15000); // poll every 15s to avoid spam
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 text-white">
      <h1 className="text-2xl font-bold">Data Exports</h1>

      {/* Export request form */}
      <div className="bg-cp-panel p-4 md:p-6 rounded-xl border border-white/10">
        <h2 className="text-lg font-semibold mb-4">Create New Export</h2>
        <ExportRequestForm
          onPreview={setPreviewData}
          onSuccess={() => {
            setPreviewData(null);
            fetchJobs();
          }}
        />
      </div>

      {/* Preview panel */}
      {previewData && (
        <div className="bg-cp-panel p-4 md:p-6 rounded-xl border border-white/10">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <ExportPreview data={previewData} />
        </div>
      )}

      {/* Export history */}
      <div className="bg-cp-panel p-4 md:p-6 rounded-xl border border-white/10">
        <h2 className="text-lg font-semibold mb-4">Export History</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-300 text-sm">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-gray-400">Loading export history…</div>
        ) : (
          <ExportHistoryTable jobs={jobs} onRefresh={fetchJobs} />
        )}
      </div>
    </div>
  );
}
