import type { SessionTab } from '@common/types';
import type { TabMeta } from '@/entities/editor-tab';

export function toSessionTab(tab: TabMeta): SessionTab {
  return {
    id: tab.id,
    url: tab.url,
    kind: tab.kind,
    ...(tab.overrideId ? { overrideId: tab.overrideId } : {}),
    originalHash: tab.originalHash,
  };
}
