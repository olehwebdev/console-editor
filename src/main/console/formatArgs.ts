import type { ConsoleValue } from '../../shared/types';
import { MAX_VALUE_TEXT } from './constants';
import { kindOf } from './kindOf';
import { truncate } from './truncate';
import type { RemoteObject } from './types';
import { valueText } from './valueText';

/** A format directive in a `console` call's first argument: `%s`, `%d`, `%c`… or `%%` for a percent sign. */
const DIRECTIVE = /%([sdifoOc%])/g;
/** The directive letter of an escaped percent sign. */
const ESCAPE = '%';

/** What each directive puts in its place (the next argument, in turn). `%c` takes CSS, which isn't shown. */
const SPECIFIERS: Readonly<Record<string, (arg: RemoteObject) => string>> = {
  s: valueText,
  d: (arg) => String(Math.trunc(Number(arg.value))),
  i: (arg) => String(Math.trunc(Number(arg.value))),
  f: (arg) => String(Number(arg.value)),
  o: valueText,
  O: valueText,
  c: () => '',
};

/**
 * A `console` call's arguments as values. A first argument with format
 * directives (`console.log('%s has %d items', name, n)`) is filled in with the
 * arguments it uses; the rest follow as values of their own.
 */
export function formatArgs(args: RemoteObject[], toValue: (arg: RemoteObject) => ConsoleValue): ConsoleValue[] {
  const [first, ...rest] = args;
  if (!first || kindOf(first) !== 'string' || !String(first.value).includes(ESCAPE)) return args.map(toValue);
  let used = 0;
  const text = String(first.value).replace(DIRECTIVE, (directive, letter: string) => {
    if (letter === ESCAPE) return ESCAPE;
    const arg = rest[used];
    if (!arg) return directive;
    used++;
    return SPECIFIERS[letter]!(arg);
  });
  return [{ kind: 'string', text: truncate(text, MAX_VALUE_TEXT) }, ...rest.slice(used).map(toValue)];
}
