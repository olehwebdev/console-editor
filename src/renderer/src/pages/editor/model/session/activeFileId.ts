import type { TabMeta } from '@/entities/editor-tab';
import { sessionSync } from './sessionSync';

/** The active file tab, or the one in front before a page (What's New) was: pages aren't restored. */
export function activeFileId(s: { tabs: TabMeta[]; activeId: string | null }): string | null {
  if (s.tabs.some((t) => t.id === s.activeId)) sessionSync.activeFile = s.activeId;
  else if (!s.tabs.some((t) => t.id === sessionSync.activeFile)) sessionSync.activeFile = null;
  return sessionSync.activeFile;
}
