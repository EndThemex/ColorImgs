import { json, err } from "./http.js";
import { currentUser, DEFAULT_ADMIN_USER } from "./auth.js";
import { DB_PATH } from "./db.js";
import * as authRoutes from "./routes/auth.js";
import * as userRoutes from "./routes/users.js";
import * as imageRoutes from "./routes/images.js";
import * as transferRoutes from "./routes/transfer.js";

const PORT = Number(process.env.PORT || 5534);

async function handle(req) {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method;
  const user = currentUser(req);

  if (pathname === "/api/health") return json({ ok: true });

  // ---------- Auth ----------
  if (pathname === "/api/auth/login" && method === "POST")
    return authRoutes.login(req);
  if (pathname === "/api/auth/logout" && method === "POST")
    return authRoutes.logout(req, user);
  if (pathname === "/api/auth/me" && method === "GET")
    return authRoutes.me(req, user);
  if (pathname === "/api/auth/password" && method === "POST")
    return authRoutes.changePassword(req, user);

  // ---------- User management ----------
  if (pathname === "/api/users" && method === "GET")
    return userRoutes.list(req, user);
  if (pathname === "/api/users" && method === "POST")
    return userRoutes.create(req, user);

  const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);
  if (userMatch) {
    const id = Number(userMatch[1]);
    if (method === "DELETE") return userRoutes.remove(req, user, id);
    if (method === "PATCH") return userRoutes.patch(req, user, id);
  }

  // ---------- Images ----------
  if (pathname === "/api/images" && method === "GET")
    return imageRoutes.list(url, user);
  if (pathname === "/api/images" && method === "POST")
    return imageRoutes.create(req, user);
  if (pathname === "/api/images" && method === "DELETE")
    return imageRoutes.clearAll(req, user);

  const imageMatch = pathname.match(/^\/api\/images\/(\d+)$/);
  if (imageMatch) {
    const id = Number(imageMatch[1]);
    const existing = imageRoutes.findExisting(id);
    if (!existing) return err("记录不存在", 404);
    if (method === "PUT") return imageRoutes.update(req, user, id, existing);
    if (method === "DELETE") return imageRoutes.remove(req, user, id, existing);
  }

  if (pathname === "/api/tags" && method === "GET") return imageRoutes.tags();

  // ---------- Export / Import ----------
  if (pathname === "/api/export" && method === "GET")
    return transferRoutes.exportImages(req, user);
  if (pathname === "/api/import" && method === "POST")
    return transferRoutes.importImages(req, user);

  return err("Not Found", 404);
}

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

console.log(`[colorimgs] server listening on http://localhost:${server.port}`);
console.log(`[colorimgs] db file: ${DB_PATH}`);
console.log(`[colorimgs] default admin: ${DEFAULT_ADMIN_USER}`);
