import type { ConsoleLevel, ConsoleValue, ConsoleValueKind } from '../../shared/types';
import type { RemoteObjectType } from './types';

/** How often new rows and frame changes go to the renderer, in ms: ten chatty frames must not flood IPC. */
export const CONSOLE_BATCH_MS = 50;

/** The object group of values from code you ran, released when the console is cleared. */
export const EVAL_OBJECT_GROUP = 'console-editor';

/** Properties listed when a value is expanded; the rest are left out. */
export const MAX_PROPERTIES = 500;

/** Stack frames kept per row. */
export const MAX_STACK_FRAMES = 50;

/** Characters kept of a logged string or description. */
export const MAX_VALUE_TEXT = 10_000;

/** Ends a text or a preview that was cut short. */
export const ELLIPSIS = '…';

/** The `console` methods, as `Runtime.consoleAPICalled` names them. */
export type ConsoleApiType =
  | 'log'
  | 'debug'
  | 'info'
  | 'error'
  | 'warning'
  | 'dir'
  | 'dirxml'
  | 'table'
  | 'trace'
  | 'clear'
  | 'startGroup'
  | 'startGroupCollapsed'
  | 'endGroup'
  | 'assert'
  | 'profile'
  | 'profileEnd'
  | 'count'
  | 'timeEnd';

/** The level of each `console` method's rows. */
export const CONSOLE_API_LEVEL: Readonly<Record<ConsoleApiType, ConsoleLevel>> = {
  log: 'info',
  debug: 'verbose',
  info: 'info',
  error: 'error',
  warning: 'warning',
  dir: 'info',
  dirxml: 'info',
  table: 'info',
  trace: 'info',
  clear: 'verbose',
  startGroup: 'info',
  startGroupCollapsed: 'info',
  endGroup: 'verbose',
  assert: 'error',
  profile: 'verbose',
  profileEnd: 'verbose',
  count: 'info',
  timeEnd: 'info',
};

/** `console` methods whose rows carry the call stack. */
export const STACK_API_TYPES: ReadonlySet<string> = new Set<ConsoleApiType>(['error', 'warning', 'trace', 'assert']);

/** `console` methods that add no row: `endGroup` closes a group, and groups are shown flat. */
export const SKIPPED_API_TYPES: ReadonlySet<string> = new Set<ConsoleApiType>(['endGroup']);

/** How each `RemoteObject.type` is shown. */
export const KIND_BY_TYPE: Readonly<Record<RemoteObjectType, ConsoleValueKind>> = {
  object: 'object',
  function: 'function',
  undefined: 'nullish',
  string: 'string',
  number: 'number',
  bigint: 'number',
  boolean: 'boolean',
  symbol: 'symbol',
};

/** Subtypes shown differently from their type (`null` is an object to JavaScript). */
export const KIND_BY_SUBTYPE: Readonly<Record<string, ConsoleValueKind>> = { null: 'nullish', error: 'error' };

/**
 * Where Electron's own scripts in the page live. What they log isn't the
 * site's: in a build run from source, its security warnings about the app.
 */
export const ELECTRON_SCRIPT_PREFIX = 'node:electron/';

/** Kinds of value whose properties can be listed. */
export const EXPANDABLE_KINDS: ReadonlySet<ConsoleValueKind> = new Set<ConsoleValueKind>(['object', 'error']);

/** A property with a getter: its value is only known by running it, which listing doesn't do. */
export const ACCESSOR_VALUE: ConsoleValue = { kind: 'function', text: '(getter)' };

/** The class name previews leave out: a plain object shows as `{a: 1}`, not `Object {a: 1}`. */
export const PLAIN_OBJECT = 'Object';
