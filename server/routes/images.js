import { db, splitTags } from "../db.js";
import { json, err, readJson } from "../http.js";
import { requireAuth, requireAdmin } from "../auth.js";

const insertStmt = db.prepare(
  `INSERT INTO images (url, name, tags, note, created_at, owner_id)
   VALUES ($url, $name, $tags, $note, $created_at, $owner_id)
   ON CONFLICT(url) DO UPDATE SET
     name = COALESCE(NULLIF(excluded.name, ''), images.name),
     tags = CASE WHEN excluded.tags = '' THEN images.tags ELSE excluded.tags END,
     note = CASE WHEN excluded.note = '' THEN images.note ELSE images.note END,
     owner_id = COALESCE(images.owner_id, excluded.owner_id)
   RETURNING *`,
);
const updateStmt = db.prepare(
  `UPDATE images SET name = $name, tags = $tags, note = $note WHERE id = $id RETURNING *`,
);
const deleteStmt = db.prepare(`DELETE FROM images WHERE id = ?`);
const findByIdStmt = db.prepare(`SELECT * FROM images WHERE id = ?`);
const findByUrlStmt = db.prepare(`SELECT * FROM images WHERE url = ?`);
const tagsStmt = db.query(`SELECT tags FROM images WHERE tags != ''`);
const clearStmt = db.prepare(`DELETE FROM images`);

function canEditImage(user, image) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return image.owner_id === user.id;
}

export function findExisting(id) {
  return findByIdStmt.get(id);
}

export async function list(url, user) {
  const search = url.searchParams.get("search") || "";
  const tag = url.searchParams.get("tag") || "";
  const scope = url.searchParams.get("scope") || "all"; // all | mine
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
  if (user && scope === "mine") {
    where.push("owner_id = ?");
    params.push(user.id);
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
  return json({ rows, total });
}

export async function create(req, user) {
  const denied = requireAuth(user);
  if (denied) return denied;
  const body = await readJson(req);
  if (!body) return err("请求体不是合法 JSON");
  const { url: u, name = "", tags = "", note = "" } = body;
  if (typeof u !== "string" || !u) return err("url 必填");
  const existing = findByUrlStmt.get(u);
  if (existing && !canEditImage(user, existing))
    return err("无权修改此记录", 403);
  const row = insertStmt.get({
    $url: u,
    $name: name,
    $tags: tags,
    $note: note,
    $created_at: Date.now(),
    $owner_id: user.id,
  });
  return json(row);
}

export async function clearAll(req, user) {
  const denied = requireAdmin(user);
  if (denied) return denied;
  clearStmt.run();
  return json({ ok: true });
}

export async function update(req, user, id, existing) {
  const denied = requireAuth(user);
  if (denied) return denied;
  if (!canEditImage(user, existing)) return err("无权编辑此记录", 403);
  const body = await readJson(req);
  if (!body) return err("请求体不是合法 JSON");
  const { name = "", tags = "", note = "" } = body;
  const row = updateStmt.get({
    $id: id,
    $name: name,
    $tags: tags,
    $note: note,
  });
  return json(row);
}

export async function remove(req, user, id, existing) {
  const denied = requireAuth(user);
  if (denied) return denied;
  if (!canEditImage(user, existing)) return err("无权删除此记录", 403);
  const info = deleteStmt.run(id);
  if (info.changes === 0) return err("记录不存在", 404);
  return json({ ok: true });
}

export async function tags() {
  const set = new Set();
  for (const r of tagsStmt.all()) splitTags(r.tags).forEach((t) => set.add(t));
  return json([...set].sort((a, b) => a.localeCompare(b)));
}
