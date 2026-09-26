import type { AppEvent, WireEvent } from '../types';

/** An event a window received: parsed back when it came as JSON (`encodeEvent`). */
export function decodeEvent(payload: WireEvent): AppEvent {
  return typeof payload === 'string' ? (JSON.parse(payload) as AppEvent) : payload;
}
