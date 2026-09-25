import { parseJson } from '@common/json';

/** Why a value as typed can't be written, or null: a value is typed as JSON, so it can change kind. */
export function jsonProblem(typed: string): string | null {
  try {
    parseJson(typed);
    return null;
  } catch {
    return 'Type JSON: "text", 42, true, null, [] or {}';
  }
}
