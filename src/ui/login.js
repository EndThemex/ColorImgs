import { el } from "../lib/dom.js";
import { toast } from "../lib/utils.js";
import { state } from "../state.js";
import { login as apiLogin, logout as apiLogout } from "../db.js";
import { closeAll } from "./modal.js";
import { closeUserMenu } from "./users.js";
import { renderApp } from "./app.js";
import { refresh } from "../refresh.js";

export function openLoginModal() {
  if (document.querySelector(".modal.login-modal")) return;
  let usernameInput, passwordInput;
  const modal = el(
    "div",
    {
      class: "modal login-modal",
      onclick: (e) => {
        if (e.target === modal) closeAll();
      },
    },
    [
      el("div", { class: "modal-card login-card" }, [
        el("div", { class: "modal-head" }, [
          el("div", { class: "modal-title" }, "登录"),
          el(
            "button",
            { class: "icon-btn", onclick: closeAll, title: "关闭" },
            "×",
          ),
        ]),
        el("div", { class: "login-body" }, [
          el(
            "p",
            { class: "login-hint" },
            "系统不支持注册，请联系管理员开通账号。",
          ),
          el("label", {}, [
            "用户名",
            (usernameInput = el("input", {
              type: "text",
              id: "login-username",
              autocomplete: "username",
            })),
          ]),
          el("label", {}, [
            "密码",
            (passwordInput = el("input", {
              type: "password",
              id: "login-password",
              autocomplete: "current-password",
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
              onclick: () =>
                doLogin(usernameInput.value.trim(), passwordInput.value),
            },
            "登录",
          ),
        ]),
      ]),
    ],
  );
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("show"), 10);
  setTimeout(() => usernameInput.focus(), 50);
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter")
      doLogin(usernameInput.value.trim(), passwordInput.value);
  });
}

export async function doLogin(username, password) {
  if (!username || !password) {
    toast("请输入用户名和密码", "error");
    return;
  }
  try {
    const res = await apiLogin(username, password);
    state.user = res.user;
    state.scope = "all";
    closeAll();
    closeUserMenu();
    toast(`欢迎, ${res.user.username}`);
    renderApp();
    refresh();
  } catch (err) {
    toast(`登录失败: ${err.message}`, "error");
  }
}

export async function onLogout() {
  try {
    await apiLogout();
  } catch {}
  state.user = null;
  state.scope = "all";
  toast("已退出登录");
  renderApp();
  refresh();
}
