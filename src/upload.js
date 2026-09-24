import { el } from "./lib/dom.js";
import { toast } from "./lib/utils.js";
import { addImage } from "./db.js";
import { uploadImage } from "./imagebed.js";
import { refresh } from "./refresh.js";
import { resetUploadTags } from "./ui/tagInput.js";

export async function handleUpload(file, fields) {
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

export async function handleFiles(fileList, fields) {
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

export function bindDropZone() {
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
