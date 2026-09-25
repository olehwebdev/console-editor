import type { TabMeta } from '@/entities/editor-tab';
import { keptTabs } from './keptTabs';
import { sessionSync } from './sessionSync';

/** The active file tab, or the one in front before a page (What's New) or a held request's tab was: neither is restored. */
export function activeFileId(s: { tabs: TabMeta[]; activeId: string | null }): string | null {
  const tabs = keptTabs(s.tabs);
  if (tabs.some((t) => t.id === s.activeId)) sessionSync.activeFile = s.activeId;
  else if (!tabs.some((t) => t.id === sessionSync.activeFile)) sessionSync.activeFile = null;
  return sessionSync.activeFile;
}
