import { renderToolbar } from "./toolbar.js";

export function renderApp() {
  const root = document.querySelector("#app");
  root.innerHTML = "";
  renderToolbar();
}
