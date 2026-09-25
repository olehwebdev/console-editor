import type { RenderCommit } from '@common/types';
import type { LogRowKind } from './types';

/** What a commit's row shows: its heading first, then its components, then how many more weren't listed. */
export function rowKind(commit: RenderCommit, offset: number): LogRowKind {
  if (!offset) return 'heading';
  return offset > commit.components.length ? 'more' : 'component';
}
