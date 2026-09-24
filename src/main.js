import "./style.css";
import { initDB, me } from "./db.js";
import { state } from "./state.js";
import { THEME_KEY, THEME_ORDER } from "./theme.js";
import { renderApp } from "./ui/app.js";
import { closeUserMenu } from "./ui/users.js";
import { bindDropZone } from "./upload.js";
import { refresh } from "./refresh.js";

(async function main() {
  let saved = "system";
  try {
    saved = localStorage.getItem(THEME_KEY) || "system";
    if (!THEME_ORDER.includes(saved)) saved = "system";
  } catch {}
  state.theme = saved;
  if (saved === "dark")
    document.documentElement.setAttribute("data-theme", "dark");
  else if (saved === "light")
    document.documentElement.setAttribute("data-theme", "light");
  await initDB();
  try {
    const r = await me();
    state.user = r.user;
  } catch {}
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#user-menu") && !e.target.closest("#user-fab"))
      closeUserMenu();
  });
  renderApp();
  bindDropZone();
  await refresh();
})();
