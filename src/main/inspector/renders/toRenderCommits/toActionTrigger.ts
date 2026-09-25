import type { ActionTrigger } from '../../../../shared/types';
import { MAX_TEXT_LENGTH } from '../../constants';
import { cleanText } from '../../reading/cleanText';
import type { Item } from './types';

/** The store action a commit names as what led to it, checked; null when it names none. */
export function toActionTrigger(raw: unknown): ActionTrigger | null {
  const action = raw && typeof raw === 'object' ? (raw as Item) : null;
  if (!action || typeof action.store !== 'string' || typeof action.type !== 'string' || !action.type) return null;
  return { store: cleanText(action.store).slice(0, MAX_TEXT_LENGTH), type: cleanText(action.type).slice(0, MAX_TEXT_LENGTH) };
}
