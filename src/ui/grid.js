import { el } from "../lib/dom.js";
import { fmtTime, copyText, downloadImage } from "../lib/utils.js";
import { iconDownload, iconLink } from "../lib/icons.js";
import { canEdit, state } from "../state.js";
import { splitTags } from "../db.js";
import { loadMore } from "../refresh.js";
import { openDetail } from "./detail.js";

export function buildCard(it) {
  const tags = splitTags(it.tags);
  const editable = canEdit(it);
  return el("div", { class: "card", onclick: () => openDetail(it) }, [
    el("div", { class: "thumb" }, [
      el("img", {
        src: it.url,
        loading: "lazy",
        decoding: "async",
        alt: it.name || "",
      }),
      el("div", { class: "card-actions" }, [
        el(
          "button",
          {
            class: "card-icon-btn",
            title: "下载图片",
            "aria-label": "下载图片",
            onclick: (e) => {
              e.stopPropagation();
              downloadImage(it.url, it.name);
            },
          },
          iconDownload(),
        ),
        el(
          "button",
          {
            class: "card-icon-btn",
            title: "复制 URL",
            "aria-label": "复制 URL",
            onclick: (e) => {
              e.stopPropagation();
              copyText(it.url, "URL 已复制");
            },
          },
          iconLink(),
        ),
      ]),
    ]),
    el("div", { class: "meta" }, [
      el(
        "div",
        { class: "meta-name", title: it.name || it.url },
        it.name || "(未命名)",
      ),
      el(
        "div",
        { class: "meta-tags" },
        tags.map((t) => el("span", { class: "meta-tag" }, t)),
      ),
      el(
        "div",
        { class: "meta-time" },
        `${fmtTime(it.created_at)}${editable ? "" : "  只读"}`,
      ),
    ]),
  ]);
}

export function ensureGrid() {
  const root = document.querySelector("#app");
  let grid = root.querySelector(".grid");
  if (!grid) {
    grid = el("div", { class: "grid" });
    root.appendChild(grid);
  }
  return grid;
}

export function clearGrid() {
  const root = document.querySelector("#app");
  const old = root.querySelector(".grid");
  if (old) old.remove();
  const oldFooter = root.querySelector(".grid-footer");
  if (oldFooter) oldFooter.remove();
  const oldEmpty = root.querySelector(".empty");
  if (oldEmpty) oldEmpty.remove();
}

export function renderGridSentinel() {
  const root = document.querySelector("#app");
  let footer = root.querySelector(".grid-footer");
  let empty = root.querySelector(".empty");
  if (empty) empty.remove();

  if (state.items.length === 0 && state.total === 0) {
    const grid = ensureGrid();
    const e = el("div", { class: "empty" }, "没有匹配的图片");
    grid.appendChild(e);
    if (footer) footer.remove();
    return;
  }

  if (!footer) {
    footer = el("div", { class: "grid-footer" });
    root.appendChild(footer);
  }
  footer.innerHTML = "";
  footer.appendChild(
    el(
      "div",
      { class: "grid-info" },
      `已显示 ${state.items.length} / ${state.total}`,
    ),
  );
  if (state.hasMore) {
    footer.appendChild(
      el(
        "button",
        {
          class: "btn btn-ghost",
          onclick: () => loadMore(),
        },
        "加载更多",
      ),
    );
  }
}

export function renderGrid() {
  clearGrid();
  const grid = ensureGrid();
  if (state.items.length === 0) {
    renderGridSentinel();
    return;
  }
  const frag = document.createDocumentFragment();
  for (const it of state.items) frag.appendChild(buildCard(it));
  grid.appendChild(frag);
  renderGridSentinel();
}

export function appendGrid(newItems) {
  if (newItems.length === 0) return;
  const grid = ensureGrid();
  const frag = document.createDocumentFragment();
  for (const it of newItems) frag.appendChild(buildCard(it));
  grid.appendChild(frag);
}
