import { toast } from "./lib/utils.js";
import { isAdmin } from "./state.js";
import { exportJSON, importJSON } from "./db.js";
import { refresh } from "./refresh.js";

export async function onExport() {
  try {
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
  } catch (err) {
    toast(`导出失败: ${err.message}`, "error");
  }
}

export async function onImport(file) {
  if (!file) return;
  if (!isAdmin()) {
    toast("需要管理员权限", "error");
    return;
  }
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
