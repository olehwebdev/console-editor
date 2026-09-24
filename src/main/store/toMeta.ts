import type { OverrideMeta } from '../../shared/types';
import type { StoredOverride } from './types';

export function toMeta({ content: _content, workspaceId: _workspaceId, ...meta }: StoredOverride): OverrideMeta {
  return meta;
}
