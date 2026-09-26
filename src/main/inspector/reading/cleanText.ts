import { CONTROL_CHARACTERS, MAX_TEXT_LENGTH } from '../constants';

/** Text the page gave, safe to show as a label: a string, without control characters, and not too long. */
export function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(CONTROL_CHARACTERS, '').slice(0, MAX_TEXT_LENGTH) : '';
}
