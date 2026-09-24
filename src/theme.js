import { el } from "./lib/dom.js";
import { iconTheme } from "./lib/icons.js";
import { state } from "./state.js";

export const THEME_KEY = "colorimgs-theme";
export const THEME_ORDER = ["system", "light", "dark"];

export const THEME_LABEL = {
  system: "跟随系统",
  light: "浅色",
  dark: "深色",
};

export function applyTheme(theme) {
  state.theme = theme;
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  const btn = document.querySelector("#theme-toggle");
  if (btn) {
    btn.setAttribute("aria-label", THEME_LABEL[theme]);
    btn.title = THEME_LABEL[theme];
    btn.replaceChildren(iconTheme(theme));
  }
  showThemeToast(theme);
}

function showThemeToast(theme) {
  let t = document.querySelector("#theme-toast");
  if (!t) {
    t = el("div", { id: "theme-toast", class: "theme-toast" });
    document.body.appendChild(t);
  }
  t.classList.remove("show");
  t.replaceChildren(
    iconTheme(theme),
    document.createTextNode(THEME_LABEL[theme]),
  );
  // force reflow so the transition restarts when toggled quickly
  void t.offsetWidth;
  t.classList.add("show");
  clearTimeout(showThemeToast._timer);
  showThemeToast._timer = setTimeout(() => t.classList.remove("show"), 1600);
}

export function nextTheme() {
  const i = THEME_ORDER.indexOf(state.theme);
  return THEME_ORDER[(i + 1) % THEME_ORDER.length];
}
