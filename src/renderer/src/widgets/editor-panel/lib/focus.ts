interface TabsState {
  tabs: ReadonlyArray<{ id: string }>;
  activeId: string | null;
}

/**
 * The tab whose editor should take focus after a tab-store change: one just
 * opened or switched to. Null when the active tab didn't change or was closed
 * (its neighbour takes over without pulling focus off the tab strip).
 */
export function openedTabId(state: TabsState, prev: TabsState): string | null {
  if (!state.activeId || state.activeId === prev.activeId) return null;
  const closed = !!prev.activeId && !state.tabs.some((t) => t.id === prev.activeId);
  return closed ? null : state.activeId;
}
