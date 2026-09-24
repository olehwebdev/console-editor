import { useTabStore } from '@/entities/editor-tab';
import { diffRequest } from './diffRequest';

export function isCurrent(request: number, tabId: string): boolean {
  const { activeId, tabs } = useTabStore.getState();
  return request === diffRequest.generation && activeId === tabId && tabs.some((t) => t.id === tabId);
}
