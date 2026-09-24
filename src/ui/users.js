import { el } from "../lib/dom.js";
import { iconUser } from "../lib/icons.js";
import { state, isAdmin } from "../state.js";
import { openUsersModal } from "./usersModal.js";
import { openPasswordModal } from "./password.js";
import { onLogout } from "./login.js";

export function closeUserMenu() {
  document.querySelector("#user-menu")?.remove();
}

export function toggleUserMenu() {
  const existing = document.querySelector("#user-menu");
  if (existing) {
    existing.remove();
    return;
  }
  const menu = el("div", { id: "user-menu", class: "user-menu" }, [
    el("div", { class: "user-menu-head" }, [
      el("span", { class: "user-name" }, state.user.username),
      el(
        "span",
        { class: `user-role role-${state.user.role}` },
        state.user.role === "admin" ? "管理员" : "用户",
      ),
    ]),
    isAdmin()
      ? el(
          "button",
          {
            class: "btn btn-small btn-ghost",
            onclick: () => {
              closeUserMenu();
              openUsersModal();
            },
          },
          "用户管理",
        )
      : null,
    el(
      "button",
      {
        class: "btn btn-small btn-ghost",
        onclick: () => {
          closeUserMenu();
          openPasswordModal();
        },
      },
      "修改密码",
    ),
    el(
      "button",
      {
        class: "btn btn-small",
        onclick: () => {
          closeUserMenu();
          onLogout();
        },
      },
      "退出登录",
    ),
  ]);
  const fab = document.querySelector("#user-fab");
  if (fab) {
    const r = fab.getBoundingClientRect();
    menu.style.right = `${window.innerWidth - r.right}px`;
    menu.style.bottom = `${window.innerHeight - r.top + 8}px`;
  }
  document.body.appendChild(menu);
}
