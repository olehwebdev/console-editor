import { MATCH_TYPES, type MatchType } from '../types';

export function isMatchType(value: unknown): value is MatchType {
  return MATCH_TYPES.includes(value as MatchType);
}
