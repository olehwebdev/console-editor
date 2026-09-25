import type { TabMeta } from '@/entities/editor-tab';

/** A file tab's tooltip: its URL, and whether it is held at a breakpoint or not saved yet. */
export function fileTabTitle(tab: TabMeta): string {
  if (tab.held) return `${tab.url}\nHeld at a breakpoint: waiting for Send`;
  return `${tab.url}${tab.overrideId ? '' : '\nNot saved as an override yet'}`;
}
