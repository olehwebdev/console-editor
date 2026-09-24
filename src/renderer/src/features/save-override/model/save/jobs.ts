import type { SaveJob } from './types';

/** Each tab's save in progress, by tab id. Mutated in place. */
export const jobs = new Map<string, SaveJob>();
