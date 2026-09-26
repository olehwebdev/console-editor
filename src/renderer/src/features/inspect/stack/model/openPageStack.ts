import { useTabStore } from '@/entities/editor-tab';
import { PAGE_STACK_TAB } from './constants';

/** Opens (or switches to) the Page stack: what each frame of the page runs. */
export function openPageStack(): void {
  useTabStore.getState().openPage({ id: PAGE_STACK_TAB, page: 'stack', title: 'Page stack' });
}
