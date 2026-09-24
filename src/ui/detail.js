import { el } from "../lib/dom.js";
import { toast, fmtTime } from "../lib/utils.js";
import { state, canEdit } from "../state.js";
import { splitTags, updateImage, deleteImage } from "../db.js";
import { closeAll } from "./modal.js";
import { refresh } from "../refresh.js";
import { buildTagInput } from "./tagInput.js";

export function openDetail(item) {
  state.detail = { ...item, _tags: item.tags };
  const tags = splitTags(item.tags);
  const editable = canEdit(item);
  const modal = el(
    "div",
    {
      class: "modal",
      onclick: (e) => {
        if (e.target === modal) closeAll();
      },
    },
    [
      el("div", { class: "modal-card" }, [
        el("div", { class: "modal-head" }, [
          el("div", { class: "modal-title" }, "图片详情"),
          el(
            "button",
            { class: "icon-btn", onclick: closeAll, title: "关闭" },
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
                readonly: editable ? false : "readonly",
              }),
            ]),
            editable
              ? el("label", {}, ["标签（英文逗号分隔）", buildTagInput(tags)])
              : el("label", {}, [
                  "标签",
                  el(
                    "div",
                    { class: "meta-tags readonly" },
                    tags.map((t) => el("span", { class: "meta-tag" }, t)),
                  ),
                ]),
            el("label", {}, [
              "备注",
              el(
                "textarea",
                {
                  id: "edit-note",
                  rows: "3",
                  readonly: editable ? false : "readonly",
                },
                item.note || "",
              ),
            ]),
            el(
              "div",
              { class: "modal-time" },
              `上传时间: ${fmtTime(item.created_at)}${editable ? "" : "  只读"}`,
            ),
          ]),
        ]),
        el("div", { class: "modal-foot" }, [
          editable
            ? el(
                "button",
                {
                  class: "btn btn-danger",
                  onclick: () => onDelete(item.id),
                },
                "删除",
              )
            : null,
          el("div", { class: "spacer" }),
          el("button", { class: "btn btn-ghost", onclick: closeAll }, "关闭"),
          editable
            ? el(
                "button",
                {
                  class: "btn btn-primary",
                  onclick: () => onSave(item.id),
                },
                "保存",
              )
            : null,
        ]),
      ]),
    ],
  );
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("show"), 10);
}

async function onSave(id) {
  if (!state.user) {
    toast("请先登录", "error");
    return;
  }
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
  try {
    await updateImage(id, { name, tags, note });
    toast("已保存");
    closeAll();
    await refresh();
  } catch (err) {
    toast(`保存失败: ${err.message}`, "error");
  }
}

async function onDelete(id) {
  if (!state.user) {
    toast("请先登录", "error");
    return;
  }
  if (!confirm("确认删除此记录？(不会删除图床上的文件)")) return;
  try {
    await deleteImage(id);
    closeAll();
    await refresh();
    toast("已删除");
  } catch (err) {
    toast(`删除失败: ${err.message}`, "error");
  }
}
