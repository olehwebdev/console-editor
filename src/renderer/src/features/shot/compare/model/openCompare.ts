import type { Shot } from '@common/types';
import { useTabStore } from '@/entities/editor-tab';
import { COMPARE_PAGE_PREFIX } from './constants';

/** Opens (or switches to) the page comparing two shots: `base` below, `other` over it. */
export function openCompare(base: Pick<Shot, 'id' | 'name'>, other: Pick<Shot, 'id' | 'name'>): void {
  useTabStore.getState().openPage({ id: `${COMPARE_PAGE_PREFIX}${base.id}:${other.id}`, page: 'compare', title: `${base.name} ↔ ${other.name}`, baseId: base.id, otherId: other.id });
}
