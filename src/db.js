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
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && data.error) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function initDB() {
  await request("/health");
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
} = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tag) params.set("tag", tag);
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

export async function clearAll() {
  return request("/images", { method: "DELETE" });
}
