import type { BreakpointStage } from '../../../shared/types';
import { failHeld } from './failHeld';
import { goOn } from './goOn';
import { respondBeforeSending } from './respondBeforeSending';
import { respondInstead } from './respondInstead';
import { sendEdited } from './sendEdited';
import type { HeldActionAppliers } from './types';

/** What each action does, by the stage the request is held at. */
export const HELD_ACTION_APPLIERS: Record<BreakpointStage, HeldActionAppliers> = {
  request: { continue: goOn, send: sendEdited, respond: respondBeforeSending, fail: failHeld },
  // Sending is refused for a response before it gets here: it was sent already.
  response: { continue: goOn, send: goOn, respond: respondInstead, fail: failHeld },
};
