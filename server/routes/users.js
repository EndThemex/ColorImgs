import { db } from "../db.js";
import { json, err, readJson } from "../http.js";
import {
  hashPassword,
  requireAdmin,
  sessionDeleteByUser,
} from "../auth.js";

export async function list(req, user) {
  const denied = requireAdmin(user);
  if (denied) return denied;
  const rows = db
    .query(`SELECT id, username, role, created_at FROM users ORDER BY id ASC`)
    .all();
  return json(rows);
}

export async function create(req, user) {
  const denied = requireAdmin(user);
  if (denied) return denied;
  const body = await readJson(req);
  if (!body) return err("请求体不是合法 JSON");
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const role = body.role === "admin" ? "admin" : "user";
  if (!username || username.length < 2) return err("用户名至少 2 位");
  if (!password || password.length < 4) return err("密码至少 4 位");
  try {
    const info = db
      .prepare(
        `INSERT INTO users (username, password_hash, role, created_at)
           VALUES (?, ?, ?, ?)`,
      )
      .run(username, hashPassword(password), role, Date.now());
    return json({
      id: info.lastInsertRowid,
      username,
      role,
      created_at: Date.now(),
    });
  } catch (e) {
    if (String(e?.message).includes("UNIQUE"))
      return err("用户名已存在", 409);
    throw e;
  }
}

export async function remove(req, user, id) {
  const denied = requireAdmin(user);
  if (denied) return denied;
  if (id === user.id) return err("不能删除当前登录的管理员", 400);
  const info = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  if (info.changes === 0) return err("用户不存在", 404);
  sessionDeleteByUser.run(id);
  return json({ ok: true });
}

export async function patch(req, user, id) {
  const denied = requireAdmin(user);
  if (denied) return denied;
  const body = await readJson(req);
  if (!body) return err("请求体不是合法 JSON");
  const fields = [];
  const params = [];
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 4) return err("密码至少 4 位");
    fields.push("password_hash = ?");
    params.push(hashPassword(body.password));
  }
  if (body.role && (body.role === "admin" || body.role === "user")) {
    if (id === user.id && body.role !== "admin")
      return err("不能撤销自己的管理员身份", 400);
    fields.push("role = ?");
    params.push(body.role);
  }
  if (!fields.length) return err("没有可更新的字段", 400);
  params.push(id);
  const info = db
    .prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`)
    .run(...params);
  if (info.changes === 0) return err("用户不存在", 404);
  return json({ ok: true });
}
