import { APP_EVENT_HANDLERS } from './appEventHandlers';
import type { AppEventOf, AppEventType } from './types';

/** Routes one main-process event into the entity stores. Generic so each event reaches its own handler without a cast. */
export function handleAppEvent<T extends AppEventType>(event: AppEventOf<T>): void {
  // A type this build doesn't know (main and renderer out of step, e.g. mid dev reload) is ignored, not thrown on.
  if (!Object.hasOwn(APP_EVENT_HANDLERS, event.type)) return;
  APP_EVENT_HANDLERS[event.type](event);
}
