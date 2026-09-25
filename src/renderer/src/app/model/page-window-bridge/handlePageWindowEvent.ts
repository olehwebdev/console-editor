import type { AppEvent } from '@common/types';
import { PAGE_WINDOW_EVENT_HANDLERS } from './pageWindowEventHandlers';
import type { PageWindowEventType } from './types';

/** Routes a main-process event into the website window's stores; the editor's events are ignored. */
export function handlePageWindowEvent(event: AppEvent): void {
  if (!Object.hasOwn(PAGE_WINDOW_EVENT_HANDLERS, event.type)) return;
  const handle = PAGE_WINDOW_EVENT_HANDLERS[event.type as PageWindowEventType] as (event: AppEvent) => void;
  handle(event);
}
