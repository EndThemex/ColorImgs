import { debounce } from "./lib/dom.js";
import { listImages, listAllTags } from "./db.js";
import { state, isAdmin } from "./state.js";
import { renderTags } from "./ui/tags.js";
import { renderGrid, renderGridSentinel, appendGrid } from "./ui/grid.js";

export const PAGE_SIZE = 60;

export async function refresh() {
  const tagFilter = [...state.activeTags].join(",");
  state.offset = 0;
  state.hasMore = false;
  const scope = state.user && !isAdmin() ? state.scope : "all";
  const { rows, total } = await listImages({
    search: state.search,
    tag: tagFilter,
    limit: PAGE_SIZE,
    offset: 0,
    scope,
  });
  state.items = rows;
  state.total = total;
  state.hasMore = state.items.length < state.total;
  state.allTags = await listAllTags();
  renderTags();
  renderGrid();
}

export async function loadMore() {
  if (!state.hasMore) return;
  const nextOffset = state.offset + state.items.length;
  const tagFilter = [...state.activeTags].join(",");
  const scope = state.user && !isAdmin() ? state.scope : "all";
  const { rows } = await listImages({
    search: state.search,
    tag: tagFilter,
    limit: PAGE_SIZE,
    offset: nextOffset,
    scope,
  });
  state.items = state.items.concat(rows);
  state.offset = 0;
  state.hasMore = state.items.length < state.total;
  appendGrid(rows);
  renderGridSentinel();
}

export const debouncedSearch = debounce(() => refresh(), 250);
