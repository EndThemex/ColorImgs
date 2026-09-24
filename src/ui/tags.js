import { el } from "../lib/dom.js";
import { state } from "../state.js";
import { refresh } from "../refresh.js";

export function renderTags() {
  const wrap = document.querySelector("#tag-list");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (state.allTags.length === 0) {
    wrap.appendChild(el("div", { class: "tag-empty" }, "暂无标签"));
    return;
  }
  for (const t of state.allTags) {
    const active = state.activeTags.has(t);
    wrap.appendChild(
      el(
        "button",
        {
          class: `tag-chip${active ? " active" : ""}`,
          onclick: () => {
            if (active) state.activeTags.delete(t);
            else state.activeTags.add(t);
            refresh();
          },
        },
        t,
      ),
    );
  }
}
