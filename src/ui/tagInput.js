import { el } from "../lib/dom.js";
import { splitTags } from "../db.js";

export function buildTagInput(initialTags, { id = "edit-tags" } = {}) {
  const wrap = el("div", { class: "tag-input-wrap" });
  const hidden = el("input", {
    type: "hidden",
    id,
    value: initialTags.join(","),
  });
  const input = el("input", {
    type: "text",
    class: "tag-input",
    placeholder: initialTags.length ? "" : "壁纸, 风景",
  });

  function renderChips() {
    wrap.querySelectorAll(".tag-input-chip").forEach((n) => n.remove());
    const tags = splitTags(hidden.value);
    const frag = document.createDocumentFragment();
    for (const t of tags) {
      const chip = el("span", { class: "tag-input-chip" }, [
        t,
        el(
          "button",
          {
            type: "button",
            class: "tag-input-remove",
            "aria-label": "移除",
            onclick: () => {
              const cur = splitTags(hidden.value);
              const idx = cur.indexOf(t);
              if (idx >= 0) cur.splice(idx, 1);
              hidden.value = cur.join(",");
              chip.remove();
              input.placeholder = cur.length ? "" : "壁纸, 风景";
            },
          },
          "×",
        ),
      ]);
      chip.dataset.value = t;
      frag.appendChild(chip);
    }
    wrap.insertBefore(frag, input);
  }

  function commitInput() {
    const v = input.value.trim();
    if (v === "") return;
    const cur = splitTags(hidden.value);
    cur.push(v);
    hidden.value = cur.join(",");
    renderChips();
    input.value = "";
  }

  input.addEventListener("keydown", (e) => {
    if (
      e.key === "," ||
      e.key === "，" ||
      e.key === "Enter" ||
      e.key === "NumpadEnter"
    ) {
      e.preventDefault();
      if (input.value.trim() === "") return;
      commitInput();
    } else if (e.key === "Backspace" && input.value === "") {
      const cur = splitTags(hidden.value);
      if (cur.length === 0) return;
      cur.pop();
      hidden.value = cur.join(",");
      renderChips();
      input.placeholder = cur.length ? "" : "壁纸, 风景";
    }
  });

  input.addEventListener("blur", () => {
    commitInput();
  });

  wrap.appendChild(hidden);
  wrap.appendChild(input);
  renderChips();
  return wrap;
}

export function resetUploadTags() {
  const hidden = document.querySelector("#up-tags");
  if (!hidden) return;
  hidden.value = "";
  const wrap = hidden.parentElement;
  if (!wrap) return;
  wrap.querySelectorAll(".tag-input-chip").forEach((n) => n.remove());
  const input = wrap.querySelector(".tag-input");
  if (input) {
    input.value = "";
    input.placeholder = "壁纸, 风景";
  }
}
