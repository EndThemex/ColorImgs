import { db } from "../db.js";
import { json, err, readJson } from "../http.js";
import {
  verifyPassword,
  hashPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  sessionDelete,
  requireAuth,
} from "../auth.js";

export async function login(req) {
  const body = await readJson(req);
  if (!body) return err("请求体不是合法 JSON");
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) return err("用户名和密码必填");
  const row = db
    .query(
      `SELECT id, username, password_hash, role FROM users WHERE username = ?`,
    )
    .get(username);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return err("用户名或密码不正确", 401);
  }
  const { token, expiresAt } = createSession(row.id);
  const resp = json({
    user: { id: row.id, username: row.username, role: row.role },
    expires_at: expiresAt,
  });
  return setSessionCookie(resp, token, expiresAt);
}

export async function logout(req, user) {
  if (user) sessionDelete.run(user.token);
  const resp = json({ ok: true });
  return clearSessionCookie(resp);
}

export async function me(req, user) {
  if (!user) return json({ user: null });
  return json({
    user: { id: user.id, username: user.username, role: user.role },
  });
}

export async function changePassword(req, user) {
  const denied = requireAuth(user);
  if (denied) return denied;
  const body = await readJson(req);
  if (!body) return err("请求体不是合法 JSON");
  const oldPass = String(body.old_password || "");
  const newPass = String(body.new_password || "");
  if (!newPass || newPass.length < 4) return err("新密码至少 4 位");
  const row = db
    .query(`SELECT password_hash FROM users WHERE id = ?`)
    .get(user.id);
  if (!row || !verifyPassword(oldPass, row.password_hash)) {
    return err("原密码不正确", 401);
  }
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
    hashPassword(newPass),
    user.id,
  );
  return json({ ok: true });
}
