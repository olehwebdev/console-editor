import { CONTROL_CHARACTERS } from './constants';

/** A source name as shown: a page chooses these, so control characters are dropped. */
export function cleanLabel(text: string): string {
  return text.replace(CONTROL_CHARACTERS, '');
}
