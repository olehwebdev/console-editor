import type { ConsoleLocation } from '../../shared/types';
import type { CallFrame } from './types';

/** A CDP call frame as a location: its line and column count from 1, as editors show them. */
export function toLocation(frame: CallFrame): ConsoleLocation {
  return { url: frame.url, line: frame.lineNumber + 1, column: frame.columnNumber + 1, functionName: frame.functionName };
}
