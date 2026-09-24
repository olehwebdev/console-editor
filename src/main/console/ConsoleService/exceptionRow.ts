import { kindOf } from '../kindOf';
import { stackOf } from '../stackOf';
import { toLocation } from '../toLocation';
import type { ExceptionDetails } from '../types';
import type { RowDraft, ValueOf } from './types';

/** The row of an uncaught error or rejection, or of code you ran that threw. */
export function exceptionRow(
  frameId: string | null,
  source: 'exception' | 'result',
  details: ExceptionDetails,
  value: ValueOf,
  time?: number,
): RowDraft {
  const top = details.stackTrace?.callFrames[0];
  const location = details.url
    ? { url: details.url, line: details.lineNumber + 1, column: details.columnNumber + 1, functionName: '' }
    : top && toLocation(top);
  // An Error's own text already ends with its stack.
  const stack = details.exception && kindOf(details.exception) === 'error' ? undefined : stackOf(details.stackTrace);
  return {
    entry: { frameId, level: 'error', source, ...(time === undefined ? {} : { time }), ...(location ? { location } : {}), ...(stack ? { stack } : {}) },
    values: (entryId) => [{ kind: 'string', text: details.text }, ...(details.exception ? [value(entryId, details.exception)] : [])],
  };
}
