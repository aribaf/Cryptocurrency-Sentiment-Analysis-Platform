// src/api/account.js
// Clean + Vite-compatible API helper

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  localStorage.getItem("API_BASE_HOST");

function getToken() {
  return localStorage.getItem("access_token"); 
}

async function safeParseJSON(res) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function request(path, opts = {}) {
  const url = `${API_BASE.replace(/\/+$/, "")}/api${path}`;
  const token = getToken();

  const headers = opts.headers || {};
  headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { ...opts, headers });
    const json = await safeParseJSON(res);
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

export function getProfile() {
  // 2. Add /auth to the path to match your FastAPI router structure
  return request("/auth/me", { method: "GET" });
}

export function updateProfile({ email, new_email }) {
  return request("/account/update-profile", {
    method: "POST",
    body: JSON.stringify({ email, new_email }),
  });
}

export function changePassword({ email, current_password, new_password }) {
  return request("/account/update-password", {
    method: "POST",
    body: JSON.stringify({ email, current_password, new_password }),
  });
}

export function deactivateAccount({ email }) {
  return request("/account/deactivate", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function reactivateAccount({ email }) {
  return request("/account/reactivate", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function deleteAccount({ email }) {
  return request("/account/delete", {
    method: "DELETE",
    body: JSON.stringify({ email, confirm: true }),
  });
}
