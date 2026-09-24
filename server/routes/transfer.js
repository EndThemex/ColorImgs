import { db, splitTags, mergeTags } from "../db.js";
import { json, err, readJson } from "../http.js";
import { requireAdmin } from "../auth.js";

const findByUrlStmt = db.prepare(`SELECT * FROM images WHERE url = ?`);
const updateByUrlStmt = db.prepare(
  `UPDATE images SET
     name = COALESCE(NULLIF($name, ''), name),
     tags = $tags,
     note = COALESCE(NULLIF($note, ''), note)
   WHERE url = $url`,
);
const insertRawStmt = db.prepare(
  `INSERT INTO images (url, name, tags, note, created_at, owner_id)
   VALUES (?, ?, ?, ?, ?, ?)`,
);
const exportStmt = db.query(
  `SELECT url, name, tags, note, created_at FROM images ORDER BY created_at ASC`,
);

export async function exportImages(req, user) {
  const denied = requireAdmin(user);
  if (denied) return denied;
  return json({
    app: "colorimgs",
    version: 1,
    exported_at: new Date().toISOString(),
    images: exportStmt.all(),
  });
}

export async function importImages(req, user) {
  const denied = requireAdmin(user);
  if (denied) return denied;
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
        const createdAt = Number(it.created_at);
        const ts =
          Number.isFinite(createdAt) && createdAt > 0
            ? Math.floor(createdAt)
            : Date.now();
        try {
          insertRawStmt.run(
            it.url,
            it.name || "",
            it.tags || "",
            it.note || "",
            ts,
            user.id,
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
