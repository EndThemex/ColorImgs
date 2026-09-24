import { state } from "../state.js";

export function closeAll() {
  document.querySelectorAll(".modal").forEach((m) => {
    m.classList.remove("show");
    setTimeout(() => m.remove(), 180);
  });
  state.detail = null;
}
