import { usePageStore } from '@/entities/page';
import { pageCommands } from '../commands/pageCommands';
import type { AppEventOf } from '../types';

/** Mirrors the page's state. A website back from its own window shows in the editor's preview again, even one hidden before it left. */
export function applyPageState(event: AppEventOf<'page-state'>): void {
  const { page, setPage } = usePageStore.getState();
  const returned = page.detached && !event.state.detached;
  setPage(event.state);
  if (returned) pageCommands.current?.showPreview();
}
