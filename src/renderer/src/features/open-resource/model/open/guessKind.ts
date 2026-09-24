import type { ResourceKind } from '@common/types';

/** Where a URL's path ends. */
const QUERY_OR_HASH = /[?#]/;

/** A path's kind by its extension, tried in order; anything else opens as a document. */
const KIND_BY_EXTENSION: ReadonlyArray<{ pattern: RegExp; kind: ResourceKind }> = [
  { pattern: /\.css$/i, kind: 'Stylesheet' },
  { pattern: /\.m?js$/i, kind: 'Script' },
];

export function guessKind(url: string): ResourceKind {
  const path = url.split(QUERY_OR_HASH)[0];
  return KIND_BY_EXTENSION.find(({ pattern }) => pattern.test(path))?.kind ?? 'Document';
}
