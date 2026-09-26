import { JSON_EVENTS } from '../constants';
import type { AppEvent, WireEvent } from '../types';

const AS_JSON: ReadonlySet<AppEvent['type']> = new Set(JSON_EVENTS);

/** An event as it is sent to a window: one of `JSON_EVENTS` as its JSON, the others as they are. */
export function encodeEvent(event: AppEvent): WireEvent {
  return AS_JSON.has(event.type) ? JSON.stringify(event) : event;
}
