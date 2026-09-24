import { Database } from "bun:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "data.sqlite");

export const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");

function hasColumn(table, column) {
  const rows = db.query(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === column);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

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

if (!hasColumn("images", "owner_id")) {
  db.exec(
    `ALTER TABLE images ADD COLUMN owner_id INTEGER REFERENCES users(id)`,
  );
  db.exec(`CREATE INDEX IF NOT EXISTS idx_images_owner ON images(owner_id)`);
}

export function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split(/[,\uff0c\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mergeTags(existing, incoming) {
  const set = new Set();
  for (const src of [existing, incoming])
    splitTags(src).forEach((t) => set.add(t));
  return [...set].join(",");
}
