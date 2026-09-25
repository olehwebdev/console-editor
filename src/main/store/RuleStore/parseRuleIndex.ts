import { isRecord } from '../isRecord';

/** The entries of a rules.json, or null when it isn't JSON of the shape `{ rules: [...] }`. */
export function parseRuleIndex(text: string): unknown[] | null {
  try {
    const index: unknown = JSON.parse(text);
    return isRecord(index) && Array.isArray(index.rules) ? index.rules : null;
  } catch {
    return null;
  }
}
