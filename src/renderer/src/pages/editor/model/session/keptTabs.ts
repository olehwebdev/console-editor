import type { TabMeta } from '@/entities/editor-tab';

/** The tabs a session keeps: all but held requests', which last only as long as the request is held. */
export function keptTabs(tabs: readonly TabMeta[]): TabMeta[] {
  return tabs.filter((t) => !t.held);
}
