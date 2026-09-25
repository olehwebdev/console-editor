import type { ACTIONS_WINDOW_EVENTS } from '@common/constants';
import type { AppEventOf } from '../bridge/types';

/** The events the Actions window is sent (the main process forwards it only these). */
export type ActionsWindowEventType = (typeof ACTIONS_WINDOW_EVENTS)[number];

/** One handler per event the Actions window is sent, given its own member: one added to the list fails typecheck until handled. */
export type ActionsWindowEventHandlers = { [T in ActionsWindowEventType]: (event: AppEventOf<T>) => void };
