import type { DrivenTab } from '@common/types';
import { matchesWords } from '@/shared/lib';

/** Whether a tab answers the menu's search: every word in its title or address. */
export function matchesTab(tab: Pick<DrivenTab, 'title' | 'url'>, query: string): boolean {
  return matchesWords(`${tab.title} ${tab.url}`, query);
}
