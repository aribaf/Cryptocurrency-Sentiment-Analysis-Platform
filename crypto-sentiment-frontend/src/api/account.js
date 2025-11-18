// src/api/account.js
const BASE = "http://127.0.0.1:8000";

export async function getProfile(identifier) {
  const params = new URLSearchParams(identifier); // { user_id } or { email }
  const res = await fetch(`${BASE}/api/account/profile?${params.toString()}`);
  return res.json();
}

export async function updateProfile(body) {
  const res = await fetch(`${BASE}/api/account/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), // { user_id/email, name?, username?, new_email? }
  });
  return res.json();
}

export async function changePassword(body) {
  const res = await fetch(`${BASE}/api/account/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), // { user_id/email, current_password, new_password }
  });
  return res.json();
}

export async function deactivateAccount(body) {
  const res = await fetch(`${BASE}/api/account/deactivate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), // { user_id/email }
  });
  return res.json();
}

export async function reactivateAccount(body) {
  const res = await fetch(`${BASE}/api/account/reactivate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), // { user_id/email }
  });
  return res.json();
}

export async function deleteAccount(body) {
  const res = await fetch(`${BASE}/api/account/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), // { user_id/email, confirm: true }
  });
  return res.json();
}
