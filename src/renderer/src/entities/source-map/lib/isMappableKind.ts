import type { ResourceKind, SourceMapKind } from '@common/types';
import { MAPPABLE_KINDS } from './constants';

export function isMappableKind(kind: ResourceKind): kind is SourceMapKind {
  return MAPPABLE_KINDS[kind];
}
