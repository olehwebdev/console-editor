import { MAX_TITLE } from './constants';
import { sanitizeTabs } from './sanitizeTabs';
import type { WorkspaceRecord } from './types';

/** A page with its tabs, as saved (a version 1 session file has the same fields at its top level). */
export function sanitizePage(input: Partial<WorkspaceRecord>): Pick<WorkspaceRecord, 'url' | 'title' | 'tabs' | 'activeTabId'> {
  const tabs = sanitizeTabs(input.tabs);
  return {
    url: typeof input.url === 'string' ? input.url : '',
    title: typeof input.title === 'string' ? input.title.slice(0, MAX_TITLE) : '',
    tabs,
    activeTabId: tabs.some((t) => t.id === input.activeTabId) ? (input.activeTabId as string) : null,
  };
}
