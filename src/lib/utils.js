import { el } from "./dom.js";

export function fmtTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function toast(msg, kind = "info") {
  const t = el("div", { class: `toast toast-${kind}` }, msg);
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

export async function copyText(text, msg = "已复制") {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    toast("复制失败", "error");
  }
}

export function downloadImage(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name || url.split("/").pop() || "image";
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
