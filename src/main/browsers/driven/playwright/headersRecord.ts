import type { HeaderEntry } from '../../../engine/transform';
import { HEADER_JOIN } from './constants';

/** Headers as Playwright fulfils a response with them: one value per name, several of one name joined. */
export function headersRecord(headers: readonly HeaderEntry[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const { name, value } of headers) {
    const key = name.toLowerCase();
    const join = key === 'set-cookie' ? HEADER_JOIN['set-cookie'] : HEADER_JOIN.other;
    record[key] = key in record ? `${record[key]}${join}${value}` : value;
  }
  return record;
}
