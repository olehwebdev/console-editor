import type { AppEvent } from '@common/types';
import { ACTIONS_WINDOW_EVENT_HANDLERS } from './actionsWindowEventHandlers';
import type { ActionsWindowEventType } from './types';

/** Routes a main-process event into the Actions window's stores; any other is ignored. */
export function handleActionsWindowEvent(event: AppEvent): void {
  if (!Object.hasOwn(ACTIONS_WINDOW_EVENT_HANDLERS, event.type)) return;
  const handle = ACTIONS_WINDOW_EVENT_HANDLERS[event.type as ActionsWindowEventType] as (event: AppEvent) => void;
  handle(event);
}
