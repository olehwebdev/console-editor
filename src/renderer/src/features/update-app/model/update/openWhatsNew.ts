import { useTabStore } from '@/entities/editor-tab';
import { WHATS_NEW_TAB } from './constants';

/** Opens (or switches to) the What's New page. */
export function openWhatsNew(): void {
  useTabStore.getState().openPage({ id: WHATS_NEW_TAB, page: 'whats-new', title: "What's New" });
}
