import type { TabMeta } from '@/entities/editor-tab';
import type { MissContext } from './types';

/** Why a bundle tab's code may differ from what its map describes: the user's edits, or a new build of the file. */
export function editCause(tab: Pick<TabMeta, 'dirty' | 'overrideId'>): NonNullable<MissContext['cause']> {
  return tab.dirty || tab.overrideId ? 'yours' : 'changed';
}
