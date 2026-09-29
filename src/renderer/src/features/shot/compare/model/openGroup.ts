import type { Shot } from '@common/types';
import { hostOf } from '@/shared/lib';
import { useTabStore } from '@/entities/editor-tab';
import { GROUP_PAGE_PREFIX } from './constants';

/** Opens (or switches to) the page comparing the captures taken together with `shot`, in every browser. */
export function openGroup(shot: Pick<Shot, 'group' | 'pageUrl'>): void {
  if (!shot.group) return;
  const title = `Every browser · ${hostOf(shot.pageUrl ?? '') || 'page'}`;
  useTabStore.getState().openPage({ id: `${GROUP_PAGE_PREFIX}${shot.group}`, page: 'group', title, groupId: shot.group });
}
