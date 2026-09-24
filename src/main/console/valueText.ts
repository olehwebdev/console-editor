import type { ConsoleValueKind } from '../../shared/types';
import { MAX_VALUE_TEXT } from './constants';
import { kindOf } from './kindOf';
import { previewText } from './previewText';
import { truncate } from './truncate';
import type { RemoteObject } from './types';

/** Characters kept of a function's first line (its source can run to thousands). */
const MAX_FUNCTION_TEXT = 120;

/** How each kind of value reads in a row. */
const TEXT_BY_KIND: Readonly<Record<ConsoleValueKind, (obj: RemoteObject) => string>> = {
  string: (obj) => String(obj.value),
  number: (obj) => obj.unserializableValue ?? obj.description ?? String(obj.value),
  boolean: (obj) => String(obj.value),
  nullish: (obj) => obj.description ?? String(obj.subtype ?? obj.type),
  symbol: (obj) => obj.description ?? obj.type,
  function: (obj) => truncate((obj.description ?? obj.type).split('\n', 1)[0]!, MAX_FUNCTION_TEXT),
  object: (obj) => (obj.preview ? previewText(obj.preview) : (obj.description ?? obj.className ?? obj.type)),
  // With its stack: the message alone rarely says where it came from.
  error: (obj) => obj.description ?? obj.className ?? obj.type,
};

/** A remote value as one row shows it. */
export function valueText(obj: RemoteObject): string {
  return truncate(TEXT_BY_KIND[kindOf(obj)](obj), MAX_VALUE_TEXT);
}
