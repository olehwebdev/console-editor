import type { ConsoleStore } from './types';

/** How many rows are errors. */
export const selectErrorCount = (s: ConsoleStore) => s.entries.reduce((n, e) => (e.level === 'error' ? n + 1 : n), 0);
