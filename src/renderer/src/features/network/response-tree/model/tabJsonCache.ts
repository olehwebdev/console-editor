import type { TabJson } from './types';

/** Each tab model's text read as JSON, with the model version it was read at: read again only after an edit. */
export const tabJsonCache = new WeakMap<object, { version: number; json: TabJson }>();
