import { useTabStore } from '@/entities/editor-tab';
import type { ResponseRuleValue } from './types';

/** Keeps an unsaved response tab's rule: saving the tab creates its override with it. */
export function setPendingRule(tabId: string, { request, response }: ResponseRuleValue): void {
  useTabStore.getState().patch(tabId, { request, response });
}
