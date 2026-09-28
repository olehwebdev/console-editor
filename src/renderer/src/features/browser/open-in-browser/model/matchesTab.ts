import type { DrivenTab } from '@common/types';
import { matchesWords } from '@/shared/lib';

/** Whether a driven tab answers the menu's search: every word in its title or address. */
export function matchesTab(tab: DrivenTab, query: string): boolean {
  return matchesWords(`${tab.title} ${tab.url}`, query);
}
