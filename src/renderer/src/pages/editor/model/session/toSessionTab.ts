import type { SessionTab } from '@common/types';
import type { TabMeta } from '@/entities/editor-tab';

export function toSessionTab(tab: TabMeta): SessionTab {
  return {
    id: tab.id,
    url: tab.url,
    kind: tab.kind,
    ...(tab.overrideId ? { overrideId: tab.overrideId } : {}),
    originalHash: tab.originalHash,
    // A response tab not saved yet keeps what its override will match and answer.
    ...(!tab.overrideId && tab.request && tab.response ? { request: tab.request, response: tab.response } : {}),
  };
}
