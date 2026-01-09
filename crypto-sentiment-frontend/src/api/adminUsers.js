// src/api/adminUsers.js
// Admin Users API helper

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
 * Get all users
 */
export function getUsers() {
  return request("/admin/users", { method: "GET" });
}

/**
 * Create a new user
 */
export function createUser(userData) {
  return request("/admin/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

/**
 * Update a user
 */
export function updateUser(userId, userData) {
  return request(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
}

/**
 * Delete a user
 */
export function deleteUser(userId) {
  return request(`/admin/users/${userId}`, { method: "DELETE" });
}
