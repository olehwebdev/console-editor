import type { AppEvent } from '@common/types';

export type AppEventType = AppEvent['type'];

/** The member of AppEvent whose `type` is `T`. */
export type AppEventOf<T extends AppEventType> = Extract<AppEvent, { type: T }>;

/** One handler per event type, given its own member: a new AppEvent fails typecheck until it has one. */
export type AppEventHandlers = { [T in AppEventType]: (event: AppEventOf<T>) => void };
