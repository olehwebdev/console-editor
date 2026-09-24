interface SessionSync {
  syncing: boolean;
  tabsTimer: ReturnType<typeof setTimeout> | undefined;
  draftTimers: Map<string, ReturnType<typeof setTimeout>>;
  /** Tabs with a draft on disk. */
  drafted: Set<string>;
  /** Tabs whose draft base (for tabs not yet saved as overrides) is on disk. */
  baseWritten: Set<string>;
  /** Writes in flight, so closing can wait for them. */
  writes: Set<Promise<unknown>>;
  /** Tabs whose last draft write failed, and whether the last tab-list write did: retried on close. */
  failedDrafts: Set<string>;
  tabsFailed: boolean;
  /** What `activeFileId` last returned. */
  activeFile: string | null;
}

/**
 * What the session's writes remember between calls. Mutated in place
 * (importers can't reassign another module's bindings).
 */
export const sessionSync: SessionSync = {
  syncing: false,
  tabsTimer: undefined,
  draftTimers: new Map(),
  drafted: new Set(),
  baseWritten: new Set(),
  writes: new Set(),
  failedDrafts: new Set(),
  tabsFailed: false,
  activeFile: null,
};
