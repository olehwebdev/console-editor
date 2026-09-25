import { STORE_LIBRARIES, type StoreAction } from '../../../../shared/types';
import { cleanText } from '../../reading/cleanText';
import { itemsOf } from '../../renders/toRenderCommits/itemsOf';
import { timeOf } from '../../renders/toRenderCommits/timeOf';
import { MAX_ACTION_BATCH } from '../constants';
import { toStackFrames } from './toStackFrames';
import { toStoreChanges } from './toStoreChanges';

/** An action as the page summed it up, checked; main numbers it and tells its frame. */
export type PageAction = Omit<StoreAction, 'id' | 'frameId'>;

/** The page's batch of store actions (the binding's payload, JSON), checked like any input from the page. */
export function toStoreActions(payload: string): PageAction[] {
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    return [];
  }
  return itemsOf(raw, MAX_ACTION_BATCH).flatMap((action) => {
    const library = STORE_LIBRARIES.find((l) => l === action.library);
    const store = cleanText(action.store);
    const type = cleanText(action.type);
    if (!library || !store || !type) return [];
    return [
      {
        at: timeOf(action.at) ?? Date.now(),
        store,
        library,
        type,
        payload: typeof action.payload === 'string' ? cleanText(action.payload) : null,
        changes: toStoreChanges(action.changes),
        duration: timeOf(action.duration),
        stack: toStackFrames(action.stack),
      },
    ];
  });
}
