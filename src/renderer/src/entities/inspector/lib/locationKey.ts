import type { CodeLocation } from '@common/types';

/** A code location as a key: its script and place. */
export function locationKey(location: CodeLocation): string {
  return `${location.url}#${location.line}:${location.column}`;
}
