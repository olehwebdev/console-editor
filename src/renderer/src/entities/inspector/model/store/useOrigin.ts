import type { CodeLocation } from '@common/types';
import { locationKey } from '../../lib/locationKey';
import type { OriginalPlace } from './types';
import { useInspectorStore } from './useInspectorStore';

/** The original of one code location, as it becomes known: a row that shows it re-renders for its own only. */
export function useOrigin(location: CodeLocation | null | undefined): OriginalPlace | null | undefined {
  return useInspectorStore((s) => (location ? s.origins[locationKey(location)] : undefined));
}
