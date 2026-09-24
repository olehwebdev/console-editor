import type { monaco } from '@/shared/monaco';
import { entries } from './entries';

export function getTabModel(tabId: string | null | undefined): monaco.editor.ITextModel | null {
  return (tabId && entries.get(tabId)?.model) || null;
}
