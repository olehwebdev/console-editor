import type { BrowserCommand } from '../../types';
import { FIELD_CODE, LITERAL_PERCENT, URL_FIELD_CODES } from './constants';

const URL_CODES = new Set<string>(URL_FIELD_CODES);

/** A launcher's arguments without field codes, and where the address goes: where its first `%u` (or `%U`, `%f`, `%F`) was, else last. */
export function commandOf(args: string[]): BrowserCommand {
  const command: string[] = [];
  let urlAt = -1;
  for (const arg of args) {
    if (URL_CODES.has(arg)) {
      if (urlAt < 0) urlAt = command.length;
    } else if (!FIELD_CODE.test(arg)) {
      command.push(arg.replaceAll(LITERAL_PERCENT, '%'));
    }
  }
  return { command, urlAt: urlAt < 0 ? command.length : urlAt };
}
