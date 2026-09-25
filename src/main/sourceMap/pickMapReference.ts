import type { SourceMapKind } from '../../shared/types';
import { MAP_REFERENCE_PRECEDENCE } from './constants';
import type { MapReference } from './types';

/** The reference a file's map is read from, when its header or comment names one. */
export function pickMapReference(kind: SourceMapKind, header: string | undefined, comment: string | null): MapReference | null {
  const named = { header, comment };
  const via = MAP_REFERENCE_PRECEDENCE[kind].find((way) => named[way]);
  return via ? { value: named[via]!, via } : null;
}
