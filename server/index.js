import { Database } from "bun:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data.sqlite");
const PORT = Number(process.env.PORT || 5534);

export function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split(/[,\uff0c\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mergeTags(existing, incoming) {
  const set = new Set();
  for (const src of [existing, incoming])
    splitTags(src).forEach((t) => set.add(t));
  return [...set].join(",");
}

const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
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

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function err(message, status = 400) {
  return json({ error: message }, { status });
}

async function readJson(req) {
  try {
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

function listImagesQuery(url) {
  const search = url.searchParams.get("search") || "";
  const tag = url.searchParams.get("tag") || "";
  const limit = Math.max(0, Number(url.searchParams.get("limit")) || 0);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const where = [];
  const params = [];
  if (search) {
    where.push("(name LIKE ? OR tags LIKE ? OR note LIKE ?)");
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  const tags = splitTags(tag);
  for (const t of tags) {
    where.push("(',' || tags || ',') LIKE ?");
    params.push(`%,${t},%`);
  }
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";

  const orderLimit =
    ` ORDER BY created_at DESC` + (limit > 0 ? " LIMIT ? OFFSET ?" : "");
  const rows = db
    .query(`SELECT * FROM images${whereSql}${orderLimit}`)
    .all(...(limit > 0 ? [...params, limit, offset] : params));

  let total;
  if (limit > 0) {
    const { c } = db
      .query(`SELECT COUNT(*) AS c FROM images${whereSql}`)
      .get(...params);
    total = c;
  } else {
    total = rows.length;
  }
  return { rows, total };
}

const insertStmt = db.prepare(
  `INSERT INTO images (url, name, tags, note, created_at)
   VALUES ($url, $name, $tags, $note, $created_at)
   ON CONFLICT(url) DO UPDATE SET
     name = COALESCE(NULLIF(excluded.name, ''), images.name),
     tags = CASE WHEN excluded.tags = '' THEN images.tags ELSE excluded.tags END,
     note = CASE WHEN excluded.note = '' THEN images.note ELSE excluded.note END
   RETURNING *`,
);
const updateStmt = db.prepare(
  `UPDATE images SET name = $name, tags = $tags, note = $note WHERE id = $id RETURNING *`,
);
const deleteStmt = db.prepare(`DELETE FROM images WHERE id = ?`);
const findByUrlStmt = db.prepare(`SELECT * FROM images WHERE url = ?`);
const updateByUrlStmt = db.prepare(
  `UPDATE images SET
     name = COALESCE(NULLIF($name, ''), name),
     tags = $tags,
     note = COALESCE(NULLIF($note, ''), note)
   WHERE url = $url`,
);
const insertRawStmt = db.prepare(
  `INSERT INTO images (url, name, tags, note, created_at) VALUES (?, ?, ?, ?, ?)`,
);
const tagsStmt = db.query(`SELECT tags FROM images WHERE tags != ''`);
const exportStmt = db.query(`SELECT * FROM images ORDER BY created_at ASC`);
const clearStmt = db.prepare(`DELETE FROM images`);

const server = Bun.serve({
  port: PORT,
  development: false,
  async fetch(req) {
    try {
      return await handle(req);
    } catch (e) {
      console.error("[error]", req.method, req.url, e);
      return json({ error: e?.message || String(e) }, { status: 500 });
    }
  },
});

async function handle(req) {
  const url = new URL(req.url);
  if (url.pathname === "/api/health") return json({ ok: true });

  if (url.pathname === "/api/images" && req.method === "GET") {
    return json(listImagesQuery(url));
  }
  if (url.pathname === "/api/images" && req.method === "POST") {
    const body = await readJson(req);
    if (!body) return err("请求体不是合法 JSON");
    const { url: u, name = "", tags = "", note = "" } = body;
    if (typeof u !== "string" || !u) return err("url 必填");
    const row = insertStmt.get({
      $url: u,
      $name: name,
      $tags: tags,
      $note: note,
      $created_at: Date.now(),
    });
    return json(row);
  }
  if (url.pathname === "/api/images" && req.method === "DELETE") {
    clearStmt.run();
    return json({ ok: true });
  }

  const m = url.pathname.match(/^\/api\/images\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    if (req.method === "PUT") {
      const body = await readJson(req);
      if (!body) return err("请求体不是合法 JSON");
      const { name = "", tags = "", note = "" } = body;
      const row = updateStmt.get({
        $id: id,
        $name: name,
        $tags: tags,
        $note: note,
      });
      if (!row) return err("记录不存在", 404);
      return json(row);
    }
    if (req.method === "DELETE") {
      const info = deleteStmt.run(id);
      if (info.changes === 0) return err("记录不存在", 404);
      return json({ ok: true });
    }
  }

  if (url.pathname === "/api/tags" && req.method === "GET") {
    const set = new Set();
    for (const r of tagsStmt.all())
      splitTags(r.tags).forEach((t) => set.add(t));
    return json([...set].sort((a, b) => a.localeCompare(b)));
  }

  if (url.pathname === "/api/export" && req.method === "GET") {
    const rows = exportStmt.all().map((o) => ({
      url: o.url,
      name: o.name,
      tags: o.tags,
      note: o.note,
      created_at: o.created_at,
    }));
    return json({
      app: "colorimgs",
      version: 1,
      exported_at: new Date().toISOString(),
      images: rows,
    });
  }

  if (url.pathname === "/api/import" && req.method === "POST") {
    const body = await readJson(req);
    if (!body || !Array.isArray(body.images))
      return err("JSON 格式不正确: 缺少 images 数组");
    let added = 0;
    let merged = 0;
    let skipped = 0;

    const txn = db.transaction((items) => {
      for (const it of items) {
        if (!it || typeof it.url !== "string" || !it.url) {
          skipped++;
          continue;
        }
        const existing = findByUrlStmt.get(it.url);
        if (existing) {
          const mergedTags = mergeTags(existing.tags, it.tags || "");
          if (mergedTags === existing.tags) {
            skipped++;
            continue;
          }
          updateByUrlStmt.run({
            $name: it.name || "",
            $tags: mergedTags,
            $note: it.note || "",
            $url: it.url,
          });
          merged++;
        } else {
          try {
            insertRawStmt.run(
              it.url,
              it.name || "",
              it.tags || "",
              it.note || "",
              it.created_at || Date.now(),
            );
            added++;
          } catch (e) {
            if (String(e && e.message).includes("UNIQUE")) skipped++;
            else throw e;
          }
        }
      }
    });

    try {
      txn(body.images);
    } catch (e) {
      return err(e.message, 500);
    }
    return json({ added, merged, skipped, total: body.images.length });
  }

  return err("Not Found", 404);
}

console.log(`[colorimgs] server listening on http://localhost:${server.port}`);
console.log(`[colorimgs] db file: ${DB_PATH}`);
