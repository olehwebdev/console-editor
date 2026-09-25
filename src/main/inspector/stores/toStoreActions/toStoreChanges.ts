import type { StoreChange } from '../../../../shared/types';
import { cleanText } from '../../reading/cleanText';
import { itemsOf } from '../../renders/toRenderCommits/itemsOf';
import { MAX_STORE_CHANGES } from '../constants';

/** The state's values an action changed, as the page previewed them, checked. */
export function toStoreChanges(raw: unknown): StoreChange[] {
  return itemsOf(raw, MAX_STORE_CHANGES).flatMap((change) =>
    typeof change.path === 'string' && change.path ? [{ path: cleanText(change.path), from: cleanText(change.from), to: cleanText(change.to) }] : [],
  );
}
