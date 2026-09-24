import { el } from "../lib/dom.js";
import { toast } from "../lib/utils.js";
import { state, isAdmin } from "../state.js";
import { listUsers, createUser, updateUser, deleteUser } from "../db.js";
import { closeAll } from "./modal.js";

export async function openUsersModal() {
  if (!isAdmin()) return;
  let list;
  const modal = el(
    "div",
    {
      class: "modal",
      onclick: (e) => {
        if (e.target === modal) closeAll();
      },
    },
    [
      el("div", { class: "modal-card users-card" }, [
        el("div", { class: "modal-head" }, [
          el("div", { class: "modal-title" }, "用户管理"),
          el("button", { class: "icon-btn", onclick: closeAll }, "×"),
        ]),
        el("div", { class: "users-body" }, [
          el("div", { class: "users-add" }, [
            el("h3", {}, "添加用户"),
            buildAddUserForm(),
          ]),
          el("div", { class: "users-list-wrap" }, [
            el("h3", {}, "用户列表"),
            (list = el("div", { class: "users-list" })),
          ]),
        ]),
      ]),
    ],
  );
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("show"), 10);
  await renderUsersList(list);
}

function buildAddUserForm() {
  let usernameInput, passwordInput, roleSelect;
  const wrap = el("div", { class: "users-add-fields" }, [
    el("label", {}, [
      "用户名",
      (usernameInput = el("input", {
        type: "text",
        autocomplete: "off",
      })),
    ]),
    el("label", {}, [
      "初始密码",
      (passwordInput = el("input", {
        type: "text",
        autocomplete: "off",
      })),
    ]),
    el("label", {}, [
      "角色",
      (roleSelect = el(
        "select",
        {},
        el("option", { value: "user" }, "普通用户"),
        el("option", { value: "admin" }, "管理员"),
      )),
    ]),
  ]);
  const btn = el(
    "button",
    {
      class: "btn btn-primary",
      onclick: async () => {
        try {
          await createUser({
            username: usernameInput.value.trim(),
            password: passwordInput.value,
            role: roleSelect.value,
          });
          usernameInput.value = "";
          passwordInput.value = "";
          toast("已添加");
          const list = document.querySelector(".users-list");
          if (list) await renderUsersList(list);
        } catch (err) {
          toast(`失败: ${err.message}`, "error");
        }
      },
    },
    "添加",
  );
  return el("div", {}, [wrap, btn]);
}

async function renderUsersList(host) {
  if (!host) return;
  host.innerHTML = "";
  let users = [];
  try {
    users = await listUsers();
  } catch (err) {
    host.appendChild(
      el("div", { class: "tag-empty" }, `加载失败: ${err.message}`),
    );
    return;
  }
  for (const u of users) {
    const isSelf = state.user && state.user.id === u.id;
    host.appendChild(
      el("div", { class: "users-row" }, [
        el("div", { class: "users-row-name" }, [
          el("span", {}, u.username),
          isSelf ? el("span", { class: "users-row-self" }, "你") : null,
        ]),
        el(
          "div",
          { class: "users-row-role" },
          el(
            "select",
            {
              disabled: isSelf ? "disabled" : false,
              onchange: async (e) => {
                try {
                  await updateUser(u.id, { role: e.target.value });
                  toast("已更新角色");
                } catch (err) {
                  e.target.value = u.role;
                  toast(`失败: ${err.message}`, "error");
                }
              },
            },
            el(
              "option",
              { value: "user", selected: u.role === "user" },
              "普通用户",
            ),
            el(
              "option",
              { value: "admin", selected: u.role === "admin" },
              "管理员",
            ),
          ),
        ),
        el(
          "button",
          {
            class: "btn btn-small",
            onclick: async () => {
              const np = prompt(`为 ${u.username} 设置新密码（至少 4 位）`);
              if (!np) return;
              try {
                await updateUser(u.id, { password: np });
                toast("密码已更新");
              } catch (err) {
                toast(`失败: ${err.message}`, "error");
              }
            },
          },
          "重置密码",
        ),
        el(
          "button",
          {
            class: "btn btn-small btn-danger",
            disabled: isSelf ? "disabled" : false,
            onclick: async () => {
              if (isSelf) return;
              if (
                !confirm(
                  `确认删除用户 ${u.username}？该用户的图片会保留但解除关联。`,
                )
              )
                return;
              try {
                await deleteUser(u.id);
                toast("已删除");
                await renderUsersList(host);
              } catch (err) {
                toast(`失败: ${err.message}`, "error");
              }
            },
          },
          "删除",
        ),
      ]),
    );
  }
}
