import type { LogRowKind } from './types';

/** Commits the log draws, the newest; older ones stay kept until cleared. */
export const MAX_SHOWN = 200;
/** Digits a commit's render time is shown with (ms). */
export const DURATION_DIGITS = 1;
/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
export const NO_NAMES: Readonly<Record<string, string>> = {};
/** The components the By component view lists, those that took the most time or rendered most. */
export const MAX_PROFILES = 300;
/** The Renders log's two views: its commits, newest first, and the recorded renders by component (the profiler's). */
export const RENDERS_VIEWS = [
  { id: 'commits', label: 'Commits' },
  { id: 'components', label: 'By component' },
] as const;
export type RendersView = (typeof RENDERS_VIEWS)[number]['id'];
/** The By component view's columns: component, renders, mounts, skipped, time, why, code. */
export const PROFILE_GRID = 'grid grid-cols-[minmax(120px,1.2fr)_56px_56px_56px_72px_minmax(0,1fr)_auto] items-center gap-x-3';
/** How tall each row of the Renders log is (px): a commit's heading, one of its components, the count of those not listed. */
export const LOG_ROW_HEIGHT: Record<LogRowKind, number> = { heading: 32, component: 24, more: 22 };
/** Rows drawn beyond those in view, so scrolling doesn't show gaps. */
export const LOG_OVERSCAN = 10;
