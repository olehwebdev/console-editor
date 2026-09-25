import { isPageDirty, useTabStore } from '@/entities/editor-tab';
import { flushSession } from './flushSession';

/**
 * Writes everything pending before the window closes. Resolves false if something could not be
 * written, or a rule page holds unapplied edits: those aren't kept on disk, so closing asks first.
 */
export async function flushOnClose(): Promise<boolean> {
  const flushed = await flushSession();
  return flushed && !useTabStore.getState().pages.some(isPageDirty);
}
