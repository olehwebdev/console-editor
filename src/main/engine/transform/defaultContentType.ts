import type { ResourceKind } from '../../../shared/types';
import { HTML_MIME_TYPE } from '../constants';

/** A new kind fails typecheck until it has a type here. */
const DEFAULT_CONTENT_TYPES: Record<ResourceKind, string> = {
  Script: 'text/javascript',
  Stylesheet: 'text/css',
  Document: HTML_MIME_TYPE,
};

/** The type an override of `kind` is served as when upstream sent none. */
export function defaultContentType(kind: ResourceKind): string {
  return DEFAULT_CONTENT_TYPES[kind];
}
