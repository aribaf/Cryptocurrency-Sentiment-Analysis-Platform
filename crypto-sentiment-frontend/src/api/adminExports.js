// src/api/adminExports.js
// Admin Exports API helper

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  localStorage.getItem("API_BASE_HOST") ||
  "http://localhost:8000";

function getToken() {
  return localStorage.getItem("access_token");
}

async function request(path, opts = {}) {
  const url = `${API_BASE.replace(/\/+$/, "")}/api${path}`;
  const token = getToken();

  const headers = opts.headers || {};
  headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { ...opts, headers });
    const json = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      data: json.data || json,
      message: json.message,
      detail: json.detail,
    };
  } catch (err) {
    return { ok: false, status: 0, message: "Network error", detail: err };
  }
}

/**
 * Request an export job
 * @param {Object} params - Export params (dataset, filters, columns, format, etc.)
 * @returns {Promise} Response with job_id
 */
export function createExport(params) {
  return request("/admin/exports", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * List export jobs
 * @param {Object} query - Query params (page, status, dataset, start_date, end_date)
 * @returns {Promise} Response with jobs array
 */
export function listExports(query = {}) {
  const qs = new URLSearchParams(query).toString();
  return request(`/admin/exports${qs ? "?" + qs : ""}`, { method: "GET" });
}

/**
 * Get export job details
 * @param {string} jobId - Export job ID
 * @returns {Promise} Response with job details
 */
export function getExportDetails(jobId) {
  return request(`/admin/exports/${jobId}`, { method: "GET" });
}

/**
 * Retry a failed export job
 * @param {string} jobId - Export job ID
 * @returns {Promise} Response
 */
export function retryExport(jobId) {
  return request(`/admin/exports/${jobId}/retry`, { method: "POST" });
}

/**
 * Cancel a running export job
 * @param {string} jobId - Export job ID
 * @returns {Promise} Response
 */
export function cancelExport(jobId) {
  return request(`/admin/exports/${jobId}/cancel`, { method: "POST" });
}

/**
 * Delete an export job
 * @param {string} jobId - Export job ID
 * @returns {Promise} Response
 */
export function deleteExport(jobId) {
  return request(`/admin/exports/${jobId}`, { method: "DELETE" });
}

/**
 * Get available export formats
 * @returns {Promise} Response with formats array
 */
export function getExportFormats() {
  return request("/admin/export-formats", { method: "GET" });
}

/**
 * Create a scheduled export
 * @param {Object} params - Schedule params
 * @returns {Promise} Response
 */
export function createScheduledExport(params) {
  return request("/admin/exports/schedule", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
