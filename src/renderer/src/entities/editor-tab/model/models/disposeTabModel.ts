import { entries } from './entries';

export function disposeTabModel(tabId: string): void {
  const entry = entries.get(tabId);
  if (!entry) return;
  entries.delete(tabId);
  entry.disposeListener?.dispose();
  entry.model.dispose();
}
