import { el } from "../lib/dom.js";
import { toast } from "../lib/utils.js";
import {
  iconDownload,
  iconUpload,
  iconUser,
  iconLogin,
  iconTheme,
} from "../lib/icons.js";
import { state, isAdmin } from "../state.js";
import { THEME_LABEL, applyTheme, nextTheme } from "../theme.js";
import { buildTagInput, resetUploadTags } from "./tagInput.js";
import { handleFiles } from "../upload.js";
import { onImport, onExport } from "../transfer.js";
import { refresh, debouncedSearch } from "../refresh.js";
import { openLoginModal } from "./login.js";
import { toggleUserMenu } from "./users.js";
import { renderTags } from "./tags.js";

export function renderToolbar() {
  const root = document.querySelector("#app");
  root.appendChild(
    el("section", { class: "toolbar" }, [
      state.user ? buildUploadCard() : null,
      el("div", { class: "filter-card" }, [
        el("div", { class: "filter-head" }, [
          el("h2", {}, "筛选"),
          state.user && !isAdmin()
            ? el("div", { class: "scope-switch" }, [
                el(
                  "button",
                  {
                    class: `scope-btn${state.scope === "all" ? " active" : ""}`,
                    onclick: () => {
                      state.scope = "all";
                      renderToolbar();
                      refresh();
                    },
                  },
                  "全部图片",
                ),
                el(
                  "button",
                  {
                    class: `scope-btn${state.scope === "mine" ? " active" : ""}`,
                    onclick: () => {
                      state.scope = "mine";
                      renderToolbar();
                      refresh();
                    },
                  },
                  "我的上传",
                ),
              ])
            : null,
        ]),
        el("div", { class: "filter-search" }, [
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
          el(
            "button",
            {
              class: "btn btn-ghost btn-small",
              title: "清空搜索与标签筛选",
              onclick: () => {
                state.activeTags.clear();
                state.search = "";
                const input = document.querySelector("#search");
                if (input) input.value = "";
                refresh();
              },
            },
            "清空",
          ),
        ]),
        el("div", { class: "tag-list", id: "tag-list" }),
      ]),
    ]),
  );
  root.appendChild(buildFab());
}

function buildUploadCard() {
  return el("div", { class: "upload-card" }, [
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
  ]);
}

function buildFab() {
  const items = [
    el(
      "label",
      {
        class: "fab-btn",
        title: isAdmin() ? "导入 JSON" : "需要管理员权限",
        "aria-label": "导入 JSON",
        style: isAdmin() ? "" : "opacity:.5;cursor:not-allowed;",
      },
      [
        iconDownload(),
        el("input", {
          type: "file",
          accept: "application/json",
          style: "display:none",
          onchange: (e) => {
            if (!isAdmin()) {
              toast("需要管理员权限", "error");
              e.target.value = "";
              return;
            }
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
        title: isAdmin() ? "导出 JSON" : "需要管理员权限",
        "aria-label": "导出 JSON",
        style: isAdmin() ? "" : "opacity:.5;cursor:not-allowed;",
        onclick: () => {
          if (!isAdmin()) {
            toast("需要管理员权限", "error");
            return;
          }
          onExport();
        },
      },
      iconUpload(),
    ),
    state.user
      ? el(
          "button",
          {
            id: "user-fab",
            class: "fab-btn",
            "aria-label": "账号菜单",
            title: `${state.user.username}（账号菜单）`,
            onclick: toggleUserMenu,
          },
          iconUser(),
        )
      : el(
          "button",
          {
            class: "fab-btn",
            "aria-label": "登录",
            title: "登录",
            onclick: openLoginModal,
          },
          iconLogin(),
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
  ];
  return el("div", { class: "fab" }, items.filter(Boolean));
}
