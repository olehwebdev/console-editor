import type { ConsoleLevel, ConsoleSource } from '@common/types';

/** DevTools' default levels: everything but verbose. */
export const DEFAULT_LEVELS: Record<ConsoleLevel, boolean> = { verbose: false, info: true, warning: true, error: true };

/** Rows the level filter applies to; code you ran, its results and page loads always show. */
export const LEVEL_FILTERED_SOURCES: ReadonlySet<ConsoleSource> = new Set<ConsoleSource>(['console', 'exception', 'browser']);
