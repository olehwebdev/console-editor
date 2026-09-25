import type { ConsoleValueKind } from '../../shared/types';
import { KIND_BY_SUBTYPE, KIND_BY_TYPE } from './constants';
import type { RemoteObject } from './types';

export function kindOf(obj: Pick<RemoteObject, 'type' | 'subtype'>): ConsoleValueKind {
  if (obj.subtype && Object.hasOwn(KIND_BY_SUBTYPE, obj.subtype)) return KIND_BY_SUBTYPE[obj.subtype]!;
  // A type newer than this build shows as an object.
  return Object.hasOwn(KIND_BY_TYPE, obj.type) ? KIND_BY_TYPE[obj.type] : 'object';
}
