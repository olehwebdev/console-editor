import type { Shot } from '@common/types';
import { useTabStore } from '@/entities/editor-tab';
import { SHOT_PAGE_PREFIX } from './constants';

/** Opens (or switches to) a capture's or design's page. */
export function openShot(shot: Pick<Shot, 'id' | 'name'>): void {
  useTabStore.getState().openPage({ id: `${SHOT_PAGE_PREFIX}${shot.id}`, page: 'shot', title: shot.name, shotId: shot.id });
}
