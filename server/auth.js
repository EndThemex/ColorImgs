import crypto from "node:crypto";
import { db } from "./db.js";
import { err, parseCookies } from "./http.js";

export const SESSION_COOKIE = "colorimgs_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
export const DEFAULT_ADMIN_USER = process.env.ADMIN_USER || "shane";
const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASS || "imgs.shane.xia";

export function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(String(password), useSalt, 100_000, 32, "sha256")
    .toString("hex");
  return `pbkdf2$${useSalt}$${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const [, salt, expected] = parts;
  const got = crypto
    .pbkdf2Sync(String(password), salt, 100_000, 32, "sha256")
    .toString("hex");
  return (
    got.length === expected.length &&
    crypto.timingSafeEqual(
      Buffer.from(got, "hex"),
      Buffer.from(expected, "hex"),
    )
  );
}

function ensureDefaultAdmin() {
  const count = db.query(`SELECT COUNT(*) AS c FROM users`).get().c;
  if (count > 0) return;
  const stmt = db.prepare(
    `INSERT INTO users (username, password_hash, role, created_at)
     VALUES (?, ?, 'admin', ?)`,
  );
  stmt.run(DEFAULT_ADMIN_USER, hashPassword(DEFAULT_ADMIN_PASS), Date.now());
  console.log(
    `[colorimgs] default admin created: ${DEFAULT_ADMIN_USER} (change password after first login)`,
  );
}
ensureDefaultAdmin();

const sessionInsert = db.prepare(
  `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`,
);
const sessionSelect = db.prepare(
  `SELECT s.token, s.user_id, s.expires_at, u.username, u.role
   FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
);
export const sessionDelete = db.prepare(
  `DELETE FROM sessions WHERE token = ?`,
);
export const sessionDeleteByUser = db.prepare(
  `DELETE FROM sessions WHERE user_id = ?`,
);
const cleanupSessions = db.prepare(`DELETE FROM sessions WHERE expires_at < ?`);

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessionInsert.run(token, userId, expiresAt);
  return { token, expiresAt };
}

export function currentUser(req) {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  cleanupSessions.run(Date.now());
  const row = sessionSelect.get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    sessionDelete.run(token);
    return null;
  }
  return { id: row.user_id, username: row.username, role: row.role, token };
}

export function setSessionCookie(resp, token, expiresAt) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];
  resp.headers.append("Set-Cookie", parts.join("; "));
  return resp;
}

export function clearSessionCookie(resp) {
  resp.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return resp;
}

export function requireAuth(user) {
  if (!user) return err("未登录或会话已过期", 401);
  return null;
}

export function requireAdmin(user) {
  const r = requireAuth(user);
  if (r) return r;
  if (user.role !== "admin") return err("需要管理员权限", 403);
  return null;
}
