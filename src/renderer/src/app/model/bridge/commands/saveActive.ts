import { selectActivePage, useTabStore } from '@/entities/editor-tab';
import { ACTIVE_SAVERS } from './activeSavers';

/** Saves what is in front: the active page when a page is, else the active file tab. */
export function saveActive(): void {
  const page = selectActivePage(useTabStore.getState());
  if (page) ACTIVE_SAVERS[page.page](page.id);
  else ACTIVE_SAVERS.file(useTabStore.getState().activeId ?? '');
}
