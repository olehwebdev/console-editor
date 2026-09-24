import type { Override, OverrideMeta } from '../../shared/types';

export function toMeta({ content: _content, ...meta }: Override): OverrideMeta {
  return meta;
}
