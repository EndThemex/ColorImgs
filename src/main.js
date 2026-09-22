import "./style.css";
import {
  initDB,
  listImages,
  listAllTags,
  addImage,
  updateImage,
  deleteImage,
  exportJSON,
  importJSON,
  clearAll,
  splitTags,
} from "./db.js";
import { uploadImage } from "./imagebed.js";

const PAGE_SIZE = 60;
const THEME_KEY = "colorimgs-theme";
const THEME_ORDER = ["system", "light", "dark"];

const state = {
  search: "",
  activeTags: new Set(),
  detail: null,
  allTags: [],
  items: [],
  total: 0,
  offset: 0,
  hasMore: false,
  theme: "system",
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== false && v != null) {
      node.setAttribute(k, v);
    }
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function fmtTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toast(msg, kind = "info") {
  const t = el("div", { class: `toast toast-${kind}` }, msg);
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

async function handleUpload(file, fields) {
  const cdn = document.querySelector("#cdn-domain").value.trim();
  const onProgress = (p) => {
    const bar = document.querySelector(`[data-progress="${file.name}"]`);
    if (bar) bar.style.width = `${(p * 100).toFixed(1)}%`;
  };
  try {
    const res = await uploadImage(file, { cdn_domain: cdn, onProgress });
    await addImage({
      url: res.url,
      name: fields.name,
      tags: fields.tags,
      note: fields.note,
    });
    toast(res.reused ? "已存在，秒传成功" : "上传成功");
  } catch (err) {
    toast(`失败: ${err.message}`, "error");
    throw err;
  }
}

async function handleFiles(fileList, fields) {
  const files = [...fileList];
  const queue = el("div", { class: "upload-queue" });
  document.querySelector("#upload-queue-wrap").appendChild(queue);

  for (const f of files) {
    const item = el("div", { class: "upload-item" }, [
      el("div", { class: "upload-name" }, f.name),
      el("div", { class: "upload-bar" }, [
        el("div", { class: "upload-bar-fill", dataset: { progress: f.name } }),
      ]),
      el("div", { class: "upload-status" }, "等待中"),
    ]);
    queue.appendChild(item);
    const status = item.querySelector(".upload-status");
    status.textContent = "上传中…";
    try {
      await handleUpload(f, fields);
      status.textContent = "完成";
      item.classList.add("done");
    } catch {
      status.textContent = "失败";
      item.classList.add("fail");
    }
  }
  await refresh();
  setTimeout(() => queue.remove(), 1500);
}

function renderHeader() {
  // Header removed; import/export actions live in the filter card.
  const root = document.querySelector("#app");
  root.innerHTML = "";
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, ms);
  };
}

const THEME_LABEL = {
  system: "跟随系统",
  light: "浅色",
  dark: "深色",
};

function applyTheme(theme) {
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

function nextTheme() {
  const i = THEME_ORDER.indexOf(state.theme);
  return THEME_ORDER[(i + 1) % THEME_ORDER.length];
}

function renderToolbar() {
  const root = document.querySelector("#app");
  root.appendChild(
    el("section", { class: "toolbar" }, [
      el("div", { class: "upload-card" }, [
        el("h2", {}, "上传到图床"),
        el("div", { class: "upload-fields" }, [
          el("label", {}, [
            "名称（可选，留空取文件名）",
            el("input", { id: "up-name", type: "text" }),
          ]),
          el("label", {}, [
            "标签（英文逗号分隔）",
            buildTagInput([], { id: "up-tags" }),
          ]),
        ]),
        el("details", { class: "upload-extra" }, [
          el("summary", {}, "高级选项"),
          el("label", { class: "upload-extra-field" }, [
            "CDN 域名（可选）",
            el("input", {
              id: "cdn-domain",
              type: "text",
              placeholder: "留空使用默认",
              list: "cdn-list",
            }),
            el("datalist", { id: "cdn-list" }, [
              el("option", { value: "img.scdn.io" }),
              el("option", { value: "cloudflareimg.cdn.sn" }),
              el("option", { value: "edgeoneimg.cdn.sn" }),
              el("option", { value: "esaimg.cdn1.vip" }),
              el("option", { value: "cloudflarecnimg.scdn.io" }),
              el("option", { value: "anycastimg.scdn.io" }),
              el("option", { value: "edgeoneimg.cdn1.vip" }),
            ]),
          ]),
        ]),
        el("label", { class: "file-drop" }, [
          "点击或拖拽图片到此处上传",
          el("input", {
            id: "file-input",
            type: "file",
            accept: "image/*",
            multiple: "multiple",
            onchange: (e) => {
              const fields = {
                name: document.querySelector("#up-name").value.trim(),
                tags: document.querySelector("#up-tags").value.trim(),
                note: "",
              };
              handleFiles(e.target.files, fields);
              resetUploadTags();
              e.target.value = "";
            },
          }),
        ]),
        el("div", { id: "upload-queue-wrap" }),
      ]),
      el("div", { class: "filter-card" }, [
        el("h2", {}, "筛选"),
        el("input", {
          id: "search",
          type: "search",
          placeholder: "搜索 名称 / 标签 / 备注",
          value: state.search,
          oninput: (e) => {
            state.search = e.target.value;
            debouncedSearch();
          },
        }),
        el("div", { class: "tag-list", id: "tag-list" }),
        el(
          "button",
          {
            class: "btn btn-text",
            onclick: () => {
              state.activeTags.clear();
              refresh();
            },
          },
          "清空标签筛选",
        ),
      ]),
    ]),
  );
  root.appendChild(buildFab());
}

function buildFab() {
  return el("div", { class: "fab" }, [
    el(
      "label",
      { class: "fab-btn", title: "导入 JSON", "aria-label": "导入 JSON" },
      [
        iconDownload(),
        el("input", {
          type: "file",
          accept: "application/json",
          style: "display:none",
          onchange: (e) => {
            onImport(e.target.files[0]);
            e.target.value = "";
          },
        }),
      ],
    ),
    el(
      "button",
      {
        class: "fab-btn",
        title: "导出 JSON",
        "aria-label": "导出 JSON",
        onclick: onExport,
      },
      iconUpload(),
    ),
    el(
      "button",
      {
        id: "theme-toggle",
        class: "fab-btn",
        "aria-label": THEME_LABEL[state.theme],
        title: THEME_LABEL[state.theme],
        onclick: () => applyTheme(nextTheme()),
      },
      iconTheme(state.theme),
    ),
  ]);
}

function renderTags() {
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

function buildCard(it) {
  const tags = splitTags(it.tags);
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
      el("div", { class: "meta-time" }, fmtTime(it.created_at)),
    ]),
  ]);
}

function ensureGrid() {
  const root = document.querySelector("#app");
  let grid = root.querySelector(".grid");
  if (!grid) {
    grid = el("div", { class: "grid" });
    root.appendChild(grid);
  }
  return grid;
}

function clearGrid() {
  const root = document.querySelector("#app");
  const old = root.querySelector(".grid");
  if (old) old.remove();
  const oldFooter = root.querySelector(".grid-footer");
  if (oldFooter) oldFooter.remove();
  const oldEmpty = root.querySelector(".empty");
  if (oldEmpty) oldEmpty.remove();
}

function renderGridSentinel() {
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

function renderGrid() {
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

function appendGrid(newItems) {
  if (newItems.length === 0) return;
  const grid = ensureGrid();
  const frag = document.createDocumentFragment();
  for (const it of newItems) frag.appendChild(buildCard(it));
  grid.appendChild(frag);
}

function iconDownload() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const p1 = document.createElementNS(ns, "path");
  path(p1, "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4");
  const p2 = document.createElementNS(ns, "polyline");
  p2.setAttribute("points", "7 10 12 15 17 10");
  const p3 = document.createElementNS(ns, "line");
  p3.setAttribute("x1", "12");
  p3.setAttribute("y1", "15");
  p3.setAttribute("x2", "12");
  p3.setAttribute("y2", "3");
  svg.appendChild(p1);
  svg.appendChild(p2);
  svg.appendChild(p3);
  return svg;
}

function iconUpload() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const p1 = document.createElementNS(ns, "path");
  path(p1, "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4");
  const p2 = document.createElementNS(ns, "polyline");
  p2.setAttribute("points", "17 8 12 3 7 8");
  const p3 = document.createElementNS(ns, "line");
  p3.setAttribute("x1", "12");
  p3.setAttribute("y1", "3");
  p3.setAttribute("x2", "12");
  p3.setAttribute("y2", "15");
  svg.appendChild(p1);
  svg.appendChild(p2);
  svg.appendChild(p3);
  return svg;
}

function iconLink() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const p1 = document.createElementNS(ns, "path");
  path(p1, "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71");
  const p2 = document.createElementNS(ns, "path");
  path(p2, "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71");
  svg.appendChild(p1);
  svg.appendChild(p2);
  return svg;
}

function path(node, d) {
  node.setAttribute("d", d);
}

function iconTheme(theme) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  if (theme === "light") {
    const sun = document.createElementNS(ns, "circle");
    sun.setAttribute("cx", "12");
    sun.setAttribute("cy", "12");
    sun.setAttribute("r", "4");
    svg.appendChild(sun);
    for (const [x1, y1, x2, y2] of [
      [12, 2, 12, 4],
      [12, 20, 12, 22],
      [2, 12, 4, 12],
      [20, 12, 22, 12],
      [4.93, 4.93, 6.34, 6.34],
      [17.66, 17.66, 19.07, 19.07],
      [4.93, 19.07, 6.34, 17.66],
      [17.66, 6.34, 19.07, 4.93],
    ]) {
      const l = document.createElementNS(ns, "line");
      l.setAttribute("x1", x1);
      l.setAttribute("y1", y1);
      l.setAttribute("x2", x2);
      l.setAttribute("y2", y2);
      svg.appendChild(l);
    }
  } else if (theme === "dark") {
    const p1 = document.createElementNS(ns, "path");
    p1.setAttribute("d", "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z");
    svg.appendChild(p1);
  } else {
    const c1 = document.createElementNS(ns, "circle");
    c1.setAttribute("cx", "12");
    c1.setAttribute("cy", "12");
    c1.setAttribute("r", "8");
    svg.appendChild(c1);
    const arc = document.createElementNS(ns, "path");
    arc.setAttribute("d", "M12 4 a8 8 0 0 0 0 16 z");
    arc.setAttribute("fill", "currentColor");
    arc.setAttribute("stroke", "none");
    svg.appendChild(arc);
  }
  return svg;
}

async function copyText(text, msg = "已复制") {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    toast("复制失败", "error");
  }
}

function downloadImage(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name || url.split("/").pop() || "image";
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function openDetail(item) {
  state.detail = { ...item, _tags: item.tags };
  const tags = splitTags(item.tags);
  const modal = el(
    "div",
    {
      class: "modal",
      onclick: (e) => {
        if (e.target === modal) closeDetail();
      },
    },
    [
      el("div", { class: "modal-card" }, [
        el("div", { class: "modal-head" }, [
          el("div", { class: "modal-title" }, "图片详情"),
          el(
            "button",
            { class: "icon-btn", onclick: closeDetail, title: "关闭" },
            "×",
          ),
        ]),
        el("div", { class: "modal-body" }, [
          el("div", { class: "modal-preview" }, [
            el("img", { src: item.url, alt: item.name || "" }),
          ]),
          el("div", { class: "modal-fields" }, [
            el("label", {}, [
              "URL",
              el("div", { class: "url-row" }, [
                el("input", {
                  type: "text",
                  value: item.url,
                  readonly: "readonly",
                  id: "detail-url",
                }),
                el(
                  "button",
                  {
                    class: "btn btn-small",
                    onclick: () => {
                      navigator.clipboard
                        .writeText(item.url)
                        .then(() => toast("URL 已复制"));
                    },
                  },
                  "复制",
                ),
                el(
                  "a",
                  {
                    class: "btn btn-small btn-ghost",
                    href: item.url,
                    target: "_blank",
                    rel: "noreferrer",
                  },
                  "打开",
                ),
              ]),
            ]),
            el("label", {}, [
              "名称",
              el("input", {
                id: "edit-name",
                type: "text",
                value: item.name || "",
              }),
            ]),
            el("label", {}, ["标签（英文逗号分隔）", buildTagInput(tags)]),
            el("label", {}, [
              "备注",
              el("textarea", { id: "edit-note", rows: "3" }, item.note || ""),
            ]),
            el(
              "div",
              { class: "modal-time" },
              `上传时间: ${fmtTime(item.created_at)}`,
            ),
          ]),
        ]),
        el("div", { class: "modal-foot" }, [
          el(
            "button",
            {
              class: "btn btn-danger",
              onclick: () => onDelete(item.id),
            },
            "删除",
          ),
          el("div", { class: "spacer" }),
          el(
            "button",
            { class: "btn btn-ghost", onclick: closeDetail },
            "取消",
          ),
          el(
            "button",
            {
              class: "btn btn-primary",
              onclick: () => onSave(item.id),
            },
            "保存",
          ),
        ]),
      ]),
    ],
  );
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("show"), 10);
}

function closeDetail() {
  const m = document.querySelector(".modal");
  if (m) {
    m.classList.remove("show");
    setTimeout(() => m.remove(), 200);
  }
  state.detail = null;
}

function buildTagInput(initialTags, { id = "edit-tags" } = {}) {
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

function resetUploadTags() {
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

async function onSave(id) {
  const name = document.querySelector("#edit-name").value.trim();
  const hidden = document.querySelector("#edit-tags");
  const pending = document.querySelector(".modal .tag-input");
  let tags = hidden ? hidden.value : "";
  if (pending && pending.value.trim()) {
    const cur = splitTags(tags);
    cur.push(pending.value.trim());
    tags = cur.join(",");
  }
  tags = tags.trim();
  const note = document.querySelector("#edit-note").value.trim();
  await updateImage(id, { name, tags, note });
  toast("已保存");
  closeDetail();
  await refresh();
}

async function onDelete(id) {
  if (!confirm("确认删除此记录？(不会删除图床上的文件)")) return;
  await deleteImage(id);
  closeDetail();
  await refresh();
  toast("已删除");
}

async function onExport() {
  const data = await exportJSON();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `colorimgs-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`已导出 ${data.images.length} 条`);
}

async function onImport(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const r = await importJSON(data);
    toast(`导入完成: 新增 ${r.added}，合并 ${r.merged}，跳过 ${r.skipped}`);
    await refresh();
  } catch (err) {
    toast(`导入失败: ${err.message}`, "error");
  }
}

async function refresh() {
  const tagFilter = [...state.activeTags].join(",");
  state.offset = 0;
  state.hasMore = false;
  const { rows, total } = await listImages({
    search: state.search,
    tag: tagFilter,
    limit: PAGE_SIZE,
    offset: 0,
  });
  state.items = rows;
  state.total = total;
  state.hasMore = state.items.length < state.total;
  state.allTags = await listAllTags();
  renderTags();
  renderGrid();
}

async function loadMore() {
  if (!state.hasMore) return;
  const nextOffset = state.offset + state.items.length;
  const tagFilter = [...state.activeTags].join(",");
  const { rows } = await listImages({
    search: state.search,
    tag: tagFilter,
    limit: PAGE_SIZE,
    offset: nextOffset,
  });
  state.items = state.items.concat(rows);
  state.offset = 0;
  state.hasMore = state.items.length < state.total;
  appendGrid(rows);
  renderGridSentinel();
}

function bindDropZone() {
  const drop = document.querySelector(".file-drop");
  if (!drop) return;
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("dragging");
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("dragging");
    }),
  );
  drop.addEventListener("drop", (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length) {
      const fields = {
        name: document.querySelector("#up-name").value.trim(),
        tags: document.querySelector("#up-tags").value.trim(),
        note: "",
      };
      handleFiles(files, fields);
      resetUploadTags();
    }
  });
}

const debouncedSearch = debounce(() => refresh(), 250);

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
  renderHeader();
  renderToolbar();
  bindDropZone();
  await refresh();
})();
