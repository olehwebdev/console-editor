import type { HeldAction, HeldActionType } from '../types';
import { HELD_ACTION_CHECKS } from './heldActionChecks';

/** What is wrong with an action for a held request, or null; checked in the main process as it arrives. */
export function validateHeldAction(action: HeldAction): string | null {
  if (!action || typeof action !== 'object' || !Object.hasOwn(HELD_ACTION_CHECKS, action.type)) return 'Unknown action';
  const check = HELD_ACTION_CHECKS[action.type as HeldActionType] as (a: HeldAction) => string | null;
  return check(action);
}
