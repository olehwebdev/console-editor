import type { PAGE_WINDOW_EVENTS } from '@common/constants';
import type { AppEventOf } from '../bridge/types';

/** The events the website window acts on: the rest are the editor's. */
export type PageWindowEventType = 'page-state' | 'command' | (typeof PAGE_WINDOW_EVENTS)[number];

/** One handler per event the website window acts on, given its own member. */
export type PageWindowEventHandlers = { [T in PageWindowEventType]: (event: AppEventOf<T>) => void };
