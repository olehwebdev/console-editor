import type { SessionTab } from '@common/types';
import type { TabMeta } from '@/entities/editor-tab';

/** What an unsaved response tab will match and answer, as it was remembered. */
export function pending(tab: SessionTab): Pick<TabMeta, 'request' | 'response'> {
  return tab.request && tab.response ? { request: tab.request, response: tab.response } : {};
}
