import { el } from "../lib/dom.js";
import { toast } from "../lib/utils.js";
import { changePassword } from "../db.js";
import { closeAll } from "./modal.js";
import { onLogout } from "./login.js";

export function openPasswordModal() {
  let oldInput, newInput;
  const modal = el(
    "div",
    {
      class: "modal",
      onclick: (e) => {
        if (e.target === modal) closeAll();
      },
    },
    [
      el("div", { class: "modal-card login-card" }, [
        el("div", { class: "modal-head" }, [
          el("div", { class: "modal-title" }, "修改密码"),
          el("button", { class: "icon-btn", onclick: closeAll }, "×"),
        ]),
        el("div", { class: "login-body" }, [
          el("label", {}, [
            "原密码",
            (oldInput = el("input", {
              type: "password",
              autocomplete: "current-password",
            })),
          ]),
          el("label", {}, [
            "新密码（至少 4 位）",
            (newInput = el("input", {
              type: "password",
              autocomplete: "new-password",
            })),
          ]),
        ]),
        el("div", { class: "modal-foot" }, [
          el("div", { class: "spacer" }),
          el("button", { class: "btn btn-ghost", onclick: closeAll }, "取消"),
          el(
            "button",
            {
              class: "btn btn-primary",
              onclick: async () => {
                try {
                  await changePassword(oldInput.value, newInput.value);
                  toast("密码已更新，请重新登录");
                  closeAll();
                  await onLogout();
                } catch (err) {
                  toast(`失败: ${err.message}`, "error");
                }
              },
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
