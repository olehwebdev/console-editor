import type { AppEventOf } from '../bridge/types';

/** The events the website window acts on: the rest are the editor's. */
export type PageWindowEventType = 'page-state' | 'command';

/** One handler per event the website window acts on, given its own member. */
export type PageWindowEventHandlers = { [T in PageWindowEventType]: (event: AppEventOf<T>) => void };
