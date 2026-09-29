import type { HeaderEntry } from '../transform';
import type { BidiHeader } from './types';

/** BiDi's headers as the engine's (a binary value is kept as the base64 BiDi gives). */
export function headerEntriesOf(headers: readonly BidiHeader[]): HeaderEntry[] {
  return headers.map(({ name, value }) => ({ name, value: value.value }));
}
