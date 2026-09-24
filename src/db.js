const API_BASE = "/api";

export function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split(/[,\uff0c\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && data.error) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function initDB() {
  await request("/health");
}

export async function me() {
  return request("/auth/me");
}

export async function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logout() {
  return request("/auth/logout", { method: "POST" });
}

export async function changePassword(old_password, new_password) {
  return request("/auth/password", {
    method: "POST",
    body: JSON.stringify({ old_password, new_password }),
  });
}

export async function listUsers() {
  return request("/users");
}

export async function createUser(payload) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id, payload) {
  return request(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id) {
  return request(`/users/${id}`, { method: "DELETE" });
}

export async function addImage({ url, name = "", tags = "", note = "" }) {
  return request("/images", {
    method: "POST",
    body: JSON.stringify({ url, name, tags, note }),
  });
}

export async function updateImage(id, { name, tags, note }) {
  return request(`/images/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, tags, note }),
  });
}

export async function deleteImage(id) {
  return request(`/images/${id}`, { method: "DELETE" });
}

export async function listImages({
  search = "",
  tag = "",
  limit = 0,
  offset = 0,
  scope = "all",
} = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tag) params.set("tag", tag);
  if (scope) params.set("scope", scope);
  if (limit > 0) {
    params.set("limit", String(limit));
    params.set("offset", String(offset));
  }
  const qs = params.toString();
  return request(`/images${qs ? `?${qs}` : ""}`);
}

export async function listAllTags() {
  return request("/tags");
}

export async function exportJSON() {
  return request("/export");
}

export async function importJSON(payload) {
  return request("/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}