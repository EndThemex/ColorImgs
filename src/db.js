import initSqlJs from "sql.js";

const DB_NAME = "colorimgs-db";
const STORE = "sqlite";
const KEY = "dbfile";

export function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split(/[,\uff0c\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

let SQL = null;
let db = null;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(STORE)) idb.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB() {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(bytes) {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(bytes, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function ensureSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC);
  `);
  await persist();
}

export async function initDB() {
  if (db) return db;
  const wasmResp = await fetch(`${window.location.origin}/sql-wasm.wasm`);
  const wasmBinary = await wasmResp.arrayBuffer();
  SQL = await initSqlJs({
    wasmBinary,
    locateFile: (f) => `${window.location.origin}/sql-wasm.wasm`,
  });
  const bytes = await loadFromIDB();
  db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  await ensureSchema();
  return db;
}

export async function persist() {
  if (!db) return;
  await saveToIDB(db.export());
}

export function rowToObj(stmt, row) {
  const obj = {};
  stmt.getColumnNames().forEach((n, i) => (obj[n] = row[i]));
  return obj;
}

export async function addImage({ url, name = "", tags = "", note = "" }) {
  const stmt = db.prepare(
    `INSERT INTO images (url, name, tags, note, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       name = COALESCE(NULLIF(excluded.name, ''), images.name),
       tags = CASE WHEN excluded.tags = '' THEN images.tags ELSE excluded.tags END,
       note = CASE WHEN excluded.note = '' THEN images.note ELSE excluded.note END
     RETURNING *`,
  );
  stmt.run([url, name, tags, note, Date.now()]);
  const result = rowToObj(stmt, stmt.get());
  stmt.free();
  await persist();
  return result;
}

export async function updateImage(id, { name, tags, note }) {
  const stmt = db.prepare(
    `UPDATE images SET name = ?, tags = ?, note = ? WHERE id = ? RETURNING *`,
  );
  stmt.run([name, tags, note, id]);
  const result = rowToObj(stmt, stmt.get());
  stmt.free();
  await persist();
  return result;
}

export async function deleteImage(id) {
  const stmt = db.prepare(`DELETE FROM images WHERE id = ?`);
  stmt.run([id]);
  stmt.free();
  await persist();
}

export async function listImages({
  search = "",
  tag = "",
  limit = 0,
  offset = 0,
} = {}) {
  const where = [];
  const params = [];
  if (search) {
    where.push(`(name LIKE ? OR tags LIKE ? OR note LIKE ?)`);
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (tag) {
    const tags = splitTags(tag);
    for (const t of tags) {
      where.push(`(',' || tags || ',') LIKE ?`);
      params.push(`%,${t},%`);
    }
  }
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const orderLimit =
    ` ORDER BY created_at DESC` +
    (limit > 0 ? ` LIMIT ? OFFSET ?` : ``);
  const sql = `SELECT * FROM images${whereSql}${orderLimit}`;
  const stmt = db.prepare(sql);
  const allParams = limit > 0 ? [...params, limit, offset] : params;
  stmt.bind(allParams);
  const rows = [];
  while (stmt.step()) rows.push(rowToObj(stmt, stmt.get()));
  stmt.free();

  if (limit > 0) {
    const countStmt = db.prepare(
      `SELECT COUNT(*) AS c FROM images${whereSql}`,
    );
    countStmt.bind(params);
    let total = 0;
    if (countStmt.step()) total = countStmt.get()[0];
    countStmt.free();
    return { rows, total };
  }
  return { rows, total: rows.length };
}

export async function listAllTags() {
  const stmt = db.prepare(`SELECT tags FROM images WHERE tags != ''`);
  const set = new Set();
  while (stmt.step()) {
    splitTags(stmt.get()[0]).forEach((t) => set.add(t));
  }
  stmt.free();
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function exportJSON() {
  const stmt = db.prepare(`SELECT * FROM images ORDER BY created_at ASC`);
  const rows = [];
  while (stmt.step()) {
    const o = rowToObj(stmt, stmt.get());
    rows.push({
      url: o.url,
      name: o.name,
      tags: o.tags,
      note: o.note,
      created_at: o.created_at,
    });
  }
  stmt.free();
  return {
    app: "colorimgs",
    version: 1,
    exported_at: new Date().toISOString(),
    images: rows,
  };
}

function mergeTags(existing, incoming) {
  const set = new Set();
  for (const src of [existing, incoming]) {
    splitTags(src).forEach((t) => set.add(t));
  }
  return [...set].join(",");
}

export async function importJSON(payload) {
  if (!payload || !Array.isArray(payload.images)) {
    throw new Error("JSON 格式不正确: 缺少 images 数组");
  }
  let added = 0;
  let merged = 0;
  let skipped = 0;
  const findStmt = db.prepare(`SELECT * FROM images WHERE url = ?`);
  const insertStmt = db.prepare(
    `INSERT INTO images (url, name, tags, note, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const updateStmt = db.prepare(
    `UPDATE images SET
       name = COALESCE(NULLIF(?, ''), name),
       tags = ?,
       note = COALESCE(NULLIF(?, ''), note)
     WHERE url = ?`,
  );
  for (const it of payload.images) {
    if (!it || typeof it.url !== "string" || !it.url) {
      skipped++;
      continue;
    }
    findStmt.run([it.url]);
    if (findStmt.step()) {
      const existing = rowToObj(findStmt, findStmt.get());
      findStmt.reset();
      const mergedTags = mergeTags(existing.tags, it.tags || "");
      if (mergedTags === existing.tags) {
        skipped++;
        continue;
      }
      updateStmt.run([it.name || "", mergedTags, it.note || "", it.url]);
      merged++;
    } else {
      findStmt.reset();
      insertStmt.run([
        it.url,
        it.name || "",
        it.tags || "",
        it.note || "",
        it.created_at || Date.now(),
      ]);
      added++;
    }
  }
  findStmt.free();
  insertStmt.free();
  updateStmt.free();
  await persist();
  return { added, merged, skipped, total: payload.images.length };
}

export async function clearAll() {
  db.run(`DELETE FROM images`);
  await persist();
}
