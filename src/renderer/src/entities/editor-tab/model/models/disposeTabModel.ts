import { setModelSchema } from '@/shared/monaco';
import { entries } from './entries';

export function disposeTabModel(tabId: string): void {
  const entry = entries.get(tabId);
  if (!entry) return;
  entries.delete(tabId);
  entry.disposeListener?.dispose();
  // A response tab's schema goes with it.
  if (entry.schemaUri) setModelSchema(entry.schemaUri, undefined);
  entry.model.dispose();
}
