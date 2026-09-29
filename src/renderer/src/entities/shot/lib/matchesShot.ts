import type { Shot } from '@common/types';
import { matchesWords } from '@/shared/lib';

/** Whether a shot answers a search: every word in its name, page address or browser. */
export function matchesShot(shot: Shot, query: string): boolean {
  return matchesWords(`${shot.name} ${shot.pageUrl ?? ''} ${shot.browser?.name ?? ''} ${shot.kind}`, query);
}
