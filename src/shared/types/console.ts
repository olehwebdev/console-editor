/** How serious a console row is, least first (the levels DevTools filters by). */
export const CONSOLE_LEVELS = ['verbose', 'info', 'warning', 'error'] as const;

export type ConsoleLevel = (typeof CONSOLE_LEVELS)[number];

/**
 * Where a console row came from: the page's `console` calls, an uncaught error or
 * rejection, the browser itself (a failed request, a CSP violation), a frame
 * loading a new document, or code you ran (`input`) and what it gave back (`result`).
 */
export type ConsoleSource = 'console' | 'exception' | 'browser' | 'navigation' | 'input' | 'result';

/** What a logged value is, for how it is shown. */
export type ConsoleValueKind = 'string' | 'number' | 'boolean' | 'nullish' | 'symbol' | 'function' | 'object' | 'error';

/** A logged value as the console shows it: its text, and a handle when it has properties to expand. */
export interface ConsoleValue {
  kind: ConsoleValueKind;
  /** The string itself, a number, or a preview such as `{sku: 42}`, `[1, 2, 3]` or an error with its stack. */
  text: string;
  /** Pass to `getConsoleProperties` to list its properties. */
  handle?: number;
}

export interface ConsoleProperty {
  name: string;
  value: ConsoleValue;
}

/** A place in a script; line and column count from 1. */
export interface ConsoleLocation {
  url: string;
  line: number;
  column: number;
  /** '' for top-level code. */
  functionName: string;
}

export interface ConsoleEntry {
  /** Grows with every entry, across frames: the order they arrived in. */
  id: number;
  /** The frame it came from (a `ConsoleFrame.id`); null when it can't be told. */
  frameId: string | null;
  level: ConsoleLevel;
  source: ConsoleSource;
  /** Milliseconds since the epoch. */
  time: number;
  values: ConsoleValue[];
  /** Where it was logged or thrown, when known. */
  location?: ConsoleLocation;
  /** The call stack, innermost first: for errors, warnings, `console.trace` and `console.assert`. */
  stack?: ConsoleLocation[];
}

/** A frame of the page: the top page (no `parentId`) or an iframe, however deeply nested. */
export interface ConsoleFrame {
  /** Chromium's frame id: it stays the same when the frame moves to another process. */
  id: string;
  parentId?: string;
  /** Its document's URL ('' before it has one). */
  url: string;
  /** The iframe's `name` attribute ('' if none). */
  name: string;
  /** Code can run in it: it has a JavaScript context (a sandbox without `allow-scripts` has none). */
  canRun: boolean;
}
