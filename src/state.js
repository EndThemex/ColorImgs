export const state = {
  user: null,
  scope: "all", // all | mine (普通用户可切 mine 看到自己上传的)
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

export function isAdmin() {
  return state.user?.role === "admin";
}

export function canEdit(it) {
  if (!state.user) return false;
  if (isAdmin()) return true;
  return it.owner_id === state.user.id;
}
