import { useTabStore } from '@/entities/editor-tab';
import { ruleForms } from './ruleForms';

/** Forgets the forms of rule pages no longer open: closed, or gone with their workspace or rule. */
export function dropClosedRuleForms(): void {
  const open = new Set(useTabStore.getState().pages.map((page) => page.id));
  for (const [pageId, entry] of ruleForms) {
    if (open.has(pageId)) continue;
    entry.stop();
    ruleForms.delete(pageId);
  }
}
